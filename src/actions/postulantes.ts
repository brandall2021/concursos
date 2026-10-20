'use server'

import { prisma } from '@/lib/prisma'
import { isConcursoActivo, CARGO_LABELS } from '@/lib/concurso-status'
import { revalidatePath } from 'next/cache'
import { generarComprobantePdf } from '@/lib/comprobante'
import { enviarComprobantePorEmail, smtpConfigurado } from '@/lib/email'
import {
  CAMPOS_DOCUMENTO,
  guardarArchivos,
  limpiarArchivos,
  validarPdf,
  type CampoDocumento,
} from '@/lib/uploads'

export type PostulanteResult =
  | { success: true; postulanteId: string }
  | { success: false; error: string }

export async function inscribirPostulante(formData: FormData): Promise<PostulanteResult> {
  const concursoId = (formData.get('concursoId') as string)?.trim()
  const apellidos = (formData.get('apellidos') as string)?.trim()
  const nombres = (formData.get('nombres') as string)?.trim()
  const dni = (formData.get('dni') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const declaracion = formData.get('declaracion')

  if (!concursoId || !apellidos || !nombres || !dni || !email) {
    return { success: false, error: 'Todos los campos de identificación son obligatorios' }
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

  const archivos = {} as Record<CampoDocumento, File>
  for (const campo of CAMPOS_DOCUMENTO) {
    const resultado = validarPdf(formData.get(campo), campo)
    if (!resultado.ok) return { success: false, error: resultado.error }
    archivos[campo] = resultado.file
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
    return { success: false, error: 'Ya registramos una inscripción tuya en este concurso con ese DNI' }
  }

  const postulanteId = crypto.randomUUID()
  const paths = await guardarArchivos(postulanteId, archivos)

  try {
    const postulante = await prisma.postulante.create({
      data: {
        id: postulanteId,
        concursoId,
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

    await enviarComprobante(postulante.id)

    revalidatePath(`/admin/concursos/${concursoId}/postulantes`)
    return { success: true, postulanteId: postulante.id }
  } catch (e: unknown) {
    await limpiarArchivos(paths)
    const err = e as { code?: string }
    if (err.code === 'P2002') {
      return { success: false, error: 'Ya registramos una inscripción tuya en este concurso con ese DNI' }
    }
    return { success: false, error: 'Error interno. Intentá nuevamente.' }
  }
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
      comprobanteUrl: baseUrl
        ? `${baseUrl.replace(/\/$/, '')}/api/comprobante/${postulante.id}`
        : undefined,
    })
  } catch (e) {
    console.error('[email] No se pudo enviar el comprobante:', e)
  }
}
