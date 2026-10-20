import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { InstitutionalBrand } from '@/components/InstitutionalBrand'
import { CARGO_LABELS } from '@/lib/concurso-status'
import Link from 'next/link'

export default async function ConfirmacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ concursoId: string }>
  searchParams: Promise<{ id?: string }>
}) {
  const { concursoId } = await params
  const { id: postulanteId } = await searchParams
  if (!postulanteId) notFound()

  const postulante = await prisma.postulante.findUnique({
    where: { id: postulanteId },
    include: { concurso: true },
  })

  if (!postulante || postulante.concursoId !== concursoId) notFound()

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-gray-900 sm:px-6">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
        <div className="h-2 bg-face-red" />
        <div className="border-b border-gray-200 px-6 py-5 sm:px-8">
          <InstitutionalBrand compact />
        </div>
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xl font-bold text-emerald-700">
              ✓
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Inscripción registrada</p>
              <h1 className="mt-1 text-2xl font-bold text-face-blue">Tu inscripción fue registrada</h1>
              <p className="mt-1 text-sm text-gray-500">Ya podés descargar el comprobante en PDF.</p>
            </div>
          </div>

          <dl className="grid gap-3 rounded-md border border-gray-200 bg-slate-50 p-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Postulante</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">
                {postulante.apellidos}, {postulante.nombres}
              </dd>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">DNI</dt>
                <dd className="mt-1 text-sm text-gray-900">{postulante.dni}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {postulante.fechaInscripcion.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
                </dd>
              </div>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Concurso</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">
                Expte. {postulante.concurso.numeroExpediente} —{' '}
                {CARGO_LABELS[postulante.concurso.cargo] ?? postulante.concurso.cargo} ({postulante.concurso.dedicacion})
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={`/api/comprobante/${postulante.id}`}
              download
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-md bg-face-red px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-face-red focus:ring-offset-2"
            >
              Descargar comprobante
            </a>
            <Link
              href="/"
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
