'use server'

import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { isConcursoActivo, CARGO_LABELS } from '@/lib/concurso-status'
import { revalidatePath } from 'next/cache'
import { generarComprobantePdf } from '@/lib/comprobante'
import { enviarComprobantePorEmail, smtpConfigurado } from '@/lib/email'
import { urlComprobante } from '@/lib/comprobante-firma'
import { excedido, ipCliente } from '@/lib/rate-limit'
import { esColisionDeCodigo, generarCodigoInscripcion } from '@/lib/codigo-inscripcion'
import {
  CAMPOS_DOCUMENTO,
  guardarArchivos,
  rutasEsperadas,
  eliminarCarpetaPostulante,
  validarPdf,
  type CampoDocumento,
} from '@/lib/uploads'

export type PostulanteResult =
  | { success: true; postulanteId: string }
  | { success: false; error: string }

const LARGO_MAX_NOMBRE = 120
const RECHAZO_GENERICO =
  'No pudimos registrar tu inscripción. Revisá los datos y volvé a intentar; si el problema persiste, contactá a la Secretaría de Asuntos Docentes de la FACE.'

export async function inscribirPostulante(formData: FormData): Promise<PostulanteResult> {
  const concursoId = String(formData.get('concursoId') ?? '').trim()
  const apellidos = String(formData.get('apellidos') ?? '').trim()
  const nombres = String(formData.get('nombres') ?? '').trim()
  const dni = String(formData.get('dni') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const declaracion = formData.get('declaracion')

  if (!concursoId || !apellidos || !nombres || !dni || !email) {
    return { success: false, error: 'Todos los campos de identificación son obligatorios' }
  }

  if (apellidos.length > LARGO_MAX_NOMBRE || nombres.length > LARGO_MAX_NOMBRE) {
    return { success: false, error: `Apellidos y nombres no pueden superar ${LARGO_MAX_NOMBRE} caracteres` }
  }

  if (email.length > 254) {
    return { success: false, error: 'Ingresá un correo electrónico válido' }
  }

  if (!/^\d{7,8}$/.test(dni)) {
    return { success: false, error: 'El DNI debe tener 7 u 8 dígitos numéricos' }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Ingresá un correo electrónico válido' }
  }

  if (!declaracion) {
    return { success: false, error: 'Debés aceptar las declaraciones juradas para continuar' }
  }

  const cabeceras = await headers()
  if (excedido(`inscripcion:${ipCliente(cabeceras)}`)) {
    return { success: false, error: 'Demasiados intentos seguidos. Esperá unos minutos y volvé a intentar.' }
  }

  const concurso = await prisma.concurso.findUnique({ where: { id: concursoId } })
  if (!concurso) {
    return { success: false, error: 'Concurso no encontrado' }
  }

  if (!isConcursoActivo(concurso)) {
    return { success: false, error: 'La inscripción para este concurso no está disponible' }
  }

  const duplicado = await prisma.postulante.findUnique({
    where: { dni_concursoId: { dni, concursoId } },
  })
  if (duplicado) {
    // No confirmamos el motivo: "¿el DNI X ya se inscribió?" es dato sensible del concurso.
    console.warn(`[inscripcion] DNI ${dni} duplicado en concurso ${concursoId}`)
    return { success: false, error: RECHAZO_GENERICO }
  }

  const archivos = {} as Record<CampoDocumento, File>
  for (const campo of CAMPOS_DOCUMENTO) {
    const resultado = await validarPdf(formData.get(campo), campo)
    if (!resultado.ok) return { success: false, error: resultado.error }
    archivos[campo] = resultado.file
  }

  const postulanteId = crypto.randomUUID()
  const paths = rutasEsperadas(postulanteId)

  // Con 23 letras y 5 posiciones hay ~6.4M de codigos: colisionar es raro, pero el indice
  // unico es la unica garantia, asi que reintentamos con otro codigo en vez de fallar.
  let postulante
  for (let intento = 1; intento <= 5; intento++) {
    try {
      postulante = await prisma.postulante.create({
        data: {
          id: postulanteId,
          concursoId,
          codigoInscripcion: generarCodigoInscripcion(),
          apellidos,
          nombres,
          dni,
          email,
          solicitudPath: paths.solicitud,
          dniPath: paths.dniArchivo,
          cvPath: paths.cv,
          antecedentesPath: paths.antecedentes,
        },
        include: { concurso: true },
      })
      break
    } catch (e: unknown) {
      if (esColisionDeCodigo(e)) {
        console.warn(`[inscripcion] Codigo en uso, reintento ${intento} para ${postulanteId}`)
        continue
      }
      if ((e as { code?: string }).code === 'P2002') {
        // Otra carrera por el dni+concurso: el motivo real queda en el log, no en la pantalla.
        console.warn(`[inscripcion] DNI ${dni} duplicado en concurso ${concursoId} (carrera)`)
        return { success: false, error: RECHAZO_GENERICO }
      }
      console.error('[inscripcion] Error creando postulante:', e)
      return { success: false, error: 'Error interno. Intentá nuevamente.' }
    }
  }

  if (!postulante) {
    console.error('[inscripcion] Agotados los reintentos de codigo de inscripcion')
    return { success: false, error: 'Error interno. Intentá nuevamente.' }
  }

  // Si la escritura falla se revierte la fila: una fila sin archivos es auditable,
  // un archivo sin fila es basura invisible en el disco.
  try {
    await guardarArchivos(postulanteId, archivos)
  } catch (e) {
    console.error(`[inscripcion] No se pudieron guardar los archivos de ${postulanteId}:`, e)
    await prisma.postulante.delete({ where: { id: postulanteId } }).catch(() => {})
    await eliminarCarpetaPostulante(postulanteId).catch(() => {})
    return { success: false, error: 'Error interno. Intentá nuevamente.' }
  }

  await enviarComprobante(postulante.id)

  revalidatePath(`/admin/concursos/${concursoId}/postulantes`)
  return { success: true, postulanteId: postulante.id }
}

async function enviarComprobante(postulanteId: string): Promise<void> {
  if (!smtpConfigurado()) return

  const postulante = await prisma.postulante.findUnique({
    where: { id: postulanteId },
    include: { concurso: true },
  })
  if (!postulante) return

  const baseUrl = process.env.AUTH_URL
  try {
    const pdf = await generarComprobantePdf(postulante, { baseUrl })
    const cargo = CARGO_LABELS[postulante.concurso.cargo] ?? postulante.concurso.cargo
    await enviarComprobantePorEmail({
      to: postulante.email,
      nombrePostulante: `${postulante.apellidos}, ${postulante.nombres}`,
      numeroExpediente: postulante.concurso.numeroExpediente,
      cargo,
      pdf,
      nombreArchivo: `comprobante-${postulante.dni}.pdf`,
      comprobanteUrl: baseUrl ? urlComprobante(postulante.id, baseUrl) : undefined,
    })
  } catch (e) {
    console.error('[email] No se pudo enviar el comprobante:', e)
  }
}
