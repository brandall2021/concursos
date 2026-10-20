import { ConcursoForm } from '@/components/ConcursoForm'
import { createConcurso } from '@/actions/concursos'
import { requireAdmin } from '@/lib/guards'
import Link from 'next/link'

export default async function NuevoConcursoPage() {
  await requireAdmin()

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <Link href="/admin/concursos" className="text-sm font-medium text-gray-500 hover:text-face-red">
          Volver a concursos
        </Link>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-face-red">Nuevo llamado</p>
        <h1 className="mt-1 text-2xl font-bold text-face-blue">Nuevo concurso</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cargá los datos del llamado tal como fueron publicados en la convocatoria.
        </p>
      </header>
      <ConcursoForm action={createConcurso} />
    </div>
  )
}
