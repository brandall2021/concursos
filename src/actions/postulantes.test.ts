import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockFindUniqueConcurso,
  mockFindUniquePostulante,
  mockCreate,
  mockGuardar,
  mockLimpiar,
} = vi.hoisted(() => ({
  mockFindUniqueConcurso: vi.fn(),
  mockFindUniquePostulante: vi.fn(),
  mockCreate: vi.fn(),
  mockGuardar: vi.fn(),
  mockLimpiar: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    concurso: { findUnique: mockFindUniqueConcurso },
    postulante: { findUnique: mockFindUniquePostulante, create: mockCreate },
  },
}))

vi.mock('@/lib/concurso-status', () => ({ isConcursoActivo: vi.fn() }))

vi.mock('@/lib/uploads', async () => {
  const actual = await vi.importActual<typeof import('@/lib/uploads')>('@/lib/uploads')
  return {
    ...actual,
    guardarArchivos: mockGuardar,
    limpiarArchivos: mockLimpiar,
  }
})

import { inscribirPostulante } from './postulantes'
import { isConcursoActivo } from '@/lib/concurso-status'

const pdf = (size = 100) =>
  ({ name: 'doc.pdf', type: 'application/pdf', size, arrayBuffer: async () => new ArrayBuffer(0) }) as unknown as File

function makeFormData(overrides: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    concursoId: 'con-1',
    apellidos: 'Pérez',
    nombres: 'Ana',
    dni: '12345678',
    email: 'ana@example.com',
    declaracion: 'on',
    solicitud: pdf(),
    dniArchivo: pdf(),
    cv: pdf(),
    antecedentes: pdf(),
    ...overrides,
  }
  return {
    get: (key: string) => base[key] ?? null,
  } as unknown as FormData
}

const paths = { solicitud: 'p/solicitud.pdf', dniArchivo: 'p/dni.pdf', cv: 'p/cv.pdf', antecedentes: 'p/antecedentes.pdf' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isConcursoActivo).mockReturnValue(true)
  mockGuardar.mockResolvedValue(paths)
})

describe('inscribirPostulante', () => {
  it('returns error when required identity fields are missing', async () => {
    const result = await inscribirPostulante(makeFormData({ apellidos: '' }))
    expect(result).toEqual({ success: false, error: expect.any(String) })
  })

  it('returns error for invalid DNI', async () => {
    const result = await inscribirPostulante(makeFormData({ dni: 'abc' }))
    expect(result).toEqual({ success: false, error: expect.stringContaining('DNI') })
  })

  it('returns error for invalid email', async () => {
    const result = await inscribirPostulante(makeFormData({ email: 'no-arroba' }))
    expect(result).toEqual({ success: false, error: expect.stringContaining('correo') })
  })

  it('returns error when declaracion is not accepted', async () => {
    const result = await inscribirPostulante(makeFormData({ declaracion: null }))
    expect(result).toEqual({ success: false, error: expect.stringContaining('declaraciones') })
  })

  it('returns error when a document is missing', async () => {
    const result = await inscribirPostulante(makeFormData({ cv: null }))
    expect(result).toEqual({ success: false, error: expect.stringContaining('Currículum') })
    expect(mockGuardar).not.toHaveBeenCalled()
  })

  it('returns error when concurso not found', async () => {
    mockFindUniqueConcurso.mockResolvedValueOnce(null)
    const result = await inscribirPostulante(makeFormData())
    expect(result).toEqual({ success: false, error: expect.stringContaining('no encontrado') })
  })

  it('returns error when concurso is not active', async () => {
    mockFindUniqueConcurso.mockResolvedValueOnce({ id: 'con-1' })
    vi.mocked(isConcursoActivo).mockReturnValueOnce(false)
    const result = await inscribirPostulante(makeFormData())
    expect(result).toEqual({ success: false, error: expect.stringContaining('no está disponible') })
  })

  it('returns error when DNI already registered', async () => {
    mockFindUniqueConcurso.mockResolvedValueOnce({ id: 'con-1' })
    mockFindUniquePostulante.mockResolvedValueOnce({ id: 'existing' })
    const result = await inscribirPostulante(makeFormData())
    expect(result).toEqual({ success: false, error: expect.stringContaining('Ya registramos') })
    expect(mockGuardar).not.toHaveBeenCalled()
  })

  it('returns success and persists paths on valid submission', async () => {
    mockFindUniqueConcurso.mockResolvedValueOnce({ id: 'con-1' })
    mockFindUniquePostulante.mockResolvedValueOnce(null)
    mockCreate.mockResolvedValueOnce({ id: 'post-1' })
    const result = await inscribirPostulante(makeFormData())
    expect(result).toEqual({ success: true, postulanteId: 'post-1' })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ solicitudPath: paths.solicitud, cvPath: paths.cv }) })
    )
  })

  it('cleans up files when the DB create fails', async () => {
    mockFindUniqueConcurso.mockResolvedValueOnce({ id: 'con-1' })
    mockFindUniquePostulante.mockResolvedValueOnce(null)
    mockCreate.mockRejectedValueOnce({ code: 'P2002' })
    const result = await inscribirPostulante(makeFormData())
    expect(result).toEqual({ success: false, error: expect.stringContaining('Ya registramos') })
    expect(mockLimpiar).toHaveBeenCalledWith(paths)
  })
})
