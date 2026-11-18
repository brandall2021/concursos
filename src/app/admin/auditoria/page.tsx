import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'
import { ETIQUETAS_ACCION } from '@/lib/auditoria'
import Link from 'next/link'

const POR_PAGINA = 30

type Filtros = {
  accion: string
  entidad: string
  actor: string
  desde: string
  hasta: string
  pagina: number
}

function valor(valor: string | string[] | undefined): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

function parsearFiltros(params: Record<string, string | string[] | undefined>): Filtros {
  const pagina = Number(valor(params.pagina))
  return {
    accion: valor(params.accion),
    entidad: valor(params.entidad),
    actor: valor(params.actor),
    desde: valor(params.desde),
    hasta: valor(params.hasta),
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
  }
}

function fechaInicio(valorFecha: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valorFecha)) return undefined
  const fecha = new Date(`${valorFecha}T00:00:00.000Z`)
  return Number.isNaN(fecha.getTime()) ? undefined : fecha
}

function fechaFin(valorFecha: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valorFecha)) return undefined
  const fecha = new Date(`${valorFecha}T23:59:59.999Z`)
  return Number.isNaN(fecha.getTime()) ? undefined : fecha
}

function fechaParaInput(fecha: Date): string {
  return fecha.toISOString().slice(0, 10)
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdmin()
  const filtros = parsearFiltros(await searchParams)

  const where: {
    accion?: string
    entidad?: string
    actorEmail?: { contains: string; mode: 'insensitive' }
    createdAt?: { gte?: Date; lte?: Date }
  } = {}
  if (filtros.accion) where.accion = filtros.accion
  if (filtros.entidad) where.entidad = filtros.entidad
  if (filtros.actor) where.actorEmail = { contains: filtros.actor, mode: 'insensitive' }
  const inicio = fechaInicio(filtros.desde)
  const fin = fechaFin(filtros.hasta)
  if (inicio || fin) {
    where.createdAt = { ...(inicio ? { gte: inicio } : {}), ...(fin ? { lte: fin } : {}) }
  }

  const [registros, total, acciones] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filtros.pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      distinct: ['accion'],
      select: { accion: true },
      orderBy: { accion: 'asc' },
    }),
  ])

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const pagina = Math.min(filtros.pagina, paginas)
  const query = (cambios: Record<string, string | number>): string => {
    const params = new URLSearchParams()
    const valores: Record<string, string> = {
      accion: filtros.accion,
      entidad: filtros.entidad,
      actor: filtros.actor,
      desde: filtros.desde,
      hasta: filtros.hasta,
      ...Object.fromEntries(Object.entries(cambios).map(([k, v]) => [k, String(v)])),
    }
    for (const [k, v] of Object.entries(valores)) if (v) params.set(k, v)
    const cadena = params.toString()
    return cadena ? `?${cadena}` : ''
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-face-red">Sistema</p>
        <h1 className="mt-1 text-2xl font-bold text-face-blue">Auditoría de cambios</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quién subió o modificó cada dato, con fecha y detalle. Se registran también las inscripciones públicas.
        </p>
      </header>

      <section className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
        <form method="get" action="/admin/auditoria" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Acción
            <select name="accion" defaultValue={filtros.accion} className="rounded border border-gray-300 px-3 py-2">
              <option value="">Todas</option>
              {acciones.map(({ accion }) => (
                <option key={accion} value={accion}>{ETIQUETAS_ACCION[accion] ?? accion}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Entidad
            <select name="entidad" defaultValue={filtros.entidad} className="rounded border border-gray-300 px-3 py-2">
              <option value="">Todas</option>
              {['Concurso', 'Postulante', 'Documento', 'Usuario'].map((entidad) => (
                <option key={entidad} value={entidad}>{entidad}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Usuario
            <input name="actor" defaultValue={filtros.actor} placeholder="Email o IP" className="rounded border border-gray-300 px-3 py-2" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Desde
              <input type="date" name="desde" defaultValue={filtros.desde} className="rounded border border-gray-300 px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Hasta
              <input type="date" name="hasta" defaultValue={filtros.hasta} className="rounded border border-gray-300 px-3 py-2" />
            </label>
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button type="submit" className="rounded bg-face-blue px-4 py-2 text-sm font-semibold text-white hover:bg-face-blue/90">Filtrar</button>
            <Link href="/admin/auditoria" className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Limpiar</Link>
          </div>
        </form>
      </section>

      <p className="text-sm text-gray-500">{total} registro{total === 1 ? '' : 's'}</p>

      <section className="overflow-x-auto rounded-md border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {registros.map((registro) => (
              <tr key={registro.id}>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                  {registro.createdAt.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-face-blue">
                  {ETIQUETAS_ACCION[registro.accion] ?? registro.accion}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{registro.actorNombre ?? '—'}</div>
                  <div className="text-xs text-gray-500">{registro.actorEmail}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                  {registro.entidad}
                  {registro.entidadId ? <span className="block text-xs text-gray-400">{registro.entidadId.slice(0, 12)}</span> : null}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  <div>{registro.resumen}</div>
                  {registro.detalles ? (
                    <details className="mt-1 text-xs text-gray-500">
                      <summary className="cursor-pointer">Ver detalles</summary>
                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-2">
                        {JSON.stringify(registro.detalles, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </td>
              </tr>
            ))}
            {registros.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No hay registros con esos filtros.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <nav className="flex items-center justify-between text-sm text-gray-600" aria-label="Paginación">
        <Link className={pagina <= 1 ? 'pointer-events-none opacity-40' : 'hover:underline'} href={query({ pagina: pagina - 1 })}>← Anterior</Link>
        <span>Página {pagina} de {paginas}</span>
        <Link className={pagina >= paginas ? 'pointer-events-none opacity-40' : 'hover:underline'} href={query({ pagina: pagina + 1 })}>Siguiente →</Link>
      </nav>
    </div>
  )
}
