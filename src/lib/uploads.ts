import { mkdir, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { CAMPOS_DOCUMENTO, type CampoDocumento } from './documentos'

export * from './documentos'

export function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), 'uploads')
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
    await writeFile(path.join(uploadDir(), relativa), buffer)
    paths[campo] = relativa
  }
  return paths
}

export async function limpiarArchivos(paths: Partial<Record<CampoDocumento, string>>) {
  await Promise.all(
    Object.values(paths).map(async (relativa) => {
      if (!relativa) return
      try {
        await unlink(path.join(uploadDir(), relativa))
      } catch {
        // ignorar archivos inexistentes
      }
    })
  )
}

export function resolverArchivo(relativa: string): string {
  return path.join(uploadDir(), relativa)
}
