import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'
import { Suspense } from 'react'
import Link from 'next/link'
import { buttonClassName } from '@/components/ui/Button'
import { ConcursoStatusBadge } from '@/components/ConcursoStatusBadge'
import { DeleteConcursoButton } from '@/components/DeleteConcursoButton'
import { ConcursoFilters } from '@/components/ConcursoFilters'
import { CARGO_LABELS, CARGOS } from '@/lib/concurso-status'
import { Prisma } from '@prisma/client'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function primer(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? ''
}

const SQL_UNACCENT =
  "translate(lower(coalesce(p.apellidos, '') || ' ' || coalesce(p.nombres, '') || ' ' || coalesce(p.dni, '')), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc')"

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

async function buscarConcursosPorInscripto(texto: string): Promise<string[]> {
  const termino = normalizar(texto)
  if (!termino) return []
  const palabras = termino.split(/\s+/).filter(Boolean)
  const condiciones = palabras.map(
    (palabra) => Prisma.sql`${Prisma.raw(SQL_UNACCENT)} LIKE ${'%' + palabra + '%'}`
  )
  const filas = await prisma.$queryRaw<{ concursoId: string }[]>`
    SELECT DISTINCT p."concursoId" AS "concursoId"
    FROM "Postulante" p
    WHERE ${Prisma.join(condiciones, ' AND ')}
  `
  return filas.map((f) => f.concursoId)
}

export default async function AdminConcursosPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireAdmin()
  const sp = await searchParams
  const q = primer(sp.q)
  const catedra = primer(sp.catedra)
  const cargo = primer(sp.cargo)
  const estado = primer(sp.estado)
  const inscripto = primer(sp.inscripto)
  const inscriptos = primer(sp.inscriptos)

  const now = new Date()
  const where: Prisma.ConcursoWhereInput = {}
  const and: Prisma.ConcursoWhereInput[] = []

  if (q) and.push({ numeroExpediente: { contains: q, mode: 'insensitive' } })
  if (catedra) and.push({ catedra: { contains: catedra, mode: 'insensitive' } })
  if (cargo && CARGOS.includes(cargo as (typeof CARGOS)[number])) and.push({ cargo })

  if (estado === 'activo') {
    and.push({ fechaApertura: { lte: now } }, { fechaCierre: { gte: now } })
  } else if (estado === 'proximo') {
    and.push({ fechaApertura: { gt: now } })
  } else if (estado === 'cerrado') {
    and.push({ fechaCierre: { lt: now } })
  }

  if (inscripto) {
    const ids = await buscarConcursosPorInscripto(inscripto)
    and.push({ id: { in: ids } })
  }

  if (inscriptos === 'con') and.push({ postulantes: { some: {} } })
  if (inscriptos === 'sin') and.push({ postulantes: { none: {} } })

  if (and.length) where.AND = and

  const concursos = await prisma.concurso.findMany({
    where,
    include: { _count: { select: { postulantes: true } } },
    orderBy: { fechaApertura: 'desc' },
  })

  const hayFiltros =
    q || catedra || cargo || estado || inscripto || inscriptos

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-face-red">Gestión de concursos</p>
          <h1 className="mt-1 text-2xl font-bold text-face-blue">Llamados a concurso</h1>
          <p className="mt-1 text-sm text-gray-500">Administrá aperturas, cierres y postulantes.</p>
        </div>
        <Link href="/admin/concursos/nueva" className={buttonClassName()}>
          Nuevo llamado
        </Link>
      </header>

      <Suspense
        fallback={<div className="h-28 rounded-md border border-gray-200 bg-white shadow-sm" aria-hidden />}
      >
        <ConcursoFilters cargos={[...CARGOS]} />
      </Suspense>

      {hayFiltros && (
        <p className="text-sm text-gray-500">
          {concursos.length} resultado{concursos.length !== 1 ? 's' : ''}
        </p>
      )}

      {concursos.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-gray-900">
            {hayFiltros ? 'No hay concursos que coincidan con la búsqueda' : 'No hay concursos creados'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {hayFiltros
              ? 'Probá ajustar o limpiar los filtros.'
              : 'Creá el primer llamado para abrir inscripciones.'}
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1fr_150px_170px_260px] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:grid">
            <span>Concurso</span>
            <span>Estado</span>
            <span>Postulantes</span>
            <span className="text-right">Acciones</span>
          </div>
          <div className="divide-y divide-gray-100">
            {concursos.map((concurso) => (
              <article
                key={concurso.id}
                className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_150px_170px_260px] lg:items-center"
              >
                <div className="min-w-0">
                  <h2 className="font-semibold text-face-blue">
                    Expte. {concurso.numeroExpediente} — {CARGO_LABELS[concurso.cargo] ?? concurso.cargo} (
                    {concurso.dedicacion})
                  </h2>
                  <p className="mt-1 truncate text-sm text-gray-500">
                    {[concurso.disciplina, concurso.area, concurso.catedra, concurso.asignatura]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {concurso.fechaApertura.toLocaleString('es-AR')} a {concurso.fechaCierre.toLocaleString('es-AR')}
                  </p>
                </div>
                <div>
                  <ConcursoStatusBadge fechaApertura={concurso.fechaApertura} fechaCierre={concurso.fechaCierre} />
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {concurso._count.postulantes} postulante{concurso._count.postulantes !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                  <Link href={`/admin/concursos/${concurso.id}/postulantes`} className={buttonClassName('secondary')}>
                    Postulantes
                  </Link>
                  <Link href={`/admin/concursos/${concurso.id}/editar`} className={buttonClassName('secondary')}>
                    Editar
                  </Link>
                  <DeleteConcursoButton
                    id={concurso.id}
                    nombre={`Expte. ${concurso.numeroExpediente}`}
                    postulantesCount={concurso._count.postulantes}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
