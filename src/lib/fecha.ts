// Toda la aplicación habla en hora argentina. El servidor puede correr en UTC (el contenedor de
// Dokploy lo hace) y el navegador del admin puede estar en cualquier zona: si cada pantalla usara la
// zona local, el mismo llamado mostraría horas distintas según dónde se lo mire.
//
// Argentina no cambia su hora desde 2009, así que UTC-3 fijo es equivalente a consultar una base de
// datos de zonas horarias.
export const ZONA_ARGENTINA = 'America/Argentina/Buenos_Aires'
const DESPLAZAMIENTO_ARGENTINA = '-03:00'

const FORMATO_DATETIME_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

export function fechaHoraArg(fecha: Date): string {
  return fecha.toLocaleString('es-AR', { timeZone: ZONA_ARGENTINA })
}

export function fechaArg(fecha: Date): string {
  return fecha.toLocaleDateString('es-AR', { timeZone: ZONA_ARGENTINA })
}

// El <input type="datetime-local"> entrega "2026-11-01T09:00" sin zona: se interpreta como hora
// argentina, no como la hora del navegador, para que lo que el admin tipea sea lo que se guarda.
export function parsearFechaHoraArg(valor: string): Date | null {
  const coincide = FORMATO_DATETIME_LOCAL.exec(valor.trim())
  if (!coincide) return null
  const fecha = new Date(`${coincide[0]}:00${DESPLAZAMIENTO_ARGENTINA}`)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

// Valor para el defaultValue de ese mismo input: la hora argentina del instante guardado.
export function aFechaHoraLocalArg(fecha: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_ARGENTINA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(fecha)
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '00'
  // Algunos formateadores devuelven "24" en vez de "00" para la medianoche.
  const hora = valor('hour') === '24' ? '00' : valor('hour')
  return `${valor('year')}-${valor('month')}-${valor('day')}T${hora}:${valor('minute')}`
}
