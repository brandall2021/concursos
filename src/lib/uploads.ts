import { mkdir, writeFile, readFile, unlink, rm } from 'node:fs/promises'
import path from 'node:path'
import { CAMPOS_DOCUMENTO, type CampoDocumento } from './documentos'
import {
  usandoMinio,
  minioGuardar,
  minioLeer,
  minioBorrar,
  minioBorrarCarpeta,
} from './minio'

export * from './documentos'

export function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), 'uploads')
}

function dentroDeUploadDir(relativa: string): string {
  const base = path.resolve(uploadDir())
  const destino = path.resolve(base, relativa)
  if (destino !== base && !destino.startsWith(base + path.sep)) {
    throw new Error('Ruta de documento fuera del directorio de subidas')
  }
  return destino
}

async function escribir(relativa: string, buffer: Buffer): Promise<void> {
  if (usandoMinio()) {
    await minioGuardar(relativa, buffer)
    return
  }
  await mkdir(path.dirname(dentroDeUploadDir(relativa)), { recursive: true })
  await writeFile(dentroDeUploadDir(relativa), buffer)
}

export function rutasEsperadas(postulanteId: string): Record<CampoDocumento, string> {
  return Object.fromEntries(
    CAMPOS_DOCUMENTO.map((campo) => [campo, path.join(postulanteId, `${campo}.pdf`)])
  ) as Record<CampoDocumento, string>
}

export async function guardarArchivos(
  postulanteId: string,
  files: Record<CampoDocumento, File>
): Promise<Record<CampoDocumento, string>> {
  if (!usandoMinio()) {
    await mkdir(path.join(uploadDir(), postulanteId), { recursive: true })
  }

  const paths = {} as Record<CampoDocumento, string>
  for (const campo of CAMPOS_DOCUMENTO) {
    const buffer = Buffer.from(await files[campo].arrayBuffer())
    const relativa = path.join(postulanteId, `${campo}.pdf`)
    await escribir(relativa, buffer)
    paths[campo] = relativa
  }
  return paths
}

export async function limpiarArchivos(paths: Partial<Record<CampoDocumento, string>>) {
  await Promise.all(Object.values(paths).map((relativa) => (relativa ? borrarPdf(relativa) : undefined)))
}

// Escritura genérica de un PDF por ruta relativa (los resultados de concurso se guardan en
// resultados/<concursoId>.pdf, no en la carpeta de un postulante). La validación de la ruta
// se hace acá para que ningún llamador pueda saltarse el control, sea disco o MinIO.
export async function guardarPdf(relativa: string, file: File): Promise<void> {
  await escribir(relativa, Buffer.from(await file.arrayBuffer()))
}

// Lectura usada por las rutas de descarga: elige MinIO o disco según la configuración.
export async function leerPdf(relativa: string): Promise<Buffer> {
  if (usandoMinio()) return minioLeer(relativa)
  return readFile(dentroDeUploadDir(relativa))
}

export async function borrarPdf(relativa: string): Promise<void> {
  if (usandoMinio()) {
    await minioBorrar(relativa)
    return
  }
  try {
    await unlink(dentroDeUploadDir(relativa))
  } catch {
    // un resultado que no estaba en disco ya no tiene nada que limpiar
  }
}

export async function eliminarCarpetaPostulante(postulanteId: string) {
  if (usandoMinio()) {
    await minioBorrarCarpeta(postulanteId)
    return
  }
  await rm(dentroDeUploadDir(postulanteId), { recursive: true, force: true })
}

export function resolverArchivo(relativa: string): string {
  return dentroDeUploadDir(relativa)
}
