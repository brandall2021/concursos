import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFindUnique, mockGuardarPdf } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockGuardarPdf: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/guards', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { role: 'ADMIN' } }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    postulante: { findUnique: mockFindUnique },
  },
}))

vi.mock('@/lib/uploads', async () => {
  const actual = await vi.importActual<typeof import('@/lib/uploads')>('@/lib/uploads')
  return {
    ...actual,
    guardarPdf: mockGuardarPdf,
  }
})

import { subirDocumentoPostulante } from './documentos-postulante'

function archivo(nombre: string, bytes: number): File {
  const contenido = new Uint8Array(bytes)
  contenido.set([0x25, 0x50, 0x44, 0x46, 0x2d]) // firma %PDF-
  return new File([contenido], nombre, { type: 'application/pdf' })
}

describe('subirDocumentoPostulante', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUnique.mockResolvedValue({ concursoId: 'concurso-1' })
    mockGuardarPdf.mockResolvedValue(undefined)
  })

  it('rechaza un campo desconocido', async () => {
    const fd = new FormData()
    fd.set('postulanteId', 'p1')
    fd.set('campo', 'resultado')
    expect((await subirDocumentoPostulante(fd)).ok).toBe(false)
    expect(mockGuardarPdf).not.toHaveBeenCalled()
  })

  it('rechaza si el postulante no existe', async () => {
    mockFindUnique.mockResolvedValue(null)
    const fd = new FormData()
    fd.set('postulanteId', 'p1')
    fd.set('campo', 'cv')
    fd.set('archivo', archivo('a.pdf', 10))
    expect((await subirDocumentoPostulante(fd)).ok).toBe(false)
    expect(mockGuardarPdf).not.toHaveBeenCalled()
  })

  it('rechaza un archivo que no es PDF', async () => {
    const fd = new FormData()
    fd.set('postulanteId', 'p1')
    fd.set('campo', 'cv')
    fd.set('archivo', new File([new Uint8Array(10)], 'a.docx', { type: 'application/msword' }))
    expect((await subirDocumentoPostulante(fd)).ok).toBe(false)
    expect(mockGuardarPdf).not.toHaveBeenCalled()
  })

  it('rechaza un PDF que supera el límite del campo', async () => {
    const fd = new FormData()
    fd.set('postulanteId', 'p1')
    fd.set('campo', 'solicitud')
    fd.set('archivo', archivo('a.pdf', 20 * 1024 * 1024 + 1))
    expect((await subirDocumentoPostulante(fd)).ok).toBe(false)
    expect(mockGuardarPdf).not.toHaveBeenCalled()
  })

  it('guarda en la ruta esperada del postulante', async () => {
    const fd = new FormData()
    fd.set('postulanteId', 'p1')
    fd.set('campo', 'cv')
    fd.set('archivo', archivo('a.pdf', 10))
    const res = await subirDocumentoPostulante(fd)
    expect(res.ok).toBe(true)
    expect(mockGuardarPdf).toHaveBeenCalledTimes(1)
    const [relativa] = mockGuardarPdf.mock.calls[0] as unknown as [string, File]
    expect(relativa.replace(/\\/g, '/')).toBe('p1/cv.pdf')
  })
})
