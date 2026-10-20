'use client'

import { useRouter } from 'next/navigation'
import { Select } from './ui/Select'

export function ConcursoSelect({
  opciones,
  concursoId,
}: {
  opciones: { value: string; label: string }[]
  concursoId: string
}) {
  const router = useRouter()

  return (
    <Select
      label="Identificación del concurso"
      name="concursoSelect"
      required
      value={concursoId}
      options={opciones}
      onChange={(e) => {
        if (e.target.value && e.target.value !== concursoId) {
          router.push(`/inscripcion/${e.target.value}`)
        }
      }}
    />
  )
}
