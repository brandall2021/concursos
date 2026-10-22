import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { LIMITE_RESULTADO } from './documentos'
import {
  nombreDescargaResultado,
  nombreResultadoParaMostrar,
  rutaResultadoRelativa,
  sePuedePublicarResultado,
  validarResultadoPdf,
  LARGO_MAX_NOMBRE_RESULTADO,
} from './resultados'

const pdf = (nombre = 'resolucion.pdf', contenido = '%PDF-1.4 simulacion') =>
  new File([contenido], nombre, { type: 'application/pdf' })

describe('rutaResultadoRelativa', () => {
  it('versiona el archivo para que publicar no pise el PDF que se esta sirviendo', () => {
    expect(rutaResultadoRelativa('con-1', 1700000000000)).toBe(path.join('resultados', 'con-1-1700000000000.pdf'))
  })

  it('dos publicaciones del mismo concurso no comparten ruta', () => {
    expect(rutaResultadoRelativa('con-1', 1)).not.toBe(rutaResultadoRelativa('con-1', 2))
  })
})

describe('nombreResultadoParaMostrar', () => {
  it('se queda con el archivo sin la ruta de origen', () => {
    expect(nombreResultadoParaMostrar('C:\\Users\\conc\\Downloads\\Orden de merito 1234.pdf')).toBe(
      'Orden de merito 1234.pdf'
    )
    expect(nombreResultadoParaMostrar('../../etc/passwd')).toBe('passwd')
  })

  it('recorta a 120 caracteres y colapsa espacios', () => {
    const largo = nombreResultadoParaMostrar(`${'A'.repeat(200)}.pdf`)
    expect(largo.length).toBe(LARGO_MAX_NOMBRE_RESULTADO)
    expect(nombreResultadoParaMostrar('resolución   final.pdf')).toBe('resolución final.pdf')
  })

  it('sin nombre util devuelve la etiqueta generica', () => {
    expect(nombreResultadoParaMostrar('   ')).toBe('Documento del concurso')
    expect(nombreResultadoParaMostrar('\u0000\u0001')).toBe('Documento del concurso')
  })
})

describe('nombreDescargaResultado', () => {
  it('saneja el numero de expediente para la cabecera', () => {
    expect(nombreDescargaResultado('12345/2026')).toBe('resultado-12345_2026.pdf')
    // nombreArchivoSeguro primero quita comillas y barras (son las que rompen la cabecera) y despues
    // sustituye el resto de los caracteres no seguros por guion bajo.
    expect(nombreDescargaResultado('a"b\\c')).toBe('resultado-abc.pdf')
  })
})

describe('sePuedePublicarResultado', () => {
  const cerrado = { fechaApertura: new Date('2026-01-01'), fechaCierre: new Date('2026-02-01') }

  it('solo despues del cierre', () => {
    expect(sePuedePublicarResultado(cerrado, new Date('2026-03-01'))).toBe(true)
    expect(sePuedePublicarResultado(cerrado, new Date('2026-01-15'))).toBe(false)
    expect(sePuedePublicarResultado(cerrado, new Date('2025-12-01'))).toBe(false)
  })
})

describe('validarResultadoPdf', () => {
  it('acepta un PDF con firma valida y conserva el nombre limpio', async () => {
    const resultado = await validarResultadoPdf(pdf('Resolución 0432-2026.pdf'))
    expect(resultado).toEqual({ ok: true, file: expect.any(File), nombre: 'Resolución 0432-2026.pdf' })
  })

  it('rechaza ausencia de archivo o cadena', async () => {
    expect((await validarResultadoPdf(null)).ok).toBe(false)
    expect((await validarResultadoPdf('hola')).ok).toBe(false)
    expect((await validarResultadoPdf(new File([], 'vacio.pdf', { type: 'application/pdf' }))).ok).toBe(false)
  })

  it('rechaza lo que no es PDF por tipo y extension', async () => {
    const resultado = await validarResultadoPdf(new File(['texto'], 'nota.txt', { type: 'text/plain' }))
    expect(resultado).toEqual({ ok: false, error: expect.stringContaining('PDF') })
  })

  it('rechaza un archivo que simula ser PDF sin la firma', async () => {
    const resultado = await validarResultadoPdf(new File(['NO SOY UN PDF'], 'falso.pdf', { type: 'application/pdf' }))
    expect(resultado).toEqual({ ok: false, error: expect.stringContaining('no es un PDF válido') })
  })

  it('rechaza por encima del limite de tamano', async () => {
    const enorme = new File([new Uint8Array(LIMITE_RESULTADO + 1)], 'grande.pdf', { type: 'application/pdf' })
    const resultado = await validarResultadoPdf(enorme)
    expect(resultado).toEqual({ ok: false, error: expect.stringContaining('25 MB') })
  })
})
