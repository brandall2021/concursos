import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generarComprobantePdf } from '@/lib/comprobante'
import { firmaValida } from '@/lib/comprobante-firma'
import { cabeceraDescarga } from '@/lib/http'

export async function GET(
  req: Request,
  context: { params: Promise<{ postulanteId: string }> }
) {
  const { postulanteId } = await context.params
  const firma = new URL(req.url).searchParams.get('t')

  if (!firmaValida(postulanteId, firma)) {
    return new NextResponse('Enlace no válido', { status: 401 })
  }

  const postulante = await prisma.postulante.findUnique({
    where: { id: postulanteId },
    include: { concurso: true },
  })

  if (!postulante) {
    return new NextResponse('No encontrado', { status: 404 })
  }

  const pdfBuffer = await generarComprobantePdf(postulante)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': cabeceraDescarga(`comprobante-${postulante.dni}.pdf`),
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'private, no-store',
    },
  })
}
