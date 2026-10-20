import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { buttonClassName } from '@/components/ui/Button'
import { ConcursoStatusBadge } from '@/components/ConcursoStatusBadge'
import { InstitutionalBrand } from '@/components/InstitutionalBrand'
import { CARGO_LABELS } from '@/lib/concurso-status'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const now = new Date()
  const concursos = await prisma.concurso.findMany({
    where: {
      fechaApertura: { lte: now },
      fechaCierre: { gte: now },
    },
    orderBy: { fechaCierre: 'asc' },
  })

  return (
    <main className="min-h-screen bg-slate-50 text-gray-900">
      <section className="border-b border-gray-200 bg-white">
        <div className="h-2 bg-face-red" />
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <InstitutionalBrand />
          <Link href="/admin/login" className="text-sm font-semibold text-face-blue hover:text-face-red">
            Acceso administrativo
          </Link>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_260px] lg:items-end lg:py-12">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-face-red">
              Facultad de Ciencias Económicas - UNT
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal text-face-blue sm:text-4xl">
              Formulario Único de Inscripción Digital a Concursos de Docentes
            </h1>
            <p className="mt-3 text-base leading-7 text-gray-600">
              Inscripción a concursos docentes para las categorías de Profesores Titulares, Asociados y Adjuntos,
              conforme al Reglamento General de Concursos Docentes vigente (Resolución N°: RES - DGAC - 10801 / 2026).
            </p>
          </div>
          <div className="rounded-md border border-gray-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Llamados abiertos</p>
            <p className="mt-1 text-4xl font-bold text-face-red">{concursos.length}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-face-blue">Concursos con inscripción abierta</h2>
            <p className="text-sm text-gray-500">Ordenados por fecha de cierre.</p>
          </div>
        </div>

        {concursos.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <h3 className="text-base font-semibold text-gray-900">No hay inscripciones abiertas</h3>
            <p className="mt-1 text-sm text-gray-500">Volvé a consultar más tarde.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {concursos.map((concurso) => (
              <article
                key={concurso.id}
                className="rounded-md border border-gray-200 bg-white p-5 shadow-sm transition hover:border-red-200 hover:shadow-md"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <ConcursoStatusBadge fechaApertura={concurso.fechaApertura} fechaCierre={concurso.fechaCierre} />
                      <span className="text-xs font-medium text-gray-500">
                        Cierra{' '}
                        {concurso.fechaCierre.toLocaleString('es-AR', {
                          timeZone: 'America/Argentina/Buenos_Aires',
                        })}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-950">
                      Expte. {concurso.numeroExpediente} — {CARGO_LABELS[concurso.cargo] ?? concurso.cargo} (
                      {concurso.dedicacion})
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      {[
                        concurso.disciplina,
                        concurso.area ? `Área ${concurso.area}` : null,
                        concurso.catedra ? `Cátedra ${concurso.catedra}` : null,
                        concurso.asignatura,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <Link
                    href={`/inscripcion/${concurso.id}`}
                    className={buttonClassName('primary', 'w-full shrink-0 sm:w-auto')}
                  >
                    Postularme
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
