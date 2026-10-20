export type ConcursoEstado = 'proximo' | 'activo' | 'cerrado'

export type Cargo = 'Titular' | 'Asociado' | 'Adjunto'

export const CARGOS: Cargo[] = ['Titular', 'Asociado', 'Adjunto']

export const CARGO_LABELS: Record<string, string> = {
  Titular: 'Profesor Titular',
  Asociado: 'Profesor Asociado',
  Adjunto: 'Profesor Adjunto',
}

export function getConcursoEstado(concurso: {
  fechaApertura: Date
  fechaCierre: Date
}): ConcursoEstado {
  const now = new Date()
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
