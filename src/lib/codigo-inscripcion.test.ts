import { describe, it, expect } from 'vitest'
import { LARGO_CODIGO, esColisionDeCodigo, generarCodigoInscripcion } from './codigo-inscripcion'

describe('generarCodigoInscripcion', () => {
  it('devuelve 5 caracteres del alfabeto sin I, L ni O', () => {
    for (let i = 0; i < 200; i++) {
      expect(generarCodigoInscripcion()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/)
    }
  })

  it('usa las 5 posiciones: con 23 letras el espacio es de ~6.4M de codigos', () => {
    expect(LARGO_CODIGO).toBe(5)
    const muestras = Array.from({ length: 500 }, generarCodigoInscripcion)
    expect(new Set(muestras).size).toBe(muestras.length)
  })

  it('no produce siempre el mismo codigo', () => {
    expect(new Set(Array.from({ length: 50 }, generarCodigoInscripcion)).size).toBeGreaterThan(1)
  })
})

describe('esColisionDeCodigo', () => {
  it('reconoce el P2002 del indice del codigo', () => {
    expect(esColisionDeCodigo({ code: 'P2002', meta: { target: 'Postulante.codigoInscripcion' } })).toBe(true)
    expect(esColisionDeCodigo({ code: 'P2002', meta: { target: ['codigoInscripcion'] } })).toBe(true)
  })

  it('no confunde el codigo con el DNI duplicado', () => {
    expect(esColisionDeCodigo({ code: 'P2002', meta: { target: 'Postulante.dni_concursoId' } })).toBe(false)
    expect(esColisionDeCodigo({ code: 'P2002' })).toBe(false)
    expect(esColisionDeCodigo({ code: 'P2003' })).toBe(false)
    expect(esColisionDeCodigo(null)).toBe(false)
  })
})
