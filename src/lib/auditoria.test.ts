import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }))

vi.mock('./prisma', () => ({
  prisma: { auditLog: { create: mockCreate } },
}))

import { actorDeSesion, registrarAuditoria, ETIQUETAS_ACCION } from './auditoria'

beforeEach(() => {
  vi.clearAllMocks()
  mockCreate.mockResolvedValue({})
})

describe('actorDeSesion', () => {
  it('extrae id, email y nombre de la sesión', () => {
    expect(actorDeSesion({ user: { id: 'u-1', email: 'admin@face.unt.edu.ar', name: 'Admin' } })).toEqual({
      id: 'u-1',
      email: 'admin@face.unt.edu.ar',
      name: 'Admin',
    })
  })

  it('devuelve null sin sesión o sin usuario', () => {
    expect(actorDeSesion(null)).toBeNull()
    expect(actorDeSesion({})).toBeNull()
  })
})

describe('registrarAuditoria', () => {
  it('guarda el actor autenticado con todos los datos del cambio', async () => {
    await registrarAuditoria({
      accion: 'CREAR',
      entidad: 'Concurso',
      entidadId: 'con-1',
      resumen: 'Alta del llamado 123',
      detalles: { numeroExpediente: '123' },
      actor: { id: 'u-1', email: 'admin@face.unt.edu.ar', name: 'Admin' },
    })

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'u-1',
        actorEmail: 'admin@face.unt.edu.ar',
        actorNombre: 'Admin',
        accion: 'CREAR',
        entidad: 'Concurso',
        entidadId: 'con-1',
        resumen: 'Alta del llamado 123',
        detalles: { numeroExpediente: '123' },
      }),
    })
  })

  it('registra una inscripción pública con la IP cuando no hay actor', async () => {
    await registrarAuditoria({
      accion: 'INSCRIPCION',
      entidad: 'Postulante',
      entidadId: 'p-1',
      resumen: 'Inscripción pública',
      ip: '200.1.2.3',
    })

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: null,
        actorEmail: 'PÚBLICO (200.1.2.3)',
        actorNombre: null,
      }),
    })
  })

  it('nunca propaga un error de escritura', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCreate.mockRejectedValueOnce(new Error('tabla inexistente'))

    await expect(
      registrarAuditoria({ accion: 'EDITAR', entidad: 'Concurso', resumen: 'Cambio' })
    ).resolves.toBeUndefined()
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})

describe('ETIQUETAS_ACCION', () => {
  it('tiene etiqueta legible para cada acción instrumentada', () => {
    for (const accion of [
      'INSCRIPCION', 'CREAR', 'EDITAR', 'BORRAR', 'SUBIR_PDF',
      'REEMPLAZAR_RESOLUCION', 'QUITAR_RESOLUCION', 'PUBLICAR',
      'DESPUBLICAR', 'AGREGAR_ADMIN', 'QUITAR_ADMIN',
    ]) {
      expect(ETIQUETAS_ACCION[accion]).toBeTruthy()
    }
  })
})
