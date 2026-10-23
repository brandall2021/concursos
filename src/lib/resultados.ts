import path from 'node:path'
import { LIMITE_RESULTADO, esPdfValido, tieneFirmaPdf, formatearBytes } from './documentos'
import { getConcursoEstado } from './concurso-status'
import { nombreArchivoSeguro } from './http'

export const LARGO_MAX_NOMBRE_RESULTADO = 120

export type ResultadoValidado = { ok: true; file: File; nombre: string } | { ok: false; error: string }

// Ruta relativa dentro de UPLOAD_DIR. El id viene de la base (cuid), y aun así dentroDeUploadDir en
// uploads.ts valida que la ruta resuelta no salga del volumen. La versión (marca de tiempo) hace que
// publicar reemplace el enlace en un solo paso en vez de pisar el PDF que se está sirviendo.
export function rutaResultadoRelativa(concursoId: string, version: number = Date.now()): string {
  return path.join('resultados', `${concursoId}-${version}.pdf`)
}

// Nombre que escribio el admin al subir el archivo. Se muestra en la grilla y en la pagina principal,
// pero no se usa para la ruta de disco ni para la cabecera de descarga.
export function nombreResultadoParaMostrar(
  nombre: string,
  porDefecto: string = 'Documento del concurso'
): string {
  const base = nombre.split(/[\\/]/).pop() ?? ''
  const limpio = base
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LARGO_MAX_NOMBRE_RESULTADO)
  return limpio || porDefecto
}

// El archivo se sirve con el numero de expediente, que lo define la base de datos: el nombre original
// del PDF subido puede traer espacios, comillas o caracteres de control.
export function nombreDescargaResultado(numeroExpediente: string): string {
  return `resultado-${nombreArchivoSeguro(numeroExpediente)}.pdf`
}

export function sePuedePublicarResultado(
  concurso: { fechaApertura: Date; fechaCierre: Date },
  now: Date = new Date()
): boolean {
  return getConcursoEstado(concurso, now) === 'cerrado'
}

export async function validarResultadoPdf(value: FormDataEntryValue | null): Promise<ResultadoValidado> {
  if (!value || typeof value === 'string' || value.size === 0) {
    return { ok: false, error: 'Adjuntá el PDF del resultado en formato PDF.' }
  }

  const file = value as File
  if (!esPdfValido(file)) {
    return { ok: false, error: 'El resultado debe ser un archivo PDF.' }
  }

  if (file.size > LIMITE_RESULTADO) {
    return { ok: false, error: `El resultado supera el máximo de ${formatearBytes(LIMITE_RESULTADO)}.` }
  }

  // type y name los eligió quien sube; la firma la puso quien generó el archivo.
  if (!(await tieneFirmaPdf(file))) {
    return { ok: false, error: 'El archivo no es un PDF válido.' }
  }

  return { ok: true, file, nombre: nombreResultadoParaMostrar(file.name) }
}
