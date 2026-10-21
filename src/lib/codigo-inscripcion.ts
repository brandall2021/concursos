import { randomInt } from 'node:crypto'

// Sin I, L, O ni digitos: 0/O y 1/L/I se confunden cuando el codigo se dicta por telefono.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ'

export const LARGO_CODIGO = 5

export function generarCodigoInscripcion(): string {
  let codigo = ''
  for (let i = 0; i < LARGO_CODIGO; i++) {
    codigo += ALFABETO[randomInt(0, ALFABETO.length)]
  }
  return codigo
}

// El índice único del codigo también levanta P2002: hay que distinguirlo del DNI duplicado.
export function esColisionDeCodigo(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { code?: string; meta?: { target?: unknown } }
  if (err.code !== 'P2002') return false
  return String(err.meta?.target ?? '').includes('codigoInscripcion')
}
