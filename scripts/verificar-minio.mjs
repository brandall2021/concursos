// Diagnóstico: verifica que el endpoint S3/MinIO responda con las credenciales dadas.
// Uso: S3_ENDPOINT=... S3_ACCESS_KEY=... S3_SECRET_KEY=... node scripts/verificar-minio.mjs
// S3_ENDPOINT admite varias URLs separadas por coma; se usa la primera que responde.
import { ListBucketsCommand, S3Client } from '@aws-sdk/client-s3'

const endpoints = (process.env.S3_ENDPOINT ?? '').split(',').map((u) => u.trim()).filter(Boolean)
if (!endpoints.length) {
  console.error('Falta S3_ENDPOINT')
  process.exit(1)
}

const opciones = {
  region: process.env.S3_REGION ?? 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
}

for (const endpoint of endpoints) {
  const client = new S3Client({ ...opciones, endpoint })
  try {
    const res = await client.send(new ListBucketsCommand({}))
    console.log(
      'Conexión OK con', endpoint, '- Buckets:',
      (res.Buckets ?? []).map((b) => b.Name).join(', ') || '(ninguno)'
    )
    process.exit(0)
  } catch (error) {
    console.error('Falló', endpoint + ':', error.name, error.message, 'HTTP', error.$metadata?.httpStatusCode)
    if (error.message?.includes('API port')) {
      console.error('Ese endpoint apunta a la consola (9001). Usá el puerto de la API S3 (9000).')
    }
  }
}
process.exit(1)
