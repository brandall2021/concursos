import path from 'node:path'
import { LIMITE_RESOLUCION, esPdfValido, formatearBytes, tieneFirmaPdf } from './documentos'
import { nombreArchivoSeguro } from './http'
import { nombreResultadoParaMostrar } from './resultados'

export type ResolucionValidada =
  | { ok: true; file: File; nombre: string }
  | { ok: true; file: null; nombre: null }
  | { ok: false; error: string }

// Ruta relativa dentro de UPLOAD_DIR, versionada igual que los resultados: reemplazar la resolución
// escribe una versión nueva y recién después borra la anterior, así un update fallido no deja un
// enlace público apuntando a un PDF que ya no existe.
export function rutaResolucionRelativa(concursoId: string, version: number = Date.now()): string {
  return path.join('resoluciones', `${concursoId}-${version}.pdf`)
}

export function nombreDescargaResolucion(numeroExpediente: string): string {
  return `resolucion-${nombreArchivoSeguro(numeroExpediente)}.pdf`
}

// A diferencia del resultado, la resolución viene vacía en el alta de un llamado: un input de archivo
// sin seleccionar (o un string) significa "sin documento", no un error de validación.
export async function validarResolucionPdf(value: FormDataEntryValue | null): Promise<ResolucionValidada> {
  if (!value || typeof value === 'string') return { ok: true, file: null, nombre: null }

  const file = value as File
  if (file.size === 0) return { ok: true, file: null, nombre: null }

  if (!esPdfValido(file)) {
    return { ok: false, error: 'La Resolución debe ser un archivo PDF.' }
  }

  if (file.size > LIMITE_RESOLUCION) {
    return { ok: false, error: `La Resolución supera el máximo de ${formatearBytes(LIMITE_RESOLUCION)}.` }
  }

  // type y name los eligió quien sube; la firma la puso quien generó el archivo.
  if (!(await tieneFirmaPdf(file))) {
    return { ok: false, error: 'La Resolución no es un PDF válido.' }
  }

  return { ok: true, file, nombre: nombreResultadoParaMostrar(file.name, 'Resolución') }
}
