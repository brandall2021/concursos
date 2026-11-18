'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'
import { revalidatePath } from 'next/cache'
import { actorDeSesion, registrarAuditoria } from '@/lib/auditoria'

export type ObservacionResult = { success: true } | { success: false; error: string }

const LARGO_MAX_OBSERVACION = 2000

export async function actualizarObservacion(
  postulanteId: string,
  texto: string
): Promise<ObservacionResult> {
  const actor = actorDeSesion(await requireAdmin())

  if (typeof postulanteId !== 'string' || postulanteId.length === 0) {
    return { success: false, error: 'Postulante no válido' }
  }

  if (typeof texto !== 'string') return { success: false, error: 'Texto no válido' }

  const limpio = texto.trim()
  if (limpio.length > LARGO_MAX_OBSERVACION) {
    return { success: false, error: `La observación no puede superar ${LARGO_MAX_OBSERVACION} caracteres` }
  }

  const observacion = limpio

  const postulante = await prisma.postulante.findUnique({
    where: { id: postulanteId },
    select: { id: true, concursoId: true },
  })
  if (!postulante) return { success: false, error: 'El postulante no existe' }

  await prisma.postulante.update({
    where: { id: postulanteId },
    data: { observacion: observacion || null },
  })

  await registrarAuditoria({
    accion: 'EDITAR',
    entidad: 'Postulante',
    entidadId: postulanteId,
    resumen: observacion ? 'Observación actualizada' : 'Observación eliminada',
    detalles: { observacion: observacion || null },
    actor,
  })

  revalidatePath(`/admin/concursos/${postulante.concursoId}/postulantes`)
  return { success: true }
}
