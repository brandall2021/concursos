import { describe, it, expect } from 'vitest'
import { getConcursoEstado, isConcursoActivo, etiquetaConcurso } from './concurso-status'

const past = (offsetMinutes: number) =>
  new Date(Date.now() - offsetMinutes * 60 * 1000)
const future = (offsetMinutes: number) =>
  new Date(Date.now() + offsetMinutes * 60 * 1000)

describe('getConcursoEstado', () => {
  it('returns proximo when apertura is in the future', () => {
    expect(getConcursoEstado({ fechaApertura: future(60), fechaCierre: future(120) }))
      .toBe('proximo')
  })

  it('returns activo when now is between apertura and cierre', () => {
    expect(getConcursoEstado({ fechaApertura: past(60), fechaCierre: future(60) }))
      .toBe('activo')
  })

  it('returns cerrado when cierre is in the past', () => {
    expect(getConcursoEstado({ fechaApertura: past(120), fechaCierre: past(60) }))
      .toBe('cerrado')
  })
})

describe('isConcursoActivo', () => {
  it('returns true only when activo', () => {
    expect(isConcursoActivo({ fechaApertura: past(60), fechaCierre: future(60) })).toBe(true)
    expect(isConcursoActivo({ fechaApertura: future(60), fechaCierre: future(120) })).toBe(false)
    expect(isConcursoActivo({ fechaApertura: past(120), fechaCierre: past(60) })).toBe(false)
  })
})

describe('etiquetaConcurso', () => {
  it('builds a label with the published fields', () => {
    const label = etiquetaConcurso({
      numeroExpediente: '12345/2026',
      cargo: 'Titular',
      dedicacion: 'Simple',
      disciplina: 'Contabilidad',
      area: 'Económica',
      catedra: 'Contabilidad I',
      asignatura: 'Contabilidad Básica',
    })
    expect(label).toContain('Expte. 12345/2026')
    expect(label).toContain('Profesor Titular')
    expect(label).toContain('Dedicación Simple')
    expect(label).toContain('Contabilidad Básica')
  })

  it('omits optional fields when empty', () => {
    const label = etiquetaConcurso({
      numeroExpediente: '1',
      cargo: 'Adjunto',
      dedicacion: 'Exclusiva',
      disciplina: 'Matemática',
      area: null,
      catedra: null,
      asignatura: 'Análisis I',
    })
    expect(label).not.toContain('Área')
    expect(label).not.toContain('Cátedra')
  })
})
