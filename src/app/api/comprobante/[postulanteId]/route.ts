import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CARGO_LABELS } from '@/lib/concurso-status'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'

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

  const { concurso } = postulante
  const cargo = CARGO_LABELS[concurso.cargo] ?? concurso.cargo

  const qrContent = [
    `Postulante: ${postulante.apellidos}, ${postulante.nombres}`,
    `DNI: ${postulante.dni}`,
    `Expte: ${concurso.numeroExpediente}`,
    `Cargo: ${cargo} (${concurso.dedicacion})`,
    `Inscripto el: ${postulante.fechaInscripcion.toLocaleString('es-AR')}`,
  ].join('\n')

  const qrBuffer = await QRCode.toBuffer(qrContent, { width: 150 })

  const doc = new PDFDocument({ size: 'A4', margin: 60 })
  const chunks: Buffer[] = []

  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  await new Promise<void>((resolve) => {
    doc.on('end', resolve)

    doc.fontSize(20).font('Helvetica-Bold').text('Comprobante de Inscripción', { align: 'center' })
    doc.moveDown(0.3)
    doc.fontSize(11).font('Helvetica').text('Concursos Docentes — Titulares, Asociados y Adjuntos', { align: 'center' })
    doc.moveDown(0.8)
    doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke()
    doc.moveDown()

    doc.fontSize(13).font('Helvetica')
    doc.text(`Apellido y Nombre:  ${postulante.apellidos}, ${postulante.nombres}`)
    doc.text(`DNI:  ${postulante.dni}`)
    doc.text(`Correo electrónico:  ${postulante.email}`)
    doc.moveDown(0.5)
    doc.fontSize(13).font('Helvetica-Bold').text(`Expte. ${concurso.numeroExpediente}`)
    doc.fontSize(12).font('Helvetica').text(`Cargo:  ${cargo} (${concurso.dedicacion})`)
    doc.text(`Disciplina:  ${concurso.disciplina}`)
    if (concurso.area) doc.text(`Área:  ${concurso.area}`)
    if (concurso.catedra) doc.text(`Cátedra:  ${concurso.catedra}`)
    doc.text(`Asignatura:  ${concurso.asignatura}`)
    doc.moveDown(0.5)
    doc.fontSize(11).font('Helvetica').text(
      `Fecha de inscripción:  ${postulante.fechaInscripcion.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`
    )
    doc.moveDown(1)
    doc.fontSize(9).font('Helvetica').fillColor('#555555').text(
      'La información consignada y la documentación presentada tienen carácter de declaración jurada (art. 9 del Reglamento General de Concursos Docentes).',
      { align: 'center' }
    )
    doc.fillColor('black')
    doc.moveDown(1)
    doc.image(qrBuffer, { fit: [140, 140], align: 'center' })
    doc.end()
  })

  const pdfBuffer = Buffer.concat(chunks)

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="comprobante-${postulante.dni}.pdf"`,
    },
  })
}
