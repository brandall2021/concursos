'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { CARGOS } from '@/lib/concurso-status'
import { borrarPdf, CAMPOS_DOCUMENTO, limpiarArchivos, eliminarCarpetaPostulante, guardarPdf, type CampoDocumento } from '@/lib/uploads'
import { rutaResolucionRelativa, validarResolucionPdf } from '@/lib/resoluciones'
import { parsearFechaHoraArg } from '@/lib/fecha'

export type ConcursoActionResult = { error: string } | void

interface DatosConcurso {
  numeroExpediente: string
  cargo: string
  dedicacion: string
  disciplina: string | null
  area: string | null
  catedra: string | null
  asignatura: string | null
  fechaApertura: Date
  fechaCierre: Date
}

type CampoOpcional = 'disciplina' | 'area' | 'catedra' | 'asignatura'

const LARGOS: Record<keyof Omit<DatosConcurso, 'fechaApertura' | 'fechaCierre'>, number> = {
  numeroExpediente: 80,
  cargo: 20,
  dedicacion: 60,
  disciplina: 120,
  area: 120,
  catedra: 120,
  asignatura: 200,
}

// null = el valor supera el largo máximo; '' = campo vacío o ausente.
function texto(formData: FormData, campo: string, max: number): string | null {
  const valor = String(formData.get(campo) ?? '').trim()
  return valor.length > max ? null : valor
}

function parsear(formData: FormData): DatosConcurso | { error: string } {
  const demasiadoLargo = { error: 'Algun campo supera el largo máximo permitido' }

  const numeroExpediente = texto(formData, 'numeroExpediente', LARGOS.numeroExpediente)
  const cargo = texto(formData, 'cargo', LARGOS.cargo)
  const dedicacion = texto(formData, 'dedicacion', LARGOS.dedicacion)

  if (numeroExpediente === null || cargo === null || dedicacion === null) return demasiadoLargo

  if (!numeroExpediente || !cargo || !dedicacion) {
    return { error: 'Completá los campos obligatorios del llamado' }
  }

  // Disciplina, área, cátedra y asignatura son opcionales: un llamado se identifica por expediente,
  // cargo y dedicación, y no siempre la convocatoria detalle los cuatro.
  const opcionales = {} as Record<CampoOpcional, string | null>
  for (const campo of ['disciplina', 'area', 'catedra', 'asignatura'] as CampoOpcional[]) {
    const valor = texto(formData, campo, LARGOS[campo])
    if (valor === null) return demasiadoLargo
    opcionales[campo] = valor || null
  }

  if (!CARGOS.includes(cargo as (typeof CARGOS)[number])) {
    return { error: 'El cargo debe ser Titular, Asociado o Adjunto' }
  }

  const fechaApertura = parsearFechaHoraArg(String(formData.get('fechaApertura')))
  const fechaCierre = parsearFechaHoraArg(String(formData.get('fechaCierre')))

  if (!fechaApertura || !fechaCierre) {
    return { error: 'Completá la fecha y hora de apertura y de cierre' }
  }

  if (fechaCierre <= fechaApertura) {
    return { error: 'La fecha de cierre debe ser posterior a la apertura' }
  }

  return {
    numeroExpediente,
    cargo,
    dedicacion,
    disciplina: opcionales.disciplina,
    area: opcionales.area,
    catedra: opcionales.catedra,
    asignatura: opcionales.asignatura,
    fechaApertura,
    fechaCierre,
  }
}

// Escribe la versión nueva, registra la ruta y recién después borra la anterior: en el orden inverso
// quedaría un enlace público roto durante la ventana entre las dos operaciones.
async function reemplazarResolucion(
  concursoId: string,
  archivo: File,
  nombre: string,
  rutaAnterior: string | null
): Promise<string | null> {
  const nuevaRuta = rutaResolucionRelativa(concursoId)

  try {
    await guardarPdf(nuevaRuta, archivo)
  } catch (error) {
    console.error(`[resolucion] No se pudo escribir "${nuevaRuta}" del concurso ${concursoId}:`, error)
    return 'No se pudo guardar la Resolución en el servidor. Revisá el volumen de UPLOAD_DIR.'
  }

  try {
    await prisma.concurso.update({
      where: { id: concursoId },
      data: { resolucionPath: nuevaRuta, resolucionNombre: nombre },
    })
  } catch (error) {
    await borrarPdf(nuevaRuta)
    console.error(`[resolucion] Update fallido para el concurso ${concursoId}:`, error)
    return 'No se pudo registrar la Resolución. Intentá de nuevo.'
  }

  if (rutaAnterior && rutaAnterior !== nuevaRuta) await borrarPdf(rutaAnterior)
  return null
}

export async function createConcurso(formData: FormData): Promise<ConcursoActionResult> {
  await requireAdmin()
  const datos = parsear(formData)
  if ('error' in datos) return datos

  const resolucion = await validarResolucionPdf(formData.get('resolucion'))
  if (!resolucion.ok) return { error: resolucion.error }

  const concurso = await prisma.concurso.create({
    data: datos,
    select: { id: true, numeroExpediente: true },
  })

  if (resolucion.file) {
    const error = await reemplazarResolucion(concurso.id, resolucion.file, resolucion.nombre, null)
    if (error) {
      // Un llamado sin su resolución cargada queda incompleto para la publicación: se descarta.
      await prisma.concurso.delete({ where: { id: concurso.id } })
      return { error }
    }
  }

  revalidatePath('/admin/concursos')
  revalidatePath('/')
  redirect('/admin/concursos')
}

export async function updateConcurso(id: string, formData: FormData): Promise<ConcursoActionResult> {
  await requireAdmin()
  const datos = parsear(formData)
  if ('error' in datos) return datos

  const concurso = await prisma.concurso.findUnique({
    where: { id },
    select: { id: true, resolucionPath: true },
  })
  if (!concurso) return { error: 'El concurso no existe' }

  const resolucion = await validarResolucionPdf(formData.get('resolucion'))
  if (!resolucion.ok) return { error: resolucion.error }

  await prisma.concurso.update({ where: { id }, data: datos })

  if (resolucion.file) {
    const error = await reemplazarResolucion(id, resolucion.file, resolucion.nombre, concurso.resolucionPath)
    if (error) return { error }
  } else if (formData.get('quitarResolucion') === 'on' && concurso.resolucionPath) {
    // Primero se desregistra la ruta y después se borra el archivo: al revés, un update fallado
    // dejaría el enlace público apuntando a un PDF que ya no está en disco.
    await prisma.concurso.update({ where: { id }, data: { resolucionPath: null, resolucionNombre: null } })
    await borrarPdf(concurso.resolucionPath)
  }

  revalidatePath('/admin/concursos')
  revalidatePath('/')
  redirect('/admin/concursos')
}

export async function deleteConcurso(id: string): Promise<ConcursoActionResult> {
  await requireAdmin()

  const concurso = await prisma.concurso.findUnique({
    where: { id },
    select: {
      resolucionPath: true,
      resultadoPath: true,
      postulantes: { select: { id: true, solicitudPath: true, dniPath: true, cvPath: true, antecedentesPath: true } },
    },
  })
  if (!concurso) return

  // El resultado publicado se sirve desde /api/concursos/[id]/resultado; al borrar el llamado la fila
  // y el PDF tienen que irse juntos, si no queda un documento huérfano en el volumen.
  if (concurso.resultadoPath) await borrarPdf(concurso.resultadoPath)
  if (concurso.resolucionPath) await borrarPdf(concurso.resolucionPath)

  // La cascada de Postulante borra las filas, pero los PDFs con DNI y CV siguen en disco.
  for (const postulante of concurso.postulantes) {
    const paths: Partial<Record<CampoDocumento, string>> = {
      solicitud: postulante.solicitudPath,
      dniArchivo: postulante.dniPath,
      cv: postulante.cvPath,
      antecedentes: postulante.antecedentesPath,
    }
    await limpiarArchivos(paths)
    await eliminarCarpetaPostulante(postulante.id)
  }

  await prisma.concurso.delete({ where: { id } })
  revalidatePath('/admin/concursos')
}
