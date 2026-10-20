import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generarComprobantePdf } from '@/lib/comprobante'

export async function GET(
  _req: Request,
  context: { params: Promise<{ postulanteId: string }> }
) {
  const { postulanteId } = await context.params
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
      'Content-Disposition': `attachment; filename="comprobante-${postulante.dni}.pdf"`,
    },
  })
}
