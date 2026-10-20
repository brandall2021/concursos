const MAX_CLAVES = 50_000

type Ventana = { cant: number; hasta: number }
const ventanas = new Map<string, Ventana>()

function limite(): number {
  return Number(process.env.RATE_LIMIT_MAX ?? 5) || Number.POSITIVE_INFINITY
}

function ventanaMs(): number {
  return (Number(process.env.RATE_LIMIT_VENTANA_MIN ?? 60) || 60) * 60_000
}

function barrer(viejas: number) {
  for (const [clave, ventana] of ventanas) {
    if (ventana.hasta <= viejas) ventanas.delete(clave)
  }
}

export function excedido(clave: string): boolean {
  const ahora = Date.now()
  const registro = ventanas.get(clave)

  if (!registro || registro.hasta <= ahora) {
    if (ventanas.size >= MAX_CLAVES) barrer(ahora)
    ventanas.set(clave, { cant: 1, hasta: ahora + ventanaMs() })
    return false
  }

  if (registro.cant >= limite()) return true
  registro.cant += 1
  return false
}

export function ipCliente(headers: Headers): string {
  const adelante = headers.get('x-forwarded-for')
  const origen = adelante?.split(',')[0]?.trim() || headers.get('x-real-ip')
  return (origen || 'desconocida').slice(0, 100)
}
