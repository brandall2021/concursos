import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CARGO_LABELS } from '@/lib/concurso-status'
import { cabeceraDescarga, celdaCsv } from '@/lib/http'
import PDFDocument from 'pdfkit'

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return new NextResponse('Unauthorized', { status: 401 })

  const { id } = await context.params
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') ?? 'csv'

  if (format !== 'csv' && format !== 'pdf') {
    return new NextResponse('Formato no soportado', { status: 400 })
  }

  const concurso = await prisma.concurso.findUnique({
    where: { id },
    include: {
      postulantes: { orderBy: { fechaInscripcion: 'asc' } },
    },
  })

  if (!concurso) return new NextResponse('No encontrado', { status: 404 })

  const cargo = CARGO_LABELS[concurso.cargo] ?? concurso.cargo

  if (format === 'csv') {
    const header = 'Apellido/s,Nombre/s,DNI,Correo electrónico,Fecha de inscripción\n'
    const rows = concurso.postulantes
      .map((p) =>
        [
          celdaCsv(p.apellidos),
          celdaCsv(p.nombres),
          celdaCsv(p.dni),
          celdaCsv(p.email),
          celdaCsv(p.fechaInscripcion.toLocaleString('es-AR')),
        ].join(',')
      )
      .join('\n')

    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': cabeceraDescarga(`postulantes-${concurso.numeroExpediente}.csv`),
      },
    })
  }

  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  await new Promise<void>((resolve, reject) => {
    doc.on('end', resolve)
    doc.on('error', reject)

    doc.fontSize(16).font('Helvetica-Bold').text('Postulantes', { align: 'center' })
    doc.moveDown(0.2)
    doc.fontSize(11).font('Helvetica').text(
      `Expte. ${concurso.numeroExpediente} — ${cargo} (${concurso.dedicacion})`,
      { align: 'center' }
    )
    doc.fontSize(9).font('Helvetica').text(
      `Exportado el ${new Date().toLocaleString('es-AR')} | Total: ${concurso.postulantes.length}`,
      { align: 'center' }
    )
    doc.moveDown()
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(0.5)

    const colX = [50, 200, 320, 420]
    doc.fontSize(10).font('Helvetica-Bold')
    doc.text('Apellido/s', colX[0], doc.y, { width: 145, continued: true })
    doc.text('Nombre/s', colX[1], doc.y, { width: 115, continued: true })
    doc.text('DNI', colX[2], doc.y, { width: 95, continued: true })
    doc.text('Fecha inscripción', colX[3], doc.y)
    doc.moveDown(0.3)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(0.3)

    doc.fontSize(9).font('Helvetica')
    for (const p of concurso.postulantes) {
      const y = doc.y
      doc.text(p.apellidos, colX[0], y, { width: 145, continued: true })
      doc.text(p.nombres, colX[1], y, { width: 115, continued: true })
      doc.text(p.dni, colX[2], y, { width: 95, continued: true })
      doc.text(new Date(p.fechaInscripcion).toLocaleDateString('es-AR'), colX[3], y)
      doc.moveDown(0.2)
    }

    doc.end()
  })

  return new NextResponse(Buffer.concat(chunks), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': cabeceraDescarga(`postulantes-${concurso.numeroExpediente}.pdf`),
    },
  })
}
