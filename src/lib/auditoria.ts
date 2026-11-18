import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'

// Un registro de auditoría nunca debe romper la operación que lo origina: si la
// tabla no existe (deploy anterior) o falla la escritura, la acción principal ya
// se completó y el error queda solo en el log del servidor.
export type Actor = {
  id?: string | null
  email?: string | null
  name?: string | null
}

export type DatosAuditoria = {
  accion: string
  entidad: string
  entidadId?: string | null
  resumen: string
  detalles?: Prisma.InputJsonValue
  actor?: Actor | null
  ip?: string | null
}

export function actorDeSesion(
  session: { user?: Actor | null } | null | undefined
): Actor | null {
  const user = session?.user
  if (!user) return null
  return { id: user.id, email: user.email, name: user.name }
}

export async function registrarAuditoria(datos: DatosAuditoria): Promise<void> {
  const { actor, accion, entidad, entidadId, resumen, detalles, ip } = datos
  const anonimo = !actor?.email
  const actorEmail = anonimo ? (ip ? `PÚBLICO (${ip})` : 'PÚBLICO') : actor.email!
  const actorNombre = anonimo ? null : actor?.name ?? null

  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        actorEmail,
        actorNombre,
        accion,
        entidad,
        entidadId: entidadId ?? null,
        resumen,
        detalles,
      },
    })
  } catch (error) {
    console.error('[auditoria] No se pudo registrar el cambio:', accion, entidad, entidadId, error)
  }
}

export const ETIQUETAS_ACCION: Record<string, string> = {
  INSCRIPCION: 'Inscripción',
  CREAR: 'Alta',
  EDITAR: 'Modificación',
  BORRAR: 'Baja',
  SUBIR_PDF: 'Subida de PDF',
  REEMPLAZAR_RESOLUCION: 'Resolución cargada',
  QUITAR_RESOLUCION: 'Resolución quitada',
  PUBLICAR: 'Resultado publicado',
  DESPUBLICAR: 'Resultado despublicado',
  AGREGAR_ADMIN: 'Admin agregado',
  QUITAR_ADMIN: 'Admin quitado',
}
