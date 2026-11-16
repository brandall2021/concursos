'use client'

import { useActionState } from 'react'
import { subirDocumentoPostulante } from '@/actions/documentos-postulante'
import { NOMBRES_DOCUMENTO, type CampoDocumento } from '@/lib/documentos'

type State = { ok: boolean; error: string | null }

// Link de descarga + botón para subir/reemplazar el PDF de un documento
// del postulante desde el panel de administración. Al elegir un archivo
// del selector se envía el formulario solo.
export function DocumentoUpload({
  postulanteId,
  campo,
  label,
  href,
}: {
  postulanteId: string
  campo: CampoDocumento
  label: string
  href: string
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      const res = await subirDocumentoPostulante(formData)
      return { ok: res.ok, error: res.error ?? null }
    },
    { ok: false, error: null }
  )

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-1">
      <input type="hidden" name="postulanteId" value={postulanteId} />
      <input type="hidden" name="campo" value={campo} />
      <a
        href={href}
        download
        title={NOMBRES_DOCUMENTO[campo]}
        className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-face-blue transition hover:border-gray-300 hover:bg-gray-50"
      >
        {label}
      </a>
      <label
        title={`Subir / reemplazar ${NOMBRES_DOCUMENTO[campo]}`}
        className="cursor-pointer rounded border border-gray-200 bg-white px-1.5 py-1 text-xs font-semibold text-gray-400 transition hover:border-gray-300 hover:text-face-blue"
      >
        {pending ? '…' : '⤒'}
        <input
          type="file"
          name="archivo"
          accept=".pdf,application/pdf"
          required
          disabled={pending}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) e.currentTarget.form?.requestSubmit()
          }}
        />
      </label>
      {state.ok && <span className="text-xs text-green-600">✓</span>}
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  )
}
