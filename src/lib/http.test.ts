import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { celdaCsv, nombreArchivoSeguro, cabeceraDescarga } from './http'
import { firmaComprobante, firmaValida } from './comprobante-firma'

describe('celdaCsv', () => {
  it('neutraliza fórmulas que Excel ejecutaría', () => {
    expect(celdaCsv('=HYPERLINK("http://evil","clic")')).toBe('"\'=HYPERLINK(""http://evil"",""clic"")"')
    expect(celdaCsv('+1-2')).toBe('"\'+1-2"')
    expect(celdaCsv('-5')).toBe('"\'-5"')
    expect(celdaCsv('@SUM(1+1)')).toBe('"\'@SUM(1+1)"')
    expect(celdaCsv('\t123')).toBe('"\'\t123"')
  })

  it('deja intactos los valores comunes y duplica las comillas', () => {
    expect(celdaCsv('Pérez')).toBe('"Pérez"')
    expect(celdaCsv('ana@example.com')).toBe('"ana@example.com"')
    expect(celdaCsv("O'Brien")).toBe('"O\'Brien"')
    expect(celdaCsv('día "raro"')).toBe('"día ""raro"""')
  })
})

describe('nombreArchivoSeguro', () => {
  it('neutraliza comillas y saltos de línea del nombre', () => {
    expect(nombreArchivoSeguro('RES-123"\r\nX-Evil: 1.csv')).toBe('RES-123  X-Evil_ 1.csv')
  })

  it('no deja el nombre vacío', () => {
    expect(nombreArchivoSeguro('"""')).toBe('archivo')
  })

  it('arma la cabecera de descarga entrecomillada', () => {
    expect(cabeceraDescarga('postulantes-RES 100.csv')).toBe('attachment; filename="postulantes-RES 100.csv"')
  })
})

describe('firmaComprobante', () => {
  beforeEach(() => vi.stubEnv('AUTH_SECRET', 'un-secreto-de-prueba'))
  afterEach(() => vi.unstubAllEnvs())

  it('valida la firma del propio id', () => {
    const id = '0f1c2b3a-4444-5555-6666-777788889999'
    expect(firmaValida(id, firmaComprobante(id))).toBe(true)
  })

  it('rechaza firma ausente, mal formada o de otro id', () => {
    const id = '0f1c2b3a-4444-5555-6666-777788889999'
    expect(firmaValida(id, null)).toBe(false)
    expect(firmaValida(id, 'no-es-hex')).toBe(false)
    expect(firmaValida(id, firmaComprobante('otro-id'))).toBe(false)
  })
})
