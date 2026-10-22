'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './ui/Button'
import { FileInput } from './ui/FileInput'
import { despublicarResultado, publicarResultado } from '@/actions/resultados'
import { LIMITE_RESULTADO } from '@/lib/documentos'

interface Props {
  concursoId: string
  // Etiqueta del llamado, para que el mensaje de error diga de qué concurso se habla.
  nombre: string
  resultadoNombre: string | null
  // Fecha ya formateada en el servidor: el componente solo la pinta.
  publicadoEl: string | null
  enlace: string
}

export function ResultadoPublicado({ concursoId, nombre, resultadoNombre, publicadoEl, enlace }: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [abierto, setAbierto] = useState(false)
  const [pendiente, setPendiente] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const publicado = Boolean(publicadoEl)

  async function publicar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!formRef.current) return

    setPendiente(true)
    setError(null)
    const resultado = await publicarResultado(concursoId, new FormData(formRef.current))
    setPendiente(false)

    if (!resultado.success) {
      setError(resultado.error)
      return
    }

    formRef.current.reset()
    setAbierto(false)
    router.refresh()
  }

  async function despublicar() {
    setPendiente(true)
    setError(null)
    const resultado = await despublicarResultado(concursoId)
    setPendiente(false)

    if (!resultado.success) {
      setError(resultado.error)
      return
    }

    router.refresh()
  }

  return (
    <div className="max-w-[320px] space-y-2">
      {publicado ? (
        <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
          <p className="text-xs font-semibold text-gray-700">Resultado publicado</p>
          <p className="mt-0.5 truncate text-xs text-gray-500" title={resultadoNombre ?? undefined}>
            {resultadoNombre ?? 'Documento del concurso'}
          </p>
          <p className="text-xs text-gray-500">desde {publicadoEl}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={enlace}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-face-red hover:underline"
            >
              Ver PDF
            </a>
            <button
              type="button"
              onClick={() => {
                setError(null)
                setAbierto((valor) => !valor)
              }}
              className="text-xs font-semibold text-gray-600 hover:underline"
            >
              {abierto ? 'Cancelar' : 'Reemplazar PDF'}
            </button>
            <button
              type="button"
              onClick={despublicar}
              disabled={pendiente}
              className="text-xs font-semibold text-rose-700 hover:underline disabled:opacity-50"
            >
              Quitar publicación
            </button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          className="px-3 py-1.5 text-xs"
          onClick={() => {
            setError(null)
            setAbierto((valor) => !valor)
          }}
          disabled={pendiente}
        >
          {abierto ? 'Cancelar' : 'Publicar resultado'}
        </Button>
      )}

      {abierto && (
        <form ref={formRef} onSubmit={publicar} className="space-y-2 rounded-md border border-gray-200 bg-white p-3">
          <FileInput
            label="PDF del resultado"
            name="resultado"
            ayuda={`Resolución, dictamen u orden de mérito del ${nombre}.`}
            maxBytes={LIMITE_RESULTADO}
            required
          />
          {error && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {error}
            </p>
          )}
          <Button type="submit" className="px-3 py-1.5 text-xs" disabled={pendiente}>
            {pendiente ? 'Publicando…' : publicado ? 'Reemplazar y publicar' : 'Publicar en la página principal'}
          </Button>
        </form>
      )}
    </div>
  )
}
