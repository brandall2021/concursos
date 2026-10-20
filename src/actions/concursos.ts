'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { CARGOS } from '@/lib/concurso-status'
import { CAMPOS_DOCUMENTO, limpiarArchivos, eliminarCarpetaPostulante, type CampoDocumento } from '@/lib/uploads'

export type ConcursoActionResult = { error: string } | void

interface DatosConcurso {
  numeroExpediente: string
  cargo: string
  dedicacion: string
  disciplina: string
  area: string | null
  catedra: string | null
  asignatura: string
  fechaApertura: Date
  fechaCierre: Date
}

const LARGOS: Record<keyof Omit<DatosConcurso, 'fechaApertura' | 'fechaCierre'>, number> = {
  numeroExpediente: 80,
  cargo: 20,
  dedicacion: 60,
  disciplina: 120,
  area: 120,
  catedra: 120,
  asignatura: 200,
}

function texto(formData: FormData, campo: string, max: number): string | null {
  const valor = String(formData.get(campo) ?? '').trim()
  return valor.length > max ? null : valor
}

function parsear(formData: FormData): DatosConcurso | { error: string } {
  const numeroExpediente = texto(formData, 'numeroExpediente', LARGOS.numeroExpediente)
  const cargo = texto(formData, 'cargo', LARGOS.cargo)
  const dedicacion = texto(formData, 'dedicacion', LARGOS.dedicacion)
  const disciplina = texto(formData, 'disciplina', LARGOS.disciplina)
  const area = texto(formData, 'area', LARGOS.area) || null
  const catedra = texto(formData, 'catedra', LARGOS.catedra) || null
  const asignatura = texto(formData, 'asignatura', LARGOS.asignatura)

  if (
    numeroExpediente === null || cargo === null || dedicacion === null ||
    disciplina === null || area === null || catedra === null || asignatura === null
  ) {
    return { error: 'Algun campo supera el largo máximo permitido' }
  }

  if (!numeroExpediente || !cargo || !dedicacion || !disciplina || !asignatura) {
    return { error: 'Completá los campos obligatorios del llamado' }
  }

  if (!CARGOS.includes(cargo as (typeof CARGOS)[number])) {
    return { error: 'El cargo debe ser Titular, Asociado o Adjunto' }
  }

  const fechaApertura = new Date(String(formData.get('fechaApertura')))
  const fechaCierre = new Date(String(formData.get('fechaCierre')))

  if (Number.isNaN(fechaApertura.getTime()) || Number.isNaN(fechaCierre.getTime())) {
    return { error: 'Las fechas de apertura y cierre son obligatorias' }
  }

  if (fechaCierre <= fechaApertura) {
    return { error: 'La fecha de cierre debe ser posterior a la apertura' }
  }

  return { numeroExpediente, cargo, dedicacion, disciplina, area, catedra, asignatura, fechaApertura, fechaCierre }
}

export async function createConcurso(formData: FormData): Promise<ConcursoActionResult> {
  await requireAdmin()
  const datos = parsear(formData)
  if ('error' in datos) return datos

  await prisma.concurso.create({ data: datos })
  revalidatePath('/admin/concursos')
  redirect('/admin/concursos')
}

export async function updateConcurso(id: string, formData: FormData): Promise<ConcursoActionResult> {
  await requireAdmin()
  const datos = parsear(formData)
  if ('error' in datos) return datos

  await prisma.concurso.update({ where: { id }, data: datos })
  revalidatePath('/admin/concursos')
  redirect('/admin/concursos')
}

export async function deleteConcurso(id: string): Promise<ConcursoActionResult> {
  await requireAdmin()

  const concurso = await prisma.concurso.findUnique({
    where: { id },
    select: { postulantes: { select: { id: true, solicitudPath: true, dniPath: true, cvPath: true, antecedentesPath: true } } },
  })
  if (!concurso) return

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
