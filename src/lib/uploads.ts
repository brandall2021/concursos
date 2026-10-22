import { mkdir, writeFile, unlink, rm } from 'node:fs/promises'
import path from 'node:path'
import { CAMPOS_DOCUMENTO, type CampoDocumento } from './documentos'

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

export function rutasEsperadas(postulanteId: string): Record<CampoDocumento, string> {
  return Object.fromEntries(
    CAMPOS_DOCUMENTO.map((campo) => [campo, path.join(postulanteId, `${campo}.pdf`)])
  ) as Record<CampoDocumento, string>
}

export async function guardarArchivos(
  postulanteId: string,
  files: Record<CampoDocumento, File>
): Promise<Record<CampoDocumento, string>> {
  const dir = path.join(uploadDir(), postulanteId)
  await mkdir(dir, { recursive: true })

  const paths = {} as Record<CampoDocumento, string>
  for (const campo of CAMPOS_DOCUMENTO) {
    const buffer = Buffer.from(await files[campo].arrayBuffer())
    const relativa = path.join(postulanteId, `${campo}.pdf`)
    await writeFile(dentroDeUploadDir(relativa), buffer)
    paths[campo] = relativa
  }
  return paths
}

export async function limpiarArchivos(paths: Partial<Record<CampoDocumento, string>>) {
  await Promise.all(
    Object.values(paths).map(async (relativa) => {
      if (!relativa) return
      try {
        await unlink(dentroDeUploadDir(relativa))
      } catch {
        // ignorar archivos inexistentes
      }
    })
  )
}

// Escritura genérica de un PDF por ruta relativa (los resultados de concurso se guardan en
// resultados/<concursoId>.pdf, no en la carpeta de un postulante). El guardado de ruta se hace acá
// para que ningún llamador pueda saltarse la validación de dentroDeUploadDir.
export async function guardarPdf(relativa: string, file: File): Promise<void> {
  const destino = dentroDeUploadDir(relativa)
  await mkdir(path.dirname(destino), { recursive: true })
  await writeFile(destino, Buffer.from(await file.arrayBuffer()))
}

export async function borrarPdf(relativa: string): Promise<void> {
  try {
    await unlink(dentroDeUploadDir(relativa))
  } catch {
    // un resultado que no estaba en disco ya no tiene nada que limpiar
  }
}

export async function eliminarCarpetaPostulante(postulanteId: string) {
  await rm(dentroDeUploadDir(postulanteId), { recursive: true, force: true })
}

export function resolverArchivo(relativa: string): string {
  return dentroDeUploadDir(relativa)
}
