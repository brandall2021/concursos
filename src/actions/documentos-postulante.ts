'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { guardarPdf, rutasEsperadas, validarPdf } from '@/lib/uploads'
import { CAMPOS_DOCUMENTO, type CampoDocumento } from '@/lib/documentos'
import { actorDeSesion, registrarAuditoria } from '@/lib/auditoria'

export type ResultadoSubida = { ok: boolean; error?: string }

// Reemplaza (o carga por primera vez) el PDF de un documento de un postulante,
// desde el panel de administración. La ruta en disco es la misma que usa la
// inscripción (<postulanteId>/<campo>.pdf), así que el registro de la base no
// cambia y las descargas siguen funcionando. Sirve también para restaurar
// documentos que se perdieron en un redeploy sin volumen persistente.
export async function subirDocumentoPostulante(
  formData: FormData
): Promise<ResultadoSubida> {
  const actor = actorDeSesion(await requireAdmin())

  const postulanteId = String(formData.get('postulanteId') ?? '')
  const campo = String(formData.get('campo') ?? '') as CampoDocumento

  if (!postulanteId || !CAMPOS_DOCUMENTO.includes(campo)) {
    return { ok: false, error: 'Datos inválidos' }
  }

  const postulante = await prisma.postulante.findUnique({
    where: { id: postulanteId },
    select: { concursoId: true },
  })
  if (!postulante) return { ok: false, error: 'Postulante inexistente' }

  const resultado = await validarPdf(formData.get('archivo'), campo)
  if (!resultado.ok) return { ok: false, error: resultado.error }

  try {
    await guardarPdf(rutasEsperadas(postulanteId)[campo], resultado.file)
  } catch (e) {
    console.error(`[admin-documentos] No se pudo guardar ${campo} de ${postulanteId}:`, e)
    return { ok: false, error: 'No se pudo guardar el archivo. Intentá nuevamente.' }
  }

  await registrarAuditoria({
    accion: 'SUBIR_PDF',
    entidad: 'Documento',
    entidadId: postulanteId,
    resumen: `Documento "${campo}" subido/reemplazado por el administrador`,
    detalles: { campo, concursoId: postulante.concursoId },
    actor,
  })

  revalidatePath(`/admin/concursos/${postulante.concursoId}/postulantes`)
  return { ok: true }
}
