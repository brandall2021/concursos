import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { leerPdf, CAMPOS_DOCUMENTO, NOMBRES_DOCUMENTO, type CampoDocumento } from '@/lib/uploads'
import { cabeceraDescarga } from '@/lib/http'

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
  if (session?.user?.role !== 'ADMIN') return new NextResponse('Unauthorized', { status: 401 })

  const { id, campo } = await context.params
  if (!CAMPOS_DOCUMENTO.includes(campo as CampoDocumento)) {
    return new NextResponse('Documento no válido', { status: 400 })
  }

  const postulante = await prisma.postulante.findUnique({ where: { id } })
  if (!postulante) return new NextResponse('No encontrado', { status: 404 })

  const relativa = postulante[CAMPO_A_PATH[campo as CampoDocumento]]

  let buffer: Buffer
  try {
    buffer = await leerPdf(relativa)
  } catch (e) {
    console.error(`[documentos] No se pudo leer "${relativa}" para el postulante ${id}:`, e)
    return new NextResponse(
      'El documento no está disponible en el almacenamiento configurado.',
      { status: 404 }
    )
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': cabeceraDescarga(`${postulante.dni}-${campo}.pdf`),
      'X-Documento': NOMBRES_DOCUMENTO[campo as CampoDocumento],
      'Cache-Control': 'private, no-store',
    },
  })
}
