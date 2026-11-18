import { afterEach, describe, expect, it, vi } from 'vitest'
import { claveSegura, configMinio, usandoMinio } from './minio'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('claveSegura', () => {
  it('acepta las claves relativas que ya se guardan en la base', () => {
    expect(claveSegura('abc/cv.pdf')).toBe('abc/cv.pdf')
    expect(claveSegura('resultados/con-1-123.pdf')).toBe('resultados/con-1-123.pdf')
  })

  it('normaliza las barras de Windows', () => {
    expect(claveSegura('abc\\cv.pdf')).toBe('abc/cv.pdf')
  })

  it('rechaza rutas que salen del bucket', () => {
    expect(() => claveSegura('../../etc/passwd')).toThrow()
    expect(() => claveSegura('/etc/passwd')).toThrow()
    expect(() => claveSegura('C:\\Windows\\win.ini')).toThrow()
  })
})

describe('configuración de MinIO', () => {
  it('queda desactivada si falta alguna variable', () => {
    expect(configMinio()).toBeNull()
    expect(usandoMinio()).toBe(false)

    vi.stubEnv('S3_ENDPOINT', 'http://minio:9000')
    vi.stubEnv('S3_BUCKET', 'concursos')
    vi.stubEnv('S3_ACCESS_KEY', 'user')
    expect(configMinio()).toBeNull()
  })

  it('se activa con endpoint, bucket y credenciales', () => {
    vi.stubEnv('S3_ENDPOINT', 'http://minio:9000')
    vi.stubEnv('S3_BUCKET', 'concursos')
    vi.stubEnv('S3_ACCESS_KEY', 'user')
    vi.stubEnv('S3_SECRET_KEY', 'secret')
    expect(usandoMinio()).toBe(true)
    expect(configMinio()).toMatchObject({
      endpoints: ['http://minio:9000'],
      bucket: 'concursos',
      region: 'us-east-1',
    })
  })

  it('acepta varias URLs internas separadas por coma', () => {
    vi.stubEnv('S3_ENDPOINT', 'http://10.0.1.20:9000, http://172.24.0.2:9000')
    vi.stubEnv('S3_BUCKET', 'concursos')
    vi.stubEnv('S3_ACCESS_KEY', 'user')
    vi.stubEnv('S3_SECRET_KEY', 'secret')
    expect(configMinio()?.endpoints).toEqual(['http://10.0.1.20:9000', 'http://172.24.0.2:9000'])
  })
})
