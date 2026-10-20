import { createHmac, timingSafeEqual } from 'node:crypto'

const PREFIJO = 'comprobante'

function secret(): string {
  const valor = process.env.AUTH_SECRET
  if (!valor) throw new Error('AUTH_SECRET no está configurada; no se pueden firmar comprobantes')
  return valor
}

// El id interno del postulante deja de ser la credencial de acceso al enlace público.
export function firmaComprobante(postulanteId: string): string {
  return createHmac('sha256', secret()).update(`${PREFIJO}:${postulanteId}`).digest('hex')
}

export function firmaValida(postulanteId: string, firma: string | null | undefined): boolean {
  if (!firma || !/^[0-9a-f]{64}$/.test(firma)) return false
  const esperada = Buffer.from(firmaComprobante(postulanteId), 'hex')
  const recibida = Buffer.from(firma, 'hex')
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida)
}

export function urlComprobante(postulanteId: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/api/comprobante/${postulanteId}?t=${firmaComprobante(postulanteId)}`
}
