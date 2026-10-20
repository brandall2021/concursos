'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { CARGOS } from '@/lib/concurso-status'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/admin/login')
}

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

function parsear(formData: FormData): DatosConcurso | { error: string } {
  const numeroExpediente = (formData.get('numeroExpediente') as string)?.trim()
  const cargo = (formData.get('cargo') as string)?.trim()
  const dedicacion = (formData.get('dedicacion') as string)?.trim()
  const disciplina = (formData.get('disciplina') as string)?.trim()
  const area = (formData.get('area') as string)?.trim() || null
  const catedra = (formData.get('catedra') as string)?.trim() || null
  const asignatura = (formData.get('asignatura') as string)?.trim()
  const fechaApertura = new Date(formData.get('fechaApertura') as string)
  const fechaCierre = new Date(formData.get('fechaCierre') as string)

  if (!numeroExpediente || !cargo || !dedicacion || !disciplina || !asignatura) {
    return { error: 'Completá los campos obligatorios del llamado' }
  }

  if (!CARGOS.includes(cargo as (typeof CARGOS)[number])) {
    return { error: 'El cargo debe ser Titular, Asociado o Adjunto' }
  }

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
  await prisma.concurso.delete({ where: { id } })
  revalidatePath('/admin/concursos')
}
