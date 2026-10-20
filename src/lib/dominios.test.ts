import { describe, it, expect, vi, afterEach } from 'vitest'
import { dominioPermitido, dominiosPermitidos } from './dominios'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('dominiosPermitidos', () => {
  it('parsea, recorta y normaliza la lista', () => {
    vi.stubEnv('AUTH_ALLOWED_DOMAINS', ' UNT.edu.ar , edu.ar ,, ')
    expect(dominiosPermitidos()).toEqual(['unt.edu.ar', 'edu.ar'])
  })

  it('devuelve vacío si la variable no está', () => {
    vi.stubEnv('AUTH_ALLOWED_DOMAINS', '')
    expect(dominiosPermitidos()).toEqual([])
  })
})

describe('dominioPermitido', () => {
  it('sin lista configurada no restringe nada', () => {
    vi.stubEnv('AUTH_ALLOWED_DOMAINS', '')
    expect(dominioPermitido('cualquiera@example.com')).toBe(true)
  })

  it('acepta el dominio exacto', () => {
    vi.stubEnv('AUTH_ALLOWED_DOMAINS', 'unt.edu.ar')
    expect(dominioPermitido('ana@unt.edu.ar')).toBe(true)
  })

  it('acepta subdominios de la raíz permitida', () => {
    vi.stubEnv('AUTH_ALLOWED_DOMAINS', 'unt.edu.ar,edu.ar')
    expect(dominioPermitido('cpereyra@face.unt.edu.ar')).toBe(true)
    expect(dominioPermitido('CONCURSOS@FACE.UNT.EDU.AR')).toBe(true)
  })

  it('rechaza dominios ajenos', () => {
    vi.stubEnv('AUTH_ALLOWED_DOMAINS', 'unt.edu.ar')
    expect(dominioPermitido('ana@gmail.com')).toBe(false)
    expect(dominioPermitido('ana@fi.uba.ar')).toBe(false)
  })

  it('no deja pasar sufijos fingidos', () => {
    vi.stubEnv('AUTH_ALLOWED_DOMAINS', 'unt.edu.ar')
    expect(dominioPermitido('ana@unt.edu.ar.evil.com')).toBe(false)
    expect(dominioPermitido('ana@notunt.edu.ar')).toBe(false)
  })

  it('rechaza un email sin dominio', () => {
    vi.stubEnv('AUTH_ALLOWED_DOMAINS', 'unt.edu.ar')
    expect(dominioPermitido('sin-arroba')).toBe(false)
  })
})
