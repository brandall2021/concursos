import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const {
  mockFindUniqueConcurso,
  mockFindUniquePostulante,
  mockCreate,
  mockDelete,
  mockGuardar,
} = vi.hoisted(() => ({
  mockFindUniqueConcurso: vi.fn(),
  mockFindUniquePostulante: vi.fn(),
  mockCreate: vi.fn(),
  mockDelete: vi.fn(),
  mockGuardar: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '200.1.2.3' }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    concurso: { findUnique: mockFindUniqueConcurso },
    postulante: { findUnique: mockFindUniquePostulante, create: mockCreate, delete: mockDelete },
  },
}))

vi.mock('@/lib/concurso-status', () => ({
  isConcursoActivo: vi.fn(),
  CARGO_LABELS: { Titular: 'Profesor Titular', Asociado: 'Profesor Asociado', Adjunto: 'Profesor Adjunto' },
}))

vi.mock('@/lib/comprobante', () => ({
  generarComprobantePdf: vi.fn().mockResolvedValue(Buffer.from('pdf')),
}))

vi.mock('@/lib/email', () => ({
  smtpConfigurado: vi.fn().mockReturnValue(false),
  enviarComprobantePorEmail: vi.fn(),
}))

vi.mock('@/lib/uploads', async () => {
  const actual = await vi.importActual<typeof import('@/lib/uploads')>('@/lib/uploads')
  return {
    ...actual,
    guardarArchivos: mockGuardar,
    eliminarCarpetaPostulante: vi.fn().mockResolvedValue(undefined),
  }
})

import { inscribirPostulante } from './postulantes'
import { isConcursoActivo } from '@/lib/concurso-status'

const pdf = (size = 100) =>
  ({
    name: 'doc.pdf',
    type: 'application/pdf',
    size,
    slice: () => ({ arrayBuffer: async () => new TextEncoder().encode('%PDF-1.4').buffer }),
  }) as unknown as File

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

const paths = {
  solicitud: 'uuid/solicitud.pdf',
  dniArchivo: 'uuid/dniArchivo.pdf',
  cv: 'uuid/cv.pdf',
  antecedentes: 'uuid/antecedentes.pdf',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('RATE_LIMIT_MAX', '1000')
  vi.mocked(isConcursoActivo).mockReturnValue(true)
  mockFindUniqueConcurso.mockResolvedValue({ id: 'con-1' })
  mockFindUniquePostulante.mockResolvedValue(null)
  mockCreate.mockImplementation(async ({ data }: any) => ({ id: data.id, ...data }))
  mockGuardar.mockResolvedValue(paths)
  mockDelete.mockResolvedValue({})
})

afterEach(() => vi.unstubAllEnvs())

describe('inscribirPostulante', () => {
  it('returns error when required identity fields are missing', async () => {
    const result = await inscribirPostulante(makeFormData({ apellidos: '' }))
    expect(result).toEqual({ success: false, error: expect.any(String) })
  })

  it('rejects oversized names instead of writing them to the database', async () => {
    const result = await inscribirPostulante(makeFormData({ apellidos: 'A'.repeat(5000) }))
    expect(result).toEqual({ success: false, error: expect.stringContaining('caracteres') })
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

  it('does not reveal whether the DNI was already registered', async () => {
    mockFindUniqueConcurso.mockResolvedValueOnce({ id: 'con-1' })
    mockFindUniquePostulante.mockResolvedValueOnce({ id: 'existing' })
    const result = await inscribirPostulante(makeFormData())
    expect(result).toEqual({ success: false, error: expect.stringContaining('No pudimos registrar') })
    expect(JSON.stringify(result)).not.toMatch(/Ya registramos|duplicado|existente/)
    expect(mockGuardar).not.toHaveBeenCalled()
  })

  it('returns success and persists the expected paths', async () => {
    mockFindUniqueConcurso.mockResolvedValueOnce({ id: 'con-1' })
    mockFindUniquePostulante.mockResolvedValueOnce(null)
    mockCreate.mockImplementationOnce(({ data }: any) => Promise.resolve({ id: data.id, ...data }))
    const result = await inscribirPostulante(makeFormData())
    expect(result).toEqual({ success: true, postulanteId: expect.any(String) })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          solicitudPath: expect.stringMatching(/^[0-9a-f-]{36}[\\/]solicitud\.pdf$/),
          cvPath: expect.stringMatching(/^[0-9a-f-]{36}[\\/]cv\.pdf$/),
        }),
      })
    )
  })

  it('rolls back the row when the files cannot be written', async () => {
    mockGuardar.mockRejectedValueOnce(new Error('disco lleno'))

    const result = await inscribirPostulante(makeFormData())
    expect(result).toEqual({ success: false, error: expect.stringContaining('Error interno') })
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/) },
    })
  })
})
