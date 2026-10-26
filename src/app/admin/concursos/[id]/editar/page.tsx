import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'
import { updateConcurso } from '@/actions/concursos'
import { ConcursoForm } from '@/components/ConcursoForm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { aFechaHoraLocalArg } from '@/lib/fecha'

export default async function EditarConcursoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const concurso = await prisma.concurso.findUnique({ where: { id } })
  if (!concurso) notFound()

  const action = updateConcurso.bind(null, concurso.id)

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <Link href="/admin/concursos" className="text-sm font-medium text-gray-500 hover:text-face-red">
          Volver a concursos
        </Link>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-face-red">Editar llamado</p>
        <h1 className="mt-1 text-2xl font-bold text-face-blue">Expte. {concurso.numeroExpediente}</h1>
        <p className="mt-1 text-sm text-gray-500">Actualizá la información visible para los postulantes.</p>
      </header>
      <ConcursoForm
        action={action}
        resolucionActual={
          concurso.resolucionPath
            ? {
                nombre: concurso.resolucionNombre ?? 'Resolución',
                enlace: `/api/concursos/${concurso.id}/resolucion`,
              }
            : null
        }
        defaultValues={{
          numeroExpediente: concurso.numeroExpediente,
          cargo: concurso.cargo,
          dedicacion: concurso.dedicacion,
          disciplina: concurso.disciplina ?? '',
          area: concurso.area ?? '',
          catedra: concurso.catedra ?? '',
          asignatura: concurso.asignatura ?? '',
          fechaApertura: aFechaHoraLocalArg(concurso.fechaApertura),
          fechaCierre: aFechaHoraLocalArg(concurso.fechaCierre),
        }}
      />
    </div>
  )
}
