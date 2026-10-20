import { describe, it, expect, vi, afterEach } from 'vitest'
import { validarPdf, formatearBytes, LIMITES } from './uploads'

function fakeFile(name: string, type: string, size: number): File {
  return { name, type, size } as unknown as File
}

afterEach(() => vi.unstubAllEnvs())

describe('validarPdf', () => {
  it('rejects missing file', () => {
    const result = validarPdf(null, 'solicitud')
    expect(result.ok).toBe(false)
  })

  it('rejects empty file', () => {
    const result = validarPdf(fakeFile('a.pdf', 'application/pdf', 0), 'solicitud')
    expect(result.ok).toBe(false)
  })

  it('rejects non-pdf', () => {
    const result = validarPdf(fakeFile('a.docx', 'application/msword', 100), 'cv')
    expect(result.ok).toBe(false)
  })

  it('accepts pdf by extension', () => {
    const result = validarPdf(fakeFile('a.PDF', '', 100), 'cv')
    expect(result.ok).toBe(true)
  })

  it('rejects solicitud over 10MB', () => {
    const result = validarPdf(fakeFile('a.pdf', 'application/pdf', LIMITES.solicitud + 1), 'solicitud')
    expect(result.ok).toBe(false)
  })

  it('accepts cv up to 100MB', () => {
    const result = validarPdf(fakeFile('a.pdf', 'application/pdf', LIMITES.cv), 'cv')
    expect(result.ok).toBe(true)
  })
})

describe('formatearBytes', () => {
  it('formats whole megabytes', () => {
    expect(formatearBytes(10 * 1024 * 1024)).toBe('10 MB')
    expect(formatearBytes(100 * 1024 * 1024)).toBe('100 MB')
  })
})
