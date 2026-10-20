import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { buttonClassName } from '@/components/ui/Button'
import { ConcursoStatusBadge } from '@/components/ConcursoStatusBadge'
import { DeleteConcursoButton } from '@/components/DeleteConcursoButton'
import { CARGO_LABELS } from '@/lib/concurso-status'

export default async function AdminConcursosPage() {
  const concursos = await prisma.concurso.findMany({
    include: { _count: { select: { postulantes: true } } },
    orderBy: { fechaApertura: 'desc' },
  })

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

      {concursos.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-gray-900">No hay concursos creados</h2>
          <p className="mt-1 text-sm text-gray-500">Creá el primer llamado para abrir inscripciones.</p>
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
