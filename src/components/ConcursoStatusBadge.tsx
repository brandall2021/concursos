import { getConcursoEstado } from '@/lib/concurso-status'

const styles = {
  proximo: 'border-amber-200 bg-amber-50 text-amber-800',
  activo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cerrado: 'border-gray-200 bg-gray-50 text-gray-600',
}

const labels = {
  proximo: 'Próxima apertura',
  activo: 'Inscripción abierta',
  cerrado: 'Cerrado',
}

export function ConcursoStatusBadge({ fechaApertura, fechaCierre }: { fechaApertura: Date; fechaCierre: Date }) {
  const estado = getConcursoEstado({ fechaApertura, fechaCierre })
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[estado]}`}>
      {labels[estado]}
    </span>
  )
}
