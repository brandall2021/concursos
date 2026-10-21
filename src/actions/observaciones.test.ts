import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireAdmin, mockFindUnique, mockUpdate } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/guards', () => ({ requireAdmin: mockRequireAdmin }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    postulante: { findUnique: mockFindUnique, update: mockUpdate },
  },
}))

import { actualizarObservacion } from './observaciones'
import { revalidatePath } from 'next/cache'

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue({ user: { id: 'u-1', role: 'ADMIN' } })
  mockFindUnique.mockResolvedValue({ id: 'p-1', concursoId: 'con-1' })
  mockUpdate.mockResolvedValue({})
})

describe('actualizarObservacion', () => {
  it('exige sesion de administrador antes de escribir', async () => {
    mockRequireAdmin.mockRejectedValueOnce(new Error('NEXT_REDIRECT'))
    await expect(actualizarObservacion('p-1', 'Observación')).rejects.toThrow('NEXT_REDIRECT')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('guarda el texto recortado y revalida la lista del concurso', async () => {
    const resultado = await actualizarObservacion('p-1', '  Falta el título  ')
    expect(resultado).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      data: { observacion: 'Falta el título' },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/concursos/con-1/postulantes')
  })

  it('un texto vacio borra la observacion, no la deja en cadena vacia', async () => {
    await actualizarObservacion('p-1', '   ')
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'p-1' }, data: { observacion: null } })
  })

  it('rechaza id vacio', async () => {
    const resultado = await actualizarObservacion('', 'hola')
    expect(resultado).toEqual({ success: false, error: expect.any(String) })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('no escribe sobre un postulante inexistente', async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    const resultado = await actualizarObservacion('p-fantasma', 'hola')
    expect(resultado).toEqual({ success: false, error: expect.stringContaining('no existe') })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rechaza observaciones fuera de largo en vez de truncarlas', async () => {
    const resultado = await actualizarObservacion('p-1', 'A'.repeat(2001))
    expect(resultado).toEqual({ success: false, error: expect.stringContaining('2000') })
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
