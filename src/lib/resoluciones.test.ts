import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { LIMITE_RESOLUCION } from './documentos'
import { nombreDescargaResolucion, rutaResolucionRelativa, validarResolucionPdf } from './resoluciones'

const pdf = (nombre = 'resolucion.pdf', contenido = '%PDF-1.4 simulacion') =>
  new File([contenido], nombre, { type: 'application/pdf' })

describe('rutaResolucionRelativa', () => {
  it('versiona el archivo para que reemplazar no pise el PDF que se esta leyendo', () => {
    expect(rutaResolucionRelativa('con-1', 1700000000000)).toBe(path.join('resoluciones', 'con-1-1700000000000.pdf'))
  })

  it('dos cargas del mismo concurso no comparten ruta', () => {
    expect(rutaResolucionRelativa('con-1', 1)).not.toBe(rutaResolucionRelativa('con-1', 2))
  })
})

describe('nombreDescargaResolucion', () => {
  it('saneja el numero de expediente para la cabecera', () => {
    expect(nombreDescargaResolucion('12345/2026')).toBe('resolucion-12345_2026.pdf')
  })
})

describe('validarResolucionPdf', () => {
  it('acepta un PDF con firma valida y conserva el nombre limpio', async () => {
    const resultado = await validarResolucionPdf(pdf('Resolución 0432-2026.pdf'))
    expect(resultado).toEqual({ ok: true, file: expect.any(File), nombre: 'Resolución 0432-2026.pdf' })
  })

  it('trata la ausencia de archivo como resolucion vacia, no como error', async () => {
    expect(await validarResolucionPdf(null)).toEqual({ ok: true, file: null, nombre: null })
    expect(await validarResolucionPdf('hola')).toEqual({ ok: true, file: null, nombre: null })
    // input de archivo sin seleccionar llega como File de tamano 0
    expect(await validarResolucionPdf(new File([], '', { type: '' }))).toEqual({ ok: true, file: null, nombre: null })
  })

  it('rechaza lo que no es PDF por tipo y extension', async () => {
    const resultado = await validarResolucionPdf(new File(['texto'], 'nota.txt', { type: 'text/plain' }))
    expect(resultado).toEqual({ ok: false, error: expect.stringContaining('PDF') })
  })

  it('rechaza un archivo que simula ser PDF sin la firma', async () => {
    const resultado = await validarResolucionPdf(new File(['NO SOY UN PDF'], 'falso.pdf', { type: 'application/pdf' }))
    expect(resultado).toEqual({ ok: false, error: expect.stringContaining('no es un PDF válido') })
  })

  it('rechaza por encima del limite de tamano', async () => {
    const enorme = new File([new Uint8Array(LIMITE_RESOLUCION + 1)], 'grande.pdf', { type: 'application/pdf' })
    const resultado = await validarResolucionPdf(enorme)
    expect(resultado).toEqual({ ok: false, error: expect.stringContaining('25 MB') })
  })
})
