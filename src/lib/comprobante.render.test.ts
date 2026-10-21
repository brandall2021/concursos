import { it, expect } from 'vitest'
import { construirContenidoQr, generarComprobantePdf, type ComprobantePostulante } from './comprobante'

const postulante: ComprobantePostulante = {
  id: 'bcb59f3a-1f1a-4c0e-9b3d-2f3c1a5d7e90',
  codigoInscripcion: 'KXMZP',
  apellidos: 'Pérez González',
  nombres: 'Ana María',
  dni: '12345678',
  email: 'ana@example.com',
  fechaInscripcion: new Date('2026-10-21T15:30:00-03:00'),
  concurso: {
    numeroExpediente: 'RES-DGAC-10801/2026',
    cargo: 'Titular',
    dedicacion: 'Exclusiva',
    disciplina: 'Contabilidad',
    area: 'Área Contable',
    catedra: null,
    asignatura: 'Contabilidad Superior',
  },
}

it('el QR empieza con el codigo de inscripcion y cierra con la direccion del portal', () => {
  const qr = construirContenidoQr(postulante)
  const lineas = qr.split('\n')
  expect(lineas[0]).toBe('ID inscripción: KXMZP')
  expect(lineas[lineas.length - 1]).toContain('https://concursos.face-unt.ar')
})

it('sin baseUrl el QR omite el enlace firmado pero conserva el codigo', () => {
  const qr = construirContenidoQr(postulante)
  expect(qr).not.toContain('Comprobante:')
  expect(qr).toContain('ID inscripción:')
})

it('el PDF del comprobante se genera sin errores', async () => {
  const pdf = await generarComprobantePdf(postulante)
  expect(pdf.slice(0, 5).toString()).toBe('%PDF-')
  expect(pdf.length).toBeGreaterThan(1000)
})
