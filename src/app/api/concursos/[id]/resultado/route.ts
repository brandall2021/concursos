import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { prisma } from '@/lib/prisma'
import { resolverArchivo } from '@/lib/uploads'
import { cabeceraEnPantalla } from '@/lib/http'
import { nombreDescargaResultado } from '@/lib/resultados'

// Enlace público al PDF de resultado publicado. No lleva firma porque el documento es público por
// decisión del Departamento Concursos al publicar; lo que sí garantiza la ruta es que solo se puede
// leer el PDF registrado en la base de un concurso que esté publicado.
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  const concurso = await prisma.concurso.findUnique({
    where: { id },
    select: { numeroExpediente: true, resultadoPath: true, resultadoPublicadoEn: true },
  })

  if (!concurso || !concurso.resultadoPath || !concurso.resultadoPublicadoEn) {
    return new NextResponse('No encontrado', { status: 404 })
  }

  let buffer: Buffer
  try {
    buffer = await readFile(resolverArchivo(concurso.resultadoPath))
  } catch (e) {
    console.error(`[resultado] No se pudo leer "${concurso.resultadoPath}" del concurso ${id}:`, e)
    return new NextResponse(
      'El documento publicado no está disponible en el servidor. Si el contenedor fue reconstruido, configurá un volumen persistente para el directorio de subidas.',
      { status: 404 }
    )
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': cabeceraEnPantalla(nombreDescargaResultado(concurso.numeroExpediente)),
      // no-store: volver a publicar reemplaza el documento y un cache intermedio mostraría la versión
      // anterior bajo el mismo enlace.
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
