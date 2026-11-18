// Almacenamiento de PDFs en MinIO (compatible con S3).
// Se activa solo cuando están definidas S3_ENDPOINT + S3_BUCKET + credenciales;
// si no, los archivos siguen yendo al directorio local (UPLOAD_DIR).
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

type Config = {
  endpoint: string
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
}

export function configMinio(): Config | null {
  const endpoint = process.env.S3_ENDPOINT?.trim()
  const bucket = process.env.S3_BUCKET?.trim()
  const accessKeyId = process.env.S3_ACCESS_KEY?.trim()
  const secretAccessKey = process.env.S3_SECRET_KEY?.trim()
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null
  return {
    endpoint,
    bucket,
    region: process.env.S3_REGION?.trim() || 'us-east-1',
    accessKeyId,
    secretAccessKey,
  }
}

export function usandoMinio(): boolean {
  return configMinio() !== null
}

let cliente: S3Client | null = null
let claveCliente = ''

function clienteS3(cfg: Config): S3Client {
  const clave = `${cfg.endpoint}|${cfg.region}|${cfg.bucket}|${cfg.accessKeyId}`
  if (!cliente || claveCliente !== clave) {
    cliente = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      // MinIO requiere estilo por path: http://endpoint/bucket/clave
      forcePathStyle: true,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    })
    claveCliente = clave
  }
  return cliente
}

function configObligatoria(): Config {
  const cfg = configMinio()
  if (!cfg) throw new Error('MinIO no está configurado (faltan variables S3_*)')
  return cfg
}

// Las claves son las mismas rutas relativas que ya había en la base, con '/'
// como separador. Rechazamos cualquier intento de salirse del bucket.
export function claveSegura(relativa: string): string {
  const clave = relativa.replace(/\\/g, '/').replace(/^\.\//, '')
  const partes = clave.split('/')
  if (
    !clave ||
    clave.startsWith('/') ||
    /^[A-Za-z]:/.test(clave) ||
    partes.some((parte) => parte === '' || parte === '.' || parte === '..')
  ) {
    throw new Error('Ruta de documento fuera del directorio de subidas')
  }
  return clave
}

// Usado por el chequeo admin: prueba credenciales y conectividad desde el propio contenedor.
export async function minioListarBuckets(): Promise<string[]> {
  const cfg = configObligatoria()
  const res = await clienteS3(cfg).send(new ListBucketsCommand({}))
  return (res.Buckets ?? []).map((bucket) => bucket.Name ?? '')
}

export async function minioGuardar(
  relativa: string,
  buffer: Buffer,
  contentType = 'application/pdf'
): Promise<void> {
  const cfg = configObligatoria()
  await clienteS3(cfg).send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: claveSegura(relativa),
      Body: buffer,
      ContentType: contentType,
      ContentLength: buffer.length,
    })
  )
}

export async function minioLeer(relativa: string): Promise<Buffer> {
  const cfg = configObligatoria()
  const res = await clienteS3(cfg).send(
    new GetObjectCommand({ Bucket: cfg.bucket, Key: claveSegura(relativa) })
  )
  if (!res.Body) throw new Error(`MinIO devolvió un cuerpo vacío para "${relativa}"`)
  return Buffer.from(await res.Body.transformToByteArray())
}

export async function minioBorrar(relativa: string): Promise<void> {
  const cfg = configObligatoria()
  try {
    await clienteS3(cfg).send(
      new DeleteObjectCommand({ Bucket: cfg.bucket, Key: claveSegura(relativa) })
    )
  } catch {
    // S3 es idempotente al borrar: un objeto que ya no está no es un error.
  }
}

export async function minioBorrarCarpeta(prefijo: string): Promise<void> {
  const cfg = configObligatoria()
  const prefijoSeguro = `${claveSegura(prefijo)}/`
  const s3 = clienteS3(cfg)
  let continuationToken: string | undefined

  do {
    const listado = await s3.send(
      new ListObjectsV2Command({
        Bucket: cfg.bucket,
        Prefix: prefijoSeguro,
        ContinuationToken: continuationToken,
      })
    )
    const objetos = (listado.Contents ?? [])
      .map((objeto) => objeto.Key)
      .filter((key): key is string => Boolean(key))
      .map((Key) => ({ Key }))

    if (objetos.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({ Bucket: cfg.bucket, Delete: { Objects: objetos } })
      )
    }
    continuationToken = listado.NextContinuationToken
  } while (continuationToken)
}
