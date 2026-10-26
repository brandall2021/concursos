import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { isConcursoActivo, etiquetaConcurso, CARGO_LABELS } from '@/lib/concurso-status'
import { PostulanteForm } from '@/components/PostulanteForm'
import { Footer } from '@/components/Footer'
import { InstitutionalBrand } from '@/components/InstitutionalBrand'
import { ConcursoSelect } from '@/components/ConcursoSelect'
import { fechaHoraArg } from '@/lib/fecha'
import Link from 'next/link'

export default async function InscripcionPage({ params }: { params: Promise<{ concursoId: string }> }) {
  const { concursoId } = await params
  const now = new Date()

  const [concurso, abiertos] = await Promise.all([
    prisma.concurso.findUnique({ where: { id: concursoId } }),
    prisma.concurso.findMany({
      where: { fechaApertura: { lte: now }, fechaCierre: { gte: now } },
      orderBy: { fechaCierre: 'asc' },
    }),
  ])

  if (!concurso || !isConcursoActivo(concurso)) notFound()

  const opciones = abiertos.map((c) => ({ value: c.id, label: etiquetaConcurso(c) }))

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 text-gray-900">
      <header className="bg-face-blue">
        <div className="h-2 bg-face-red" />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <InstitutionalBrand compact />
          <Link href="/" className="text-sm font-semibold text-white/90 hover:text-face-gold">
            Volver a los llamados
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
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

          <div className="min-w-0 space-y-8">
            <section>
              <p className="text-sm font-semibold uppercase tracking-wide text-face-red">Inscripción abierta</p>
              <h1 className="mt-3 text-2xl font-bold text-face-blue sm:text-3xl">
                Expte. {concurso.numeroExpediente} — {CARGO_LABELS[concurso.cargo] ?? concurso.cargo} ({concurso.dedicacion})
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {[
                  concurso.disciplina,
                  concurso.area ? `Área ${concurso.area}` : null,
                  concurso.catedra ? `Cátedra ${concurso.catedra}` : null,
                  concurso.asignatura,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>

              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-gray-200 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Apertura</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {fechaHoraArg(concurso.fechaApertura)}
                  </dd>
                </div>
                <div className="rounded-md border border-gray-200 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cierre</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {fechaHoraArg(concurso.fechaCierre)}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 space-y-3 rounded-md border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
                <p>
                  El presente formulario tiene por objeto formalizar la inscripción a los concursos docentes para cargos de
                  Profesores Titulares, Asociados y Adjuntos de la Universidad Nacional de Tucumán, conforme al Reglamento
                  General de Concursos Docentes vigente (Resolución N°: RES - DGAC - 10801 / 2026).
                </p>
                <p>
                  El/la postulante deberá completar todos los campos obligatorios y adjuntar la documentación requerida en
                  formato digital. La información consignada y la documentación presentada tienen carácter de declaración
                  jurada, conforme al artículo 9 del Reglamento General de Concursos Docentes.
                </p>
                <p>La inscripción deberá realizarse dentro del período establecido en la convocatoria correspondiente.</p>
                <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 font-medium text-amber-900">
                  IMPORTANTE: antes de enviar el formulario, verificá que toda la documentación requerida haya sido
                  incorporada. Una vez vencido el período de inscripción no podrán presentarse títulos, antecedentes ni
                  trabajos.
                </p>
              </div>
            </section>

            <section className="rounded-md border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-face-blue">Formulario de inscripción</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Completá tus datos y adjuntá la documentación requerida en formato PDF.
                </p>
              </div>
              <div className="mb-6">
                <ConcursoSelect opciones={opciones} concursoId={concurso.id} />
              </div>
              <PostulanteForm concursoId={concurso.id} />
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
