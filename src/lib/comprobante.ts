import { readFile } from 'node:fs/promises'
import path from 'node:path'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { CARGO_LABELS } from './concurso-status'
import { URL_PORTAL } from './institucion'
import { fechaHoraArg } from './fecha'
import { urlComprobante } from './comprobante-firma'

export type ComprobantePostulante = {
  id: string
  codigoInscripcion: string
  apellidos: string
  nombres: string
  dni: string
  email: string
  fechaInscripcion: Date
  concurso: {
    numeroExpediente: string
    cargo: string
    dedicacion: string
    disciplina: string | null
    area: string | null
    catedra: string | null
    asignatura: string | null
  }
}

async function leerLogo(): Promise<Buffer | null> {
  const candidatos = [
    path.join(process.cwd(), 'public', 'logo-header-dark.png'),
    path.join(process.cwd(), '.next', 'standalone', 'public', 'logo-header-dark.png'),
  ]
  for (const p of candidatos) {
    try {
      return await readFile(/* turbopackIgnore: true */ p)
    } catch {
      // continuar
    }
  }
  return null
}

export function construirContenidoQr(postulante: ComprobantePostulante, baseUrl?: string): string {
  const cargo = CARGO_LABELS[postulante.concurso.cargo] ?? postulante.concurso.cargo
  const lineas = [
    `ID inscripción: ${postulante.codigoInscripcion}`,
    `Postulante: ${postulante.apellidos}, ${postulante.nombres}`,
    `DNI: ${postulante.dni}`,
    `Expte: ${postulante.concurso.numeroExpediente}`,
    `Cargo: ${cargo} (${postulante.concurso.dedicacion})`,
    `Inscripto el: ${fechaHoraArg(postulante.fechaInscripcion)}`,
  ]
  if (baseUrl) {
    lineas.push(`Comprobante: ${urlComprobante(postulante.id, baseUrl)}`)
  }
  lineas.push(`Concursos Docentes FACE: ${URL_PORTAL}`)
  return lineas.join('\n')
}

export async function generarComprobantePdf(
  postulante: ComprobantePostulante,
  opciones: { baseUrl?: string } = {}
): Promise<Buffer> {
  const { concurso } = postulante
  const cargo = CARGO_LABELS[concurso.cargo] ?? concurso.cargo

  const qrBuffer = await QRCode.toBuffer(construirContenidoQr(postulante, opciones.baseUrl), { width: 150 })
  const logoBuffer = await leerLogo()

  const doc = new PDFDocument({ size: 'A4', margin: 60 })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  await new Promise<void>((resolve) => {
    doc.on('end', resolve)

    if (logoBuffer) {
      const bandaAlto = 90
      doc.rect(0, 0, doc.page.width, bandaAlto).fill('#1f3763')
      doc.image(logoBuffer, 60, 22, { fit: [300, bandaAlto - 44], align: 'center', valign: 'center' })
      doc.fillColor('black')
      doc.y = bandaAlto + 30
    }

    doc.fontSize(20).font('Helvetica-Bold').text('Comprobante de Inscripción', { align: 'center' })
    doc.moveDown(0.3)
    doc.fontSize(11).font('Helvetica').text('Concursos Docentes — Titulares, Asociados y Adjuntos', { align: 'center' })
    doc.moveDown(0.8)
    doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke()
    doc.moveDown()

    // Es el identificador que lee el Departamento Concursos; va arriba y en grande.
    doc.fontSize(15).font('Helvetica-Bold').fillColor('#1f3763')
    doc.text(`ID de inscripción:  ${postulante.codigoInscripcion}`, { align: 'center' })
    doc.fillColor('black')
    doc.moveDown(0.6)

    doc.fontSize(13).font('Helvetica')
    doc.text(`Apellido y Nombre:  ${postulante.apellidos}, ${postulante.nombres}`)
    doc.text(`DNI:  ${postulante.dni}`)
    doc.text(`Correo electrónico:  ${postulante.email}`)
    doc.moveDown(0.5)
    doc.fontSize(13).font('Helvetica-Bold').text(`Expte. ${concurso.numeroExpediente}`)
    doc.fontSize(12).font('Helvetica').text(`Cargo:  ${cargo} (${concurso.dedicacion})`)
    if (concurso.disciplina) doc.text(`Disciplina:  ${concurso.disciplina}`)
    if (concurso.area) doc.text(`Área:  ${concurso.area}`)
    if (concurso.catedra) doc.text(`Cátedra:  ${concurso.catedra}`)
    if (concurso.asignatura) doc.text(`Asignatura:  ${concurso.asignatura}`)
    doc.moveDown(0.5)
    doc.fontSize(11).font('Helvetica').text(
      `Fecha de inscripción:  ${fechaHoraArg(postulante.fechaInscripcion)}`
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

  return Buffer.concat(chunks)
}
