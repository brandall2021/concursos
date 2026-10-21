'use client'

import { useState } from 'react'
import { inscribirPostulante } from '@/actions/postulantes'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { FileInput } from './ui/FileInput'
import { LIMITE_SOLICITUD, LIMITE_DNI, LIMITE_CV, LIMITE_ANTECEDENTES } from '@/lib/documentos'
import { useRouter } from 'next/navigation'

const DECLARACIONES = [
  'Declaro bajo juramento que la información consignada en el presente formulario y en el Curriculum Vitae presentado es verdadera, completa y exacta; que la documentación respaldatoria adjuntada se corresponde con los antecedentes declarados en el Curriculum Vitae y con la documentación original; que conozco y acepto que tanto el Curriculum Vitae como la documentación respaldatoria tienen carácter de declaración jurada; y que conozco que el eventual falseamiento de la información o documentación presentada constituye falta grave y puede ser causal de exclusión del concurso.',
  'Asimismo, declaro conocer y aceptar el Reglamento de Concursos de Profesores de la Universidad Nacional de Tucumán y las disposiciones que rigen el presente procedimiento concursal. Declaro, además, que el domicilio consignado en el presente formulario constituye el domicilio denunciado a todos los efectos de las notificaciones vinculadas con el concurso, asumiendo la responsabilidad de comunicar formalmente cualquier modificación del mismo, conforme a la normativa aplicable.',
  'Declaro conocer que no podrán presentarse títulos, antecedentes ni trabajos con posterioridad al cierre del período de inscripción.',
]

export function PostulanteForm({ concursoId }: { concursoId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [declaracion, setDeclaracion] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!declaracion) {
      setError('Debés aceptar las declaraciones juradas para continuar.')
      return
    }

    setPending(true)
    const formData = new FormData(e.currentTarget)
    formData.set('concursoId', concursoId)

    const result = await inscribirPostulante(formData)
    setPending(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    router.push(`/inscripcion/${concursoId}/confirmacion?id=${result.postulanteId}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-face-red">Datos del postulante</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Apellido/s" name="apellidos" required autoComplete="family-name" />
          <Input label="Nombre/s" name="nombres" required autoComplete="given-name" />
        </div>
        <Input
          label="Documento Nacional de Identidad (N°)"
          name="dni"
          required
          inputMode="numeric"
          pattern="\d{7,8}"
          title="Ingresá 7 u 8 dígitos numéricos"
          placeholder="12345678"
        />
        <Input
          label="Correo electrónico (Campo obligatorio)"
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="nombre@unt.edu.ar"
        />
        <p className="text-xs leading-5 text-gray-500">
          Constitución de domicilio electrónico en una casilla personal perteneciente a la institución cuando se trate de docentes o personal de la UNT o en una personal, donde son válidas y eficaces todas las comunicaciones y notificaciones que se cursen en el trámite del concurso.
        </p>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-face-red">Documentación digital</legend>

        <FileInput
          label="Solicitud de inscripción"
          name="solicitud"
          maxBytes={LIMITE_SOLICITUD}
          required
          ayuda="La solicitud de inscripción debe estar dirigida al Decano/a, con especificación de área, o disciplina/s asignatura/s del cargo al que aspira y detalle de la documentación que adjunta."
        />
        <FileInput
          label="Documento Nacional de Identidad"
          name="dniArchivo"
          maxBytes={LIMITE_DNI}
          required
          ayuda="DNI digital o escaneado de ambos lados."
        />
        <FileInput
          label="Curriculum Vitae"
          name="cv"
          maxBytes={LIMITE_CV}
          required
          ayuda="Ver Modelo de Curriculum en Anexo II de la Resolución N°: RES - DGAC - 10801 / 2026 del Reglamento General de Concursos Docentes para las Categorías de Profesores Titulares, Asociados y Adjuntos, de la Universidad Nacional de Tucumán."
        />
        <FileInput
          label="Documentación respaldatoria de los antecedentes"
          name="antecedentes"
          maxBytes={LIMITE_ANTECEDENTES}
          required
          ayuda="La documentación respaldatoria de los antecedentes contenidos en el currículum de cada postulante debe adjuntarse escaneada en forma completa y legible, y respetar nombres, títulos y orden establecidos en el currículum vitae. Debe corresponderse con exactitud a la documentación original, bajo pena de tenerse por no presentada."
        />
      </fieldset>

      <fieldset className="space-y-3 rounded-md border border-gray-200 bg-slate-50 p-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-face-red">Declaraciones juradas</legend>
        <ul className="space-y-3 text-xs leading-5 text-gray-600">
          {DECLARACIONES.map((texto, i) => (
            <li key={i}>{texto}</li>
          ))}
        </ul>
        <label className="flex items-start gap-3 rounded-md border border-gray-200 bg-white p-3 text-sm font-medium text-gray-800">
          <input
            type="checkbox"
            name="declaracion"
            checked={declaracion}
            onChange={(e) => setDeclaracion(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-face-red focus:ring-2 focus:ring-face-red"
          />
          <span>He leído y acepto las declaraciones juradas precedentes.</span>
        </label>
      </fieldset>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Enviando inscripción...' : 'Enviar inscripción'}
      </Button>
    </form>
  )
}
