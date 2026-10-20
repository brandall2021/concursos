import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { excedido, ipCliente } from './rate-limit'

beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllEnvs())

describe('excedido', () => {
  it('permite hasta el máximo y después bloquea', async () => {
    vi.stubEnv('RATE_LIMIT_MAX', '3')
    const { excedido: limitar } = await import('./rate-limit')
    const clave = 'inscripcion:10.0.0.1'

    expect(limitar(clave)).toBe(false)
    expect(limitar(clave)).toBe(false)
    expect(limitar(clave)).toBe(false)
    expect(limitar(clave)).toBe(true)
  })

  it('cuenta cada clave por separado', async () => {
    vi.stubEnv('RATE_LIMIT_MAX', '1')
    const { excedido: limitar } = await import('./rate-limit')
    expect(limitar('inscripcion:1.1.1.1')).toBe(false)
    expect(limitar('inscripcion:2.2.2.2')).toBe(false)
    expect(limitar('inscripcion:1.1.1.1')).toBe(true)
  })
})

describe('ipCliente', () => {
  it('toma la primera IP de x-forwarded-for', () => {
    const h = new Headers({ 'x-forwarded-for': '200.1.2.3, 10.0.0.1' })
    expect(ipCliente(h)).toBe('200.1.2.3')
  })

  it('caída a x-real-ip y a un valor fijo si no hay encabezados', () => {
    expect(ipCliente(new Headers({ 'x-real-ip': '192.168.1.9' }))).toBe('192.168.1.9')
    expect(ipCliente(new Headers())).toBe('desconocida')
  })

  it('recorta encabezados largos', () => {
    expect(ipCliente(new Headers({ 'x-forwarded-for': 'A'.repeat(500) }))).toHaveLength(100)
  })
})
