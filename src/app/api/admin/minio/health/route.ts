import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { configMinio, minioListarBuckets } from '@/lib/minio'

// Diagnóstico: permite probar S3_ENDPOINT desde dentro del contenedor de la app,
// donde resuelven los nombres internos de Docker que no existen fuera de la red.
export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return new NextResponse('Unauthorized', { status: 401 })

  const cfg = configMinio()
  if (!cfg) {
    return NextResponse.json({ ok: false, error: 'Faltan variables S3_*' }, { status: 400 })
  }

  try {
    const buckets = await minioListarBuckets()
    return NextResponse.json({
      ok: true,
      endpoint: cfg.endpoint,
      bucket: cfg.bucket,
      buckets,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: cfg.endpoint,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    )
  }
}
