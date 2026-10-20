'use client'

import { useRef, useState } from 'react'
import { esPdfValido, formatearBytes } from '@/lib/documentos'

interface Props {
  label: string
  name: string
  ayuda?: string
  maxBytes: number
  required?: boolean
}

export function FileInput({ label, name, ayuda, maxBytes, required }: Props) {
  const inputId = name
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setError(null)
    if (!file) {
      setFileName(null)
      return
    }
    const esPdf = esPdfValido(file)
    if (!esPdf) {
      setError('El archivo debe estar en formato PDF.')
      setFileName(null)
      if (ref.current) ref.current.value = ''
      return
    }
    if (file.size > maxBytes) {
      setError(`El archivo supera el máximo de ${formatearBytes(maxBytes)}.`)
      setFileName(null)
      if (ref.current) ref.current.value = ''
      return
    }
    setFileName(file.name)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-gray-700">
        {label}
        <span className="ml-1 font-normal text-gray-500">(PDF · máx. {formatearBytes(maxBytes)})</span>
      </label>
      {ayuda && <p className="text-xs leading-5 text-gray-500">{ayuda}</p>}
      <input
        ref={ref}
        id={inputId}
        name={name}
        type="file"
        accept="application/pdf,.pdf"
        required={required}
        onChange={handleChange}
        className={`block w-full cursor-pointer rounded-md border bg-white text-sm text-gray-700 shadow-sm file:mr-3 file:cursor-pointer file:rounded-l-md file:border-0 file:bg-gray-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-face-blue hover:file:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {fileName && <span className="text-xs text-emerald-700">✓ {fileName}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
