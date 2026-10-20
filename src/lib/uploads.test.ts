import { describe, it, expect, vi, afterEach } from 'vitest'
import path from 'node:path'
import { validarPdf, formatearBytes, resolverArchivo, LIMITES } from './uploads'

function fakeFile(name: string, type: string, size: number): File {
  return { name, type, size, slice: () => ({ arrayBuffer: async () => new TextEncoder().encode('%PDF-1.4').buffer }) } as unknown as File
}

function realPdf(name = 'a.pdf', type = 'application/pdf'): File {
  return new File(['%PDF-1.4\n1 0 obj'], name, { type })
}

afterEach(() => vi.unstubAllEnvs())

describe('validarPdf', () => {
  it('rejects missing file', async () => {
    expect((await validarPdf(null, 'solicitud')).ok).toBe(false)
  })

  it('rejects empty file', async () => {
    expect((await validarPdf(fakeFile('a.pdf', 'application/pdf', 0), 'solicitud')).ok).toBe(false)
  })

  it('rejects non-pdf', async () => {
    expect((await validarPdf(fakeFile('a.docx', 'application/msword', 100), 'cv')).ok).toBe(false)
  })

  it('accepts a real pdf', async () => {
    expect((await validarPdf(realPdf(), 'cv')).ok).toBe(true)
  })

  it('rejects a pdf renamed from another binary', async () => {
    const disfrazado = new File(['MZ\x90\x00'], 'cv.pdf', { type: 'application/pdf' })
    expect((await validarPdf(disfrazado, 'cv')).ok).toBe(false)
  })

  it('rejects solicitud over 10MB', async () => {
    expect((await validarPdf(fakeFile('a.pdf', 'application/pdf', LIMITES.solicitud + 1), 'solicitud')).ok).toBe(false)
  })

  it('accepts cv up to 100MB', async () => {
    expect((await validarPdf(fakeFile('a.pdf', 'application/pdf', LIMITES.cv), 'cv')).ok).toBe(true)
  })
})

describe('resolverArchivo', () => {
  const base = process.platform === 'win32' ? 'C:\\srv\\uploads' : '/srv/uploads'

  it('resuelve rutas dentro del directorio de subidas', () => {
    vi.stubEnv('UPLOAD_DIR', base)
    expect(resolverArchivo(path.join('abc', 'cv.pdf'))).toBe(path.join(base, 'abc', 'cv.pdf'))
  })

  it('rechaza rutas que escapan del directorio de subidas', () => {
    vi.stubEnv('UPLOAD_DIR', base)
    expect(() => resolverArchivo('../../etc/passwd')).toThrow()
    expect(() => resolverArchivo(process.platform === 'win32' ? 'C:\\Windows\\win.ini' : '/etc/passwd')).toThrow()
  })
})

describe('formatearBytes', () => {
  it('formats whole megabytes', () => {
    expect(formatearBytes(10 * 1024 * 1024)).toBe('10 MB')
    expect(formatearBytes(100 * 1024 * 1024)).toBe('100 MB')
  })
})
