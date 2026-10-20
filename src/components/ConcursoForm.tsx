'use client'

import { useState } from 'react'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { CARGOS, CARGO_LABELS } from '@/lib/concurso-status'

interface ConcursoFormProps {
  action: (formData: FormData) => Promise<{ error: string } | void>
  defaultValues?: {
    numeroExpediente: string
    cargo: string
    dedicacion: string
    disciplina: string
    area: string
    catedra: string
    asignatura: string
    fechaApertura: string
    fechaCierre: string
  }
}

export function ConcursoForm({ action, defaultValues }: ConcursoFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await action(formData)
    if (result && 'error' in result) {
      setError(result.error)
    }
    setPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-md border border-gray-200 bg-white p-5 shadow-sm">
      <Input
        label="N° de expediente"
        name="numeroExpediente"
        required
        defaultValue={defaultValues?.numeroExpediente}
        placeholder="12345/2026"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Cargo"
          name="cargo"
          required
          defaultValue={defaultValues?.cargo}
          placeholder="Seleccioná un cargo"
          options={CARGOS.map((cargo) => ({ value: cargo, label: CARGO_LABELS[cargo] }))}
        />
        <Input
          label="Dedicación"
          name="dedicacion"
          required
          defaultValue={defaultValues?.dedicacion}
          placeholder="Simple / Semiexclusiva / Exclusiva"
        />
      </div>
      <Input label="Disciplina" name="disciplina" required defaultValue={defaultValues?.disciplina} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Área" name="area" defaultValue={defaultValues?.area} />
        <Input label="Cátedra" name="catedra" defaultValue={defaultValues?.catedra} />
      </div>
      <Input label="Asignatura" name="asignatura" required defaultValue={defaultValues?.asignatura} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Fecha y hora de apertura"
          name="fechaApertura"
          type="datetime-local"
          required
          defaultValue={defaultValues?.fechaApertura}
        />
        <Input
          label="Fecha y hora de cierre"
          name="fechaCierre"
          type="datetime-local"
          required
          defaultValue={defaultValues?.fechaCierre}
        />
      </div>
      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
