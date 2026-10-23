'use client'

import { useState } from 'react'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { FileInput } from './ui/FileInput'
import { CARGOS, CARGO_LABELS } from '@/lib/concurso-status'
import { LIMITE_RESOLUCION } from '@/lib/documentos'

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
  // Resolución ya cargada: solo se pasa al editar, para mostrar el enlace y ofrecer quitarla.
  resolucionActual?: { nombre: string; enlace: string } | null
}

export function ConcursoForm({ action, defaultValues, resolucionActual }: ConcursoFormProps) {
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
      <Input label="Disciplina (opcional)" name="disciplina" defaultValue={defaultValues?.disciplina} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Área (opcional)" name="area" defaultValue={defaultValues?.area} />
        <Input label="Cátedra (opcional)" name="catedra" defaultValue={defaultValues?.catedra} />
      </div>
      <Input label="Asignatura (opcional)" name="asignatura" defaultValue={defaultValues?.asignatura} />
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
      <div className="space-y-3 rounded-md border border-gray-200 bg-slate-50 p-4">
        <FileInput
          label="Resolución del llamado"
          name="resolucion"
          ayuda="PDF de la resolución que crea el concurso. Si lo cargás, la página principal muestra el enlace «Resolución» en la tarjeta del llamado."
          maxBytes={LIMITE_RESOLUCION}
        />
        {resolucionActual && (
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
            <p className="text-xs font-semibold text-gray-700">Resolución cargada</p>
            <p className="mt-0.5 truncate text-xs text-gray-500" title={resolucionActual.nombre}>
              {resolucionActual.nombre}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <a
                href={resolucionActual.enlace}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-face-red hover:underline"
              >
                Ver PDF
              </a>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                <input
                  type="checkbox"
                  name="quitarResolucion"
                  className="h-4 w-4 rounded border-gray-300 text-face-red focus:ring-2 focus:ring-face-red"
                />
                Quitar esta resolución
              </label>
            </div>
          </div>
        )}
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
