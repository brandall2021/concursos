'use client'

import { useState } from 'react'
import { actualizarObservacion } from '@/actions/observaciones'
import { Button } from './ui/Button'

const LARGO_MAX = 2000

export function ObservacionEditor({
  postulanteId,
  observacion,
}: {
  postulanteId: string
  observacion: string | null
}) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(observacion ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    setGuardando(true)
    setError(null)
    const resultado = await actualizarObservacion(postulanteId, texto)
    setGuardando(false)

    if (!resultado.success) {
      setError(resultado.error)
      return
    }

    setEditando(false)
  }

  if (!editando) {
    return (
      <div className="max-w-[260px]">
        <p className="whitespace-pre-line break-words text-sm text-gray-700">
          {observacion || <span className="text-gray-400">Sin observación</span>}
        </p>
        <button
          type="button"
          onClick={() => {
            setTexto(observacion ?? '')
            setError(null)
            setEditando(true)
          }}
          className="mt-1 text-xs font-semibold text-face-red hover:underline"
        >
          {observacion ? 'Editar' : 'Agregar observación'}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-[320px] space-y-2">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={4}
        maxLength={LARGO_MAX}
        aria-label="Observación del postulante"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-face-red focus:outline-none focus:ring-1 focus:ring-face-red"
        placeholder="Ej.: falta respaldo del título, intimado a subsanar."
      />
      <p className="text-xs text-gray-500">
        {texto.trim().length}/{LARGO_MAX}
      </p>
      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={guardar} disabled={guardando} className="px-3 py-1.5 text-xs">
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setEditando(false)
            setError(null)
          }}
          disabled={guardando}
          className="px-3 py-1.5 text-xs"
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
