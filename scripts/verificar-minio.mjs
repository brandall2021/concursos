// Diagnóstico: verifica que el endpoint S3/MinIO responda con las credenciales dadas.
// Uso: S3_ENDPOINT=... S3_ACCESS_KEY=... S3_SECRET_KEY=... node scripts/verificar-minio.mjs
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'

const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
})

try {
  const res = await client.send(new ListBucketsCommand({}))
  console.log('Conexión OK. Buckets:', (res.Buckets ?? []).map((b) => b.Name).join(', ') || '(ninguno)')
} catch (error) {
  console.error('Conexión fallida:', error.name, error.message, 'HTTP', error.$metadata?.httpStatusCode)
  if (error.message?.includes('API port')) {
    console.error('S3_ENDPOINT apunta a la consola (9001). Usá el puerto de la API S3 (9000).')
  }
  process.exitCode = 1
}
