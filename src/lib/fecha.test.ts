import { describe, it, expect } from 'vitest'
import { aFechaHoraLocalArg, fechaArg, fechaHoraArg, parsearFechaHoraArg } from './fecha'

describe('parsearFechaHoraArg', () => {
  it('toma la hora del formulario como hora argentina, sin importar la zona del navegador', () => {
    // 09:00 ART son las 12:00 UTC
    expect(parsearFechaHoraArg('2026-11-01T09:00')?.toISOString()).toBe('2026-11-01T12:00:00.000Z')
  })

  it('rechaza lo que no trae el formato del input', () => {
    expect(parsearFechaHoraArg('')).toBeNull()
    expect(parsearFechaHoraArg('hola')).toBeNull()
    expect(parsearFechaHoraArg('2026-11-01')).toBeNull()
    expect(parsearFechaHoraArg('2026-11-01T09:00:30')).toBeNull()
  })

  it('rechaza un calendario imposible', () => {
    expect(parsearFechaHoraArg('2026-99-99T09:00')).toBeNull()
  })
})

describe('aFechaHoraLocalArg', () => {
  it('devuelve la hora argentina para precargar el input', () => {
    expect(aFechaHoraLocalArg(new Date('2026-11-01T12:00:00Z'))).toBe('2026-11-01T09:00')
  })

  it('no deja la medianoche como 24:00', () => {
    expect(aFechaHoraLocalArg(new Date('2026-11-01T03:00:00Z'))).toBe('2026-11-01T00:00')
  })

  it('cierra el ciclo con parsearFechaHoraArg', () => {
    for (const hora of ['00:00', '09:00', '23:30']) {
      const texto = `2026-11-01T${hora}`
      expect(aFechaHoraLocalArg(parsearFechaHoraArg(texto) as Date)).toBe(texto)
    }
  })
})

describe('fechaHoraArg y fechaArg', () => {
  it('formatean en hora argentina', () => {
    const fecha = new Date('2026-11-01T12:00:00Z')
    expect(fechaHoraArg(fecha)).toBe('1/11/2026, 09:00:00')
    expect(fechaArg(fecha)).toBe('1/11/2026')
  })

  it('un cambio de ano no depende de la zona del servidor', () => {
    // 21:00 ART del 31/10 siguen siendo 31/10; en UTC ya serian 01/11
    expect(fechaArg(new Date('2026-11-01T00:00:00Z'))).toBe('31/10/2026')
  })
})
