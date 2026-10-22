import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireAdmin, mockFindUnique, mockUpdate, mockGuardarPdf, mockBorrarPdf } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockGuardarPdf: vi.fn(),
  mockBorrarPdf: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/guards', () => ({ requireAdmin: mockRequireAdmin }))
vi.mock('@/lib/uploads', () => ({ guardarPdf: mockGuardarPdf, borrarPdf: mockBorrarPdf }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    concurso: { findUnique: mockFindUnique, update: mockUpdate },
  },
}))

import { publicarResultado, despublicarResultado } from './resultados'
import { revalidatePath } from 'next/cache'

const CERRADO = {
  id: 'con-1',
  fechaApertura: new Date('2026-01-01'),
  fechaCierre: new Date('2026-02-01'),
  resultadoPath: null,
  resultadoNombre: null,
  resultadoPublicadoEn: null,
}

const pdfValido = () => new File(['%PDF-1.4 resolucion'], 'Resolucion 12-2026.pdf', { type: 'application/pdf' })

function formulario(file: File | null = pdfValido()): FormData {
  const formData = new FormData()
  if (file) formData.set('resultado', file)
  return formData
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue({ user: { id: 'u-1', role: 'ADMIN' } })
  mockFindUnique.mockResolvedValue({ ...CERRADO })
  mockUpdate.mockResolvedValue({})
  mockGuardarPdf.mockResolvedValue(undefined)
  mockBorrarPdf.mockResolvedValue(undefined)
})

describe('publicarResultado', () => {
  it('exige sesion de administrador antes de tocar disco o base', async () => {
    mockRequireAdmin.mockRejectedValueOnce(new Error('NEXT_REDIRECT'))
    await expect(publicarResultado('con-1', formulario())).rejects.toThrow('NEXT_REDIRECT')
    expect(mockGuardarPdf).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rechaza un id vacio sin consultar la base', async () => {
    expect(await publicarResultado('  ', formulario())).toEqual({ success: false, error: expect.any(String) })
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('no escribe sobre un concurso inexistente', async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    expect(await publicarResultado('con-fantasma', formulario())).toEqual({
      success: false,
      error: 'El concurso no existe',
    })
    expect(mockGuardarPdf).not.toHaveBeenCalled()
  })

  it('rechaza publicar un llamado que todavia esta abierto', async () => {
    mockFindUnique.mockResolvedValueOnce({ ...CERRADO, fechaCierre: new Date(Date.now() + 86_400_000) })
    expect(await publicarResultado('con-1', formulario())).toEqual({
      success: false,
      error: expect.stringContaining('cerrado'),
    })
    expect(mockGuardarPdf).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('no deja archivo en disco si el PDF no pasa la validacion', async () => {
    const resultado = await publicarResultado('con-1', formulario(new File(['trampa'], 'falso.pdf', { type: 'application/pdf' })))
    expect(resultado).toEqual({ success: false, error: expect.stringContaining('no es un PDF válido') })
    expect(mockGuardarPdf).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('guarda, registra la publicacion y revalida la grilla y la pagina principal', async () => {
    const resultado = await publicarResultado('con-1', formulario())
    expect(resultado).toEqual({ success: true })

    expect(mockGuardarPdf).toHaveBeenCalledWith(expect.stringContaining('con-1-'), expect.any(File))
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'con-1' },
      data: {
        resultadoPath: expect.stringContaining('con-1-'),
        resultadoNombre: 'Resolucion 12-2026.pdf',
        resultadoPublicadoEn: expect.any(Date),
      },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/concursos')
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('limpia la version anterior despues de reemplazar', async () => {
    mockFindUnique.mockResolvedValueOnce({ ...CERRADO, resultadoPath: 'resultados/con-1-antigua.pdf' })
    await publicarResultado('con-1', formulario())
    expect(mockBorrarPdf).toHaveBeenCalledWith('resultados/con-1-antigua.pdf')
  })

  it('si el update falla borra el archivo nuevo y conserva la version publicada', async () => {
    mockFindUnique.mockResolvedValueOnce({ ...CERRADO, resultadoPath: 'resultados/con-1-antigua.pdf' })
    mockUpdate.mockRejectedValueOnce(new Error('connection lost'))

    const resultado = await publicarResultado('con-1', formulario())
    expect(resultado).toEqual({ success: false, error: expect.stringContaining('No se pudo registrar') })

    const nuevaRuta = mockGuardarPdf.mock.calls[0][0]
    expect(nuevaRuta).not.toBe('resultados/con-1-antigua.pdf')
    expect(mockBorrarPdf).toHaveBeenCalledWith(nuevaRuta)
    expect(mockBorrarPdf).not.toHaveBeenCalledWith('resultados/con-1-antigua.pdf')
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('si la escritura falla no toca la base', async () => {
    mockGuardarPdf.mockRejectedValueOnce(new Error('EROFS'))
    const resultado = await publicarResultado('con-1', formulario())
    expect(resultado).toEqual({ success: false, error: expect.stringContaining('UPLOAD_DIR') })
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockBorrarPdf).not.toHaveBeenCalled()
  })
})

describe('despublicarResultado', () => {
  it('no se puede despublicar lo que no esta publicado', async () => {
    const resultado = await despublicarResultado('con-1')
    expect(resultado).toEqual({ success: false, error: expect.stringContaining('no tiene nada publicado') })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('despublica primero y despues limpia el disco', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'con-1',
      resultadoPath: 'resultados/con-1-1700.pdf',
      resultadoPublicadoEn: new Date('2026-03-01'),
    })

    expect(await despublicarResultado('con-1')).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'con-1' },
      data: { resultadoPath: null, resultadoNombre: null, resultadoPublicadoEn: null },
    })
    expect(mockBorrarPdf).toHaveBeenCalledWith('resultados/con-1-1700.pdf')
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('rechaza id vacio', async () => {
    expect(await despublicarResultado('')).toEqual({ success: false, error: expect.any(String) })
    expect(mockFindUnique).not.toHaveBeenCalled()
  })
})
