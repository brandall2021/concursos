'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'
import { revalidatePath } from 'next/cache'
import { borrarPdf, guardarPdf } from '@/lib/uploads'
import { rutaResultadoRelativa, sePuedePublicarResultado, validarResultadoPdf } from '@/lib/resultados'

export type ResultadoActionResult = { success: true } | { success: false; error: string }

const SIN_CONCURSO = 'El concurso no existe'

function idNoValido(concursoId: unknown): boolean {
  return typeof concursoId !== 'string' || concursoId.trim().length === 0
}

// Publicar = subir el PDF del resultado de un llamado cerrado y dejarlo visible en la página
// principal. Se rechaza el llamado que todavía tiene inscripción abierta: publicar un resultado
// antes de tiempo es un acto institucional, no un detalle de UI.
export async function publicarResultado(
  concursoId: string,
  formData: FormData
): Promise<ResultadoActionResult> {
  await requireAdmin()

  if (idNoValido(concursoId)) return { success: false, error: 'Concurso no válido' }

  const concurso = await prisma.concurso.findUnique({
    where: { id: concursoId },
    select: { id: true, fechaApertura: true, fechaCierre: true, resultadoPath: true },
  })
  if (!concurso) return { success: false, error: SIN_CONCURSO }

  if (!sePuedePublicarResultado(concurso)) {
    return { success: false, error: 'Solo se puede publicar el resultado de un concurso cerrado.' }
  }

  const validado = await validarResultadoPdf(formData.get('resultado'))
  if (!validado.ok) return { success: false, error: validado.error }

  // Nombre versionado: publicar no pisa el PDF que se está sirviendo ahora. Si la escritura y el
  // update usaran la misma ruta, una actualización fallada dejaría la base apuntando a un
  // documento distinto del que se publicó.
  const nuevaRuta = rutaResultadoRelativa(concurso.id)
  try {
    await guardarPdf(nuevaRuta, validado.file)
  } catch (error) {
    console.error(`[resultado] No se pudo escribir "${nuevaRuta}" del concurso ${concurso.id}:`, error)
    return {
      success: false,
      error: 'No se pudo guardar el PDF en el servidor. Revisá el volumen de UPLOAD_DIR.',
    }
  }

  try {
    await prisma.concurso.update({
      where: { id: concurso.id },
      data: {
        resultadoPath: nuevaRuta,
        resultadoNombre: validado.nombre,
        resultadoPublicadoEn: new Date(),
      },
    })
  } catch (error) {
    // El update no ocurrió: la base sigue apuntando al PDF anterior, que sigue intacto en disco.
    await borrarPdf(nuevaRuta)
    console.error(`[resultado] Update fallido para el concurso ${concurso.id}:`, error)
    return { success: false, error: 'No se pudo registrar la publicación. Intentá de nuevo.' }
  }

  // Borro la versión anterior después de publicar: si la limpieza falla queda un archivo huérfano en
  // disco, nunca un enlace roto.
  if (concurso.resultadoPath && concurso.resultadoPath !== nuevaRuta) {
    await borrarPdf(concurso.resultadoPath)
  }

  revalidatePath('/admin/concursos')
  revalidatePath('/')
  return { success: true }
}

export async function despublicarResultado(concursoId: string): Promise<ResultadoActionResult> {
  await requireAdmin()

  if (idNoValido(concursoId)) return { success: false, error: 'Concurso no válido' }

  const concurso = await prisma.concurso.findUnique({
    where: { id: concursoId },
    select: { id: true, resultadoPath: true, resultadoPublicadoEn: true },
  })
  if (!concurso) return { success: false, error: SIN_CONCURSO }
  if (!concurso.resultadoPublicadoEn) return { success: false, error: 'Ese concurso no tiene nada publicado.' }

  // Primero se despublica (el enlace público deja de responder) y después se limpia el disco: en el
  // orden inverso quedaría una ventana con el PDF servido y la base diciendo que no existe.
  await prisma.concurso.update({
    where: { id: concurso.id },
    data: { resultadoPath: null, resultadoNombre: null, resultadoPublicadoEn: null },
  })

  if (concurso.resultadoPath) await borrarPdf(concurso.resultadoPath)

  revalidatePath('/admin/concursos')
  revalidatePath('/')
  return { success: true }
}
