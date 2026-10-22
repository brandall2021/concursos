export type ConcursoEstado = 'proximo' | 'activo' | 'cerrado'

export type Cargo = 'Titular' | 'Asociado' | 'Adjunto'

export const CARGOS: Cargo[] = ['Titular', 'Asociado', 'Adjunto']

export const CARGO_LABELS: Record<string, string> = {
  Titular: 'Profesor Titular',
  Asociado: 'Profesor Asociado',
  Adjunto: 'Profesor Adjunto',
}

// `now` es opcional para que las reglas se puedan probar con una fecha fija; quien llama desde la
// app no lo pasa y usa el reloj del servidor.
export function getConcursoEstado(
  concurso: { fechaApertura: Date; fechaCierre: Date },
  now: Date = new Date()
): ConcursoEstado {
  if (now < concurso.fechaApertura) return 'proximo'
  if (now > concurso.fechaCierre) return 'cerrado'
  return 'activo'
}

export function isConcursoActivo(concurso: {
  fechaApertura: Date
  fechaCierre: Date
}): boolean {
  return getConcursoEstado(concurso) === 'activo'
}

// Tinte de fila para la grilla de administración. Son los mismos tres tonos del badge
// (ConcursoStatusBadge), llevados a la fila entera para que el estado se vea al escanear la lista.
// Se aplica siempre junto con el badge: el color es una ayuda, nunca la única señal del estado.
export const FILA_POR_ESTADO: Record<ConcursoEstado, string> = {
  proximo: 'border-l-4 border-l-amber-400 bg-amber-50/70 hover:bg-amber-50',
  activo: 'border-l-4 border-l-emerald-500 bg-emerald-50/60 hover:bg-emerald-50/90',
  cerrado: 'border-l-4 border-l-gray-300 bg-gray-50 hover:bg-gray-100/80',
}

export function claseFilaConcurso(estado: ConcursoEstado): string {
  return FILA_POR_ESTADO[estado]
}

export function etiquetaConcurso(concurso: {
  numeroExpediente: string
  cargo: string
  dedicacion: string
  disciplina: string
  area?: string | null
  catedra?: string | null
  asignatura: string
}): string {
  const partes = [
    `Expte. ${concurso.numeroExpediente}`,
    CARGO_LABELS[concurso.cargo] ?? `Profesor ${concurso.cargo}`,
    `Dedicación ${concurso.dedicacion}`,
    concurso.disciplina,
    concurso.area ? `Área ${concurso.area}` : null,
    concurso.catedra ? `Cátedra ${concurso.catedra}` : null,
    concurso.asignatura,
  ]
  return partes.filter(Boolean).join(' — ')
}
