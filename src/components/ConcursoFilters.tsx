'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

const CARGO_OPTIONS = [
  { value: '', label: 'Todos los cargos' },
  { value: 'Titular', label: 'Profesor Titular' },
  { value: 'Asociado', label: 'Profesor Asociado' },
  { value: 'Adjunto', label: 'Profesor Adjunto' },
]

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'proximo', label: 'Próximo' },
  { value: 'activo', label: 'Inscripción abierta' },
  { value: 'cerrado', label: 'Cerrado' },
]

const INSCRIPTOS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'con', label: 'Con inscriptos' },
  { value: 'sin', label: 'Sin inscriptos' },
]

const inputClass =
  'min-h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-face-red focus:ring-2 focus:ring-red-100'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-gray-500'

export function ConcursoFilters({ cargos }: { cargos: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const update = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(name, value)
      else params.delete(name)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams]
  )

  const value = (name: string) => searchParams.get(name) ?? ''

  const hayFiltros = ['q', 'catedra', 'cargo', 'estado', 'inscripto', 'inscriptos'].some((k) =>
    searchParams.get(k)
  )

  return (
    <section className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-q" className={labelClass}>
            Expediente
          </label>
          <input
            id="f-q"
            type="search"
            placeholder="Ej. 12345/2026"
            defaultValue={value('q')}
            className={inputClass}
            onChange={(e) => update('q', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-catedra" className={labelClass}>
            Cátedra
          </label>
          <input
            id="f-catedra"
            type="search"
            placeholder="Ej. Contabilidad I"
            defaultValue={value('catedra')}
            className={inputClass}
            onChange={(e) => update('catedra', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-cargo" className={labelClass}>
            Cargo
          </label>
          <select
            id="f-cargo"
            className={inputClass}
            value={value('cargo')}
            onChange={(e) => update('cargo', e.target.value)}
          >
            <option value="">Todos los cargos</option>
            {cargos.map((c) => (
              <option key={c} value={c}>
                {CARGO_OPTIONS.find((o) => o.value === c)?.label ?? c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-estado" className={labelClass}>
            Estado
          </label>
          <select
            id="f-estado"
            className={inputClass}
            value={value('estado')}
            onChange={(e) => update('estado', e.target.value)}
          >
            {ESTADO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-inscripto" className={labelClass}>
            Inscripto
          </label>
          <input
            id="f-inscripto"
            type="search"
            placeholder="Ej. Juan Pérez o DNI"
            defaultValue={value('inscripto')}
            className={inputClass}
            onChange={(e) => update('inscripto', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-inscriptos" className={labelClass}>
            Postulantes
          </label>
          <select
            id="f-inscriptos"
            className={inputClass}
            value={value('inscriptos')}
            onChange={(e) => update('inscriptos', e.target.value)}
          >
            {INSCRIPTOS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (hayFiltros) router.replace(pathname)
            }}
            disabled={!hayFiltros}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </section>
  )
}
