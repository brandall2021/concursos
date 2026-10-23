import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockCreate,
  mockUpdate,
  mockFindUnique,
  mockDelete,
  mockGuardarPdf,
  mockBorrarPdf,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockFindUnique: vi.fn(),
  mockDelete: vi.fn(),
  mockGuardarPdf: vi.fn(),
  mockBorrarPdf: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

vi.mock('@/lib/guards', () => ({ requireAdmin: vi.fn().mockResolvedValue(null) }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    concurso: {
      create: mockCreate,
      update: mockUpdate,
      findUnique: mockFindUnique,
      delete: mockDelete,
    },
  },
}))

vi.mock('@/lib/uploads', async () => {
  const actual = await vi.importActual<typeof import('@/lib/uploads')>('@/lib/uploads')
  return {
    ...actual,
    guardarPdf: mockGuardarPdf,
    borrarPdf: mockBorrarPdf,
  }
})

import { createConcurso, updateConcurso } from './concursos'

const pdf = (nombre = 'resolucion.pdf') =>
  ({
    name: nombre,
    type: 'application/pdf',
    size: 100,
    slice: () => ({ arrayBuffer: async () => new TextEncoder().encode('%PDF-1.4').buffer }),
  }) as unknown as File

// Formulario completo sin la resolucion: los unicos campos obligatorios del llamado.
function makeFormData(overrides: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    numeroExpediente: '12345/2026',
    cargo: 'Titular',
    dedicacion: 'Semiexclusiva',
    fechaApertura: '2026-11-01T09:00',
    fechaCierre: '2026-11-20T09:00',
    ...overrides,
  }
  return {
    get: (key: string) => base[key] ?? null,
  } as unknown as FormData
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreate.mockImplementation(async ({ data }: any) => ({ id: 'con-1', ...data }))
  mockUpdate.mockResolvedValue({ id: 'con-1' })
  mockFindUnique.mockResolvedValue({ id: 'con-1', resolucionPath: 'resoluciones/con-1-1.pdf' })
  mockGuardarPdf.mockResolvedValue(undefined)
  mockBorrarPdf.mockResolvedValue(undefined)
  mockDelete.mockResolvedValue({})
})

describe('createConcurso', () => {
  it('crea el llamado sin disciplina, area, catedra ni asignatura', async () => {
    await createConcurso(makeFormData())
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        numeroExpediente: '12345/2026',
        disciplina: null,
        area: null,
        catedra: null,
        asignatura: null,
      }),
      select: { id: true, numeroExpediente: true },
    })
  })

  it('guarda la resolucion y registra su ruta en la fila', async () => {
    await createConcurso(makeFormData({ resolucion: pdf('Resolucion 0432-2026.pdf') }))
    expect(mockGuardarPdf).toHaveBeenCalledTimes(1)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'con-1' },
      data: {
        resolucionPath: expect.stringContaining('con-1'),
        resolucionNombre: 'Resolucion 0432-2026.pdf',
      },
    })
  })

  it('no deja el llamado creado si el PDF no se pudo escribir', async () => {
    mockGuardarPdf.mockRejectedValueOnce(new Error('disco lleno'))
    const resultado = await createConcurso(makeFormData({ resolucion: pdf() }))
    expect(resultado).toEqual({ error: expect.stringContaining('UPLOAD_DIR') })
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'con-1' } })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rechaza una resolucion que no es PDF antes de crear nada', async () => {
    const resultado = await createConcurso(
      makeFormData({ resolucion: { name: 'nota.txt', type: 'text/plain', size: 10, slice: () => ({ arrayBuffer: async () => new Uint8Array(10).buffer }) } })
    )
    expect(resultado).toEqual({ error: expect.stringContaining('PDF') })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('sigue exigiendo expediente, cargo y dedicacion', async () => {
    expect(await createConcurso(makeFormData({ numeroExpediente: '' }))).toEqual({
      error: expect.stringContaining('obligatorios'),
    })
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('updateConcurso', () => {
  it('reemplaza el PDF y borra la version anterior', async () => {
    await updateConcurso('con-1', makeFormData({ resolucion: pdf('nueva.pdf') }))
    expect(mockGuardarPdf).toHaveBeenCalledTimes(1)
    expect(mockBorrarPdf).toHaveBeenCalledWith('resoluciones/con-1-1.pdf')
  })

  it('quita la resolucion sólo si el formulario marca la casilla', async () => {
    await updateConcurso('con-1', makeFormData({ quitarResolucion: 'on' }))
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'con-1' },
      data: { resolucionPath: null, resolucionNombre: null },
    })
    expect(mockBorrarPdf).toHaveBeenCalledWith('resoluciones/con-1-1.pdf')
  })

  it('un formulario sin archivo no toca la resolucion cargada', async () => {
    await updateConcurso('con-1', makeFormData())
    expect(mockBorrarPdf).not.toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('no escribe disco si el concurso no existe', async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    expect(await updateConcurso('con-x', makeFormData({ resolucion: pdf() }))).toEqual({
      error: expect.stringContaining('no existe'),
    })
    expect(mockGuardarPdf).not.toHaveBeenCalled()
  })
})
