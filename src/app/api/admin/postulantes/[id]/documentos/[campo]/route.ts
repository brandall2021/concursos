import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolverArchivo, CAMPOS_DOCUMENTO, NOMBRES_DOCUMENTO, type CampoDocumento } from '@/lib/uploads'

const CAMPO_A_PATH: Record<CampoDocumento, 'solicitudPath' | 'dniPath' | 'cvPath' | 'antecedentesPath'> = {
  solicitud: 'solicitudPath',
  dniArchivo: 'dniPath',
  cv: 'cvPath',
  antecedentes: 'antecedentesPath',
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; campo: string }> }
) {
  const session = await auth()
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

  const { id, campo } = await context.params
  if (!CAMPOS_DOCUMENTO.includes(campo as CampoDocumento)) {
    return new NextResponse('Documento no válido', { status: 400 })
  }

  const postulante = await prisma.postulante.findUnique({ where: { id } })
  if (!postulante) return new NextResponse('No encontrado', { status: 404 })

  const relativa = postulante[CAMPO_A_PATH[campo as CampoDocumento]]
  const ruta = resolverArchivo(relativa)

  try {
    const buffer = await readFile(ruta)
    const nombre = `${postulante.dni}-${campo}.pdf`
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nombre}"`,
        'X-Documento': NOMBRES_DOCUMENTO[campo as CampoDocumento],
      },
    })
  } catch (e) {
    console.error(`[documentos] No se pudo leer "${ruta}" (UPLOAD_DIR=${process.env.UPLOAD_DIR ?? 'default'}):`, e)
    return new NextResponse('El documento no está disponible en el servidor. Si el contenedor fue reconstruido, configurá un volumen persistente para /app/uploads.', { status: 404 })
  }
}
