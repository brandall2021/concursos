import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { buttonClassName } from '@/components/ui/Button'
import { ConcursoStatusBadge } from '@/components/ConcursoStatusBadge'
import { Footer } from '@/components/Footer'
import { InstitutionalBrand } from '@/components/InstitutionalBrand'
import { CARGO_LABELS } from '@/lib/concurso-status'

export const dynamic = 'force-dynamic'

// El listado de resultados publicados se corta en 50: es un histórico que crece una fila por llamado
// cerrado, y la página principal no tiene sentido que muestre años de resoluciones seguidas.
const MAX_RESULTADOS_PUBLICADOS = 50

export default async function HomePage() {
  const now = new Date()
  const [concursos, resultados] = await Promise.all([
    prisma.concurso.findMany({
      where: {
        fechaApertura: { lte: now },
        fechaCierre: { gte: now },
      },
      orderBy: { fechaCierre: 'asc' },
    }),
    prisma.concurso.findMany({
      where: { resultadoPublicadoEn: { not: null } },
      orderBy: { resultadoPublicadoEn: 'desc' },
      take: MAX_RESULTADOS_PUBLICADOS,
      select: {
        id: true,
        numeroExpediente: true,
        cargo: true,
        dedicacion: true,
        disciplina: true,
        asignatura: true,
        resultadoNombre: true,
        resultadoPublicadoEn: true,
      },
    }),
  ])

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 text-gray-900">
      <section className="bg-face-blue">
        <div className="h-2 bg-face-red" />
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <InstitutionalBrand />
          <Link href="/admin/login" className="text-sm font-semibold text-white/90 hover:text-face-gold">
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
        <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:items-start">
          <aside className="lg:sticky lg:top-6">
            <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-face-red">Normativa</p>
              <h2 className="mt-1 text-sm font-bold text-face-blue">Reglamento General de Concursos Docentes</h2>
              <p className="mt-1 text-xs text-gray-500">Resolución N°: RES - DGAC - 10801 / 2026</p>
              <a
                href="https://www.fbqf.unt.edu.ar/pdf/RESOLUCIONES/RESOL.%20UNT/UNT%20RES%20-%20DGAC%20-%2010801%20-%202026%20HCS%20APRUEBA%20EL%20REGLAMENTO%20GENERAL%20DE%20CONCURSOS%20DOCENTES%20PARA%20LAS%20CATEGORIAS%20PROF.%20TITULARES,%20ASOCIADOS%20Y%20ADJUNTOS%20DE%20LA%20UNT.%20DEROGA%20RES..pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex text-sm font-semibold text-face-red hover:underline"
              >
                Ver Reglamento →
              </a>
              <p className="mt-2 text-xs text-gray-500">Se abre en una nueva pestaña.</p>
            </div>
          </aside>

          <div className="min-w-0">
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
          </div>
        </div>
      </section>

      {resultados.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-face-blue">Concursos cerrados con resultado publicado</h2>
            <p className="text-sm text-gray-500">
              Resoluciones, dictámenes y órdenes de mérito cargados por el Departamento Concursos.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {resultados.map((concurso) => (
              <article
                key={concurso.id}
                className="rounded-md border border-gray-200 bg-white p-4 shadow-sm transition hover:border-red-200 hover:shadow-md"
              >
                <h3 className="text-sm font-bold text-gray-950">
                  Expte. {concurso.numeroExpediente} — {CARGO_LABELS[concurso.cargo] ?? concurso.cargo} (
                  {concurso.dedicacion})
                </h3>
                <p className="mt-1 truncate text-xs text-gray-500">
                  {[concurso.disciplina, concurso.asignatura].filter(Boolean).join(' · ')}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">
                    {concurso.resultadoNombre ?? 'Documento del concurso'}
                    {' · publicado el '}
                    {concurso.resultadoPublicadoEn?.toLocaleDateString('es-AR', {
                      timeZone: 'America/Argentina/Buenos_Aires',
                    })}
                  </span>
                  <a
                    href={`/api/concursos/${concurso.id}/resultado`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClassName('secondary', 'px-3 py-1.5 text-xs')}
                  >
                    Ver PDF →
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <Footer />
    </main>
  )
}
