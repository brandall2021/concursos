import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'
import { notFound } from 'next/navigation'
import { ExportButtons } from '@/components/ExportButtons'
import { ObservacionEditor } from '@/components/ObservacionEditor'
import { ConcursoStatusBadge } from '@/components/ConcursoStatusBadge'
import { CARGO_LABELS } from '@/lib/concurso-status'
import { NOMBRES_DOCUMENTO, type CampoDocumento } from '@/lib/uploads'
import { fechaHoraArg } from '@/lib/fecha'
import Link from 'next/link'

const CAMPOS: CampoDocumento[] = ['solicitud', 'dniArchivo', 'cv', 'antecedentes']

const CAMPOS_LABEL: Record<CampoDocumento, string> = {
  solicitud: 'Nota',
  dniArchivo: 'DNI',
  cv: 'CV',
  antecedentes: 'Resp.',
}

export default async function PostulantesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const concurso = await prisma.concurso.findUnique({
    where: { id },
    include: { postulantes: { orderBy: { fechaInscripcion: 'asc' } } },
  })
  if (!concurso) notFound()

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/concursos" className="text-sm font-medium text-gray-500 hover:text-face-red">
            Volver a concursos
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-face-blue">
              Expte. {concurso.numeroExpediente} — {CARGO_LABELS[concurso.cargo] ?? concurso.cargo}
            </h1>
            <ConcursoStatusBadge fechaApertura={concurso.fechaApertura} fechaCierre={concurso.fechaCierre} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {concurso.postulantes.length} postulante{concurso.postulantes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:text-right">Exportar</p>
          <ExportButtons concursoId={concurso.id} />
        </div>
      </header>

      {concurso.postulantes.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-gray-900">Todavía no hay postulantes</h2>
          <p className="mt-1 text-sm text-gray-500">Cuando se registren postulantes, aparecerán en esta tabla.</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Apellido/s</th>
                  <th className="px-5 py-3">Nombre/s</th>
                  <th className="px-5 py-3">DNI</th>
                  <th className="px-5 py-3">Correo</th>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Observación</th>
                  <th className="px-5 py-3">Documentos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {concurso.postulantes.map((postulante) => (
                  <tr key={postulante.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-sm font-bold tracking-wider text-face-red">
                      {postulante.codigoInscripcion}
                    </td>
                    <td className="px-5 py-3 font-semibold text-face-blue">{postulante.apellidos}</td>
                    <td className="px-5 py-3 text-gray-800">{postulante.nombres}</td>
                    <td className="px-5 py-3 text-gray-600">{postulante.dni}</td>
                    <td className="px-5 py-3 text-gray-600">{postulante.email}</td>
                    <td className="px-5 py-3 text-gray-500">{fechaHoraArg(postulante.fechaInscripcion)}</td>
                    <td className="px-5 py-3 align-top">
                      <ObservacionEditor postulanteId={postulante.id} observacion={postulante.observacion} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {CAMPOS.map((campo) => (
                          <a
                            key={campo}
                            href={`/api/admin/postulantes/${postulante.id}/documentos/${campo}`}
                            download
                            title={NOMBRES_DOCUMENTO[campo]}
                            className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-face-blue transition hover:border-gray-300 hover:bg-gray-50"
                          >
                            {CAMPOS_LABEL[campo]}
                          </a>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
