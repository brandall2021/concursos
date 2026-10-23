import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { prisma } from '@/lib/prisma'
import { resolverArchivo } from '@/lib/uploads'
import { cabeceraEnPantalla } from '@/lib/http'
import { nombreDescargaResolucion } from '@/lib/resoluciones'

// Enlace público a la Resolución que crea el llamado. Se puede leer sin sesión porque la convocatoria
// ya es pública; lo que restringe la ruta es que solo devuelve el PDF registrado en la base de ese
// concurso, nunca una ruta arbitraria del volumen de subidas.
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  const concurso = await prisma.concurso.findUnique({
    where: { id },
    select: { numeroExpediente: true, resolucionPath: true },
  })

  if (!concurso || !concurso.resolucionPath) {
    return new NextResponse('No encontrado', { status: 404 })
  }

  let buffer: Buffer
  try {
    buffer = await readFile(resolverArchivo(concurso.resolucionPath))
  } catch (e) {
    console.error(`[resolucion] No se pudo leer "${concurso.resolucionPath}" del concurso ${id}:`, e)
    return new NextResponse(
      'La Resolución no está disponible en el servidor. Si el contenedor fue reconstruido, configurá un volumen persistente para el directorio de subidas.',
      { status: 404 }
    )
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': cabeceraEnPantalla(nombreDescargaResolucion(concurso.numeroExpediente)),
      // no-store: reemplazar la resolución deja el mismo enlace y un cache intermedio mostraría la
      // versión anterior.
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
