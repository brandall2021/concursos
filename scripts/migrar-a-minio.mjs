// Sube a MinIO los PDFs que hoy están en UPLOAD_DIR, manteniendo exactamente
// las mismas claves relativas que ya están registradas en la base de datos.
// Uso: node scripts/migrar-a-minio.mjs   (con las variables S3_* y UPLOAD_DIR cargadas)
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import {
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const required = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'UPLOAD_DIR']
const faltan = required.filter((name) => !process.env[name])
if (faltan.length) {
  console.error('Faltan variables de entorno:', faltan.join(', '))
  process.exit(1)
}

const bucket = process.env.S3_BUCKET
const opciones = {
  region: process.env.S3_REGION ?? 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
}

// S3_ENDPOINT admite varias URLs separadas por coma; se usa la primera que responde.
let s3
for (const endpoint of process.env.S3_ENDPOINT.split(',').map((u) => u.trim()).filter(Boolean)) {
  const candidato = new S3Client({ ...opciones, endpoint })
  try {
    await candidato.send(new ListBucketsCommand({}))
    s3 = candidato
    console.log(`Usando endpoint ${endpoint}`)
    break
  } catch (error) {
    console.error(`Endpoint ${endpoint} no disponible:`, error.message)
  }
}
if (!s3) {
  console.error('No se pudo conectar con ningún endpoint S3')
  process.exit(1)
}

async function asegurarBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }))
    console.log(`Bucket "${bucket}" ya existe.`)
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }))
    console.log(`Bucket "${bucket}" creado.`)
  }
}

async function* archivosEn(directorio) {
  for (const entrada of await readdir(directorio, { withFileTypes: true })) {
    const completo = path.join(directorio, entrada.name)
    if (entrada.isDirectory()) yield* archivosEn(completo)
    else if (entrada.isFile()) yield completo
  }
}

await asegurarBucket()

const raiz = path.resolve(process.env.UPLOAD_DIR)
let subidos = 0
let existentes = 0

for await (const archivo of archivosEn(raiz)) {
  const clave = path.relative(raiz, archivo).split(path.sep).join('/')
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: clave }))
    existentes++
    continue
  } catch {
    // No existe en el bucket: se sube abajo.
  }
  const info = await stat(archivo)
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: clave,
      Body: await readFile(archivo),
      ContentType: 'application/pdf',
      ContentLength: info.size,
    })
  )
  subidos++
  console.log(`  subido: ${clave}`)
}

console.log(`Listo. ${subidos} archivos subidos, ${existentes} ya estaban en MinIO.`)
