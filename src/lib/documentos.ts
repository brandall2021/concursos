export const LIMITE_SOLICITUD = 10 * 1024 * 1024 // 10 MB
export const LIMITE_DNI = 10 * 1024 * 1024 // 10 MB
export const LIMITE_CV = 100 * 1024 * 1024 // 100 MB
export const LIMITE_ANTECEDENTES = 100 * 1024 * 1024 // 100 MB

export type CampoDocumento = 'solicitud' | 'dniArchivo' | 'cv' | 'antecedentes'

export const CAMPOS_DOCUMENTO: CampoDocumento[] = ['solicitud', 'dniArchivo', 'cv', 'antecedentes']

export const LIMITES: Record<CampoDocumento, number> = {
  solicitud: LIMITE_SOLICITUD,
  dniArchivo: LIMITE_DNI,
  cv: LIMITE_CV,
  antecedentes: LIMITE_ANTECEDENTES,
}

export const NOMBRES_DOCUMENTO: Record<CampoDocumento, string> = {
  solicitud: 'Solicitud de inscripción',
  dniArchivo: 'Documento Nacional de Identidad',
  cv: 'Currículum Vitae',
  antecedentes: 'Documentación respaldatoria de antecedentes',
}

export function formatearBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`
}

export function esPdfValido(file: Pick<File, 'type' | 'name'>): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export function validarPdf(value: FormDataEntryValue | null, campo: CampoDocumento): { ok: true; file: File } | { ok: false; error: string } {
  const nombre = NOMBRES_DOCUMENTO[campo]
  const max = LIMITES[campo]

  if (!value || typeof value === 'string' || value.size === 0) {
    return { ok: false, error: `Adjuntá ${nombre} en formato PDF.` }
  }

  const file = value as File
  if (!esPdfValido(file)) {
    return { ok: false, error: `${nombre} debe ser un archivo PDF.` }
  }

  if (file.size > max) {
    return { ok: false, error: `${nombre} supera el máximo de ${formatearBytes(max)}.` }
  }

  return { ok: true, file }
}
