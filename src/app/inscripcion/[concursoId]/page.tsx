import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { isConcursoActivo, etiquetaConcurso, CARGO_LABELS } from '@/lib/concurso-status'
import { PostulanteForm } from '@/components/PostulanteForm'
import { InstitutionalBrand } from '@/components/InstitutionalBrand'
import { ConcursoSelect } from '@/components/ConcursoSelect'
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
    <main className="min-h-screen bg-slate-50 text-gray-900">
      <header className="bg-face-blue">
        <div className="h-2 bg-face-red" />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <InstitutionalBrand compact />
          <Link href="/" className="text-sm font-semibold text-white/90 hover:text-face-gold">
            Volver a los llamados
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
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
                {concurso.fechaApertura.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
              </dd>
            </div>
            <div className="rounded-md border border-gray-200 bg-white p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cierre</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">
                {concurso.fechaCierre.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
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

        <section className="mt-8 rounded-md border border-gray-200 bg-white p-6 shadow-sm">
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
    </main>
  )
}
