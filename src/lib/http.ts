const FORMULA = /^[=+\-@\t\r]/

function plano(valor: string): string {
  return valor.replace(/[^\x20-\x7E]/g, ' ').replace(/["\\]/g, '').slice(0, 120)
}

export function nombreArchivoSeguro(nombre: string): string {
  return plano(nombre).replace(/[^A-Za-z0-9._ -]/g, '_').trim() || 'archivo'
}

export function cabeceraDescarga(nombre: string): string {
  return `attachment; filename="${nombreArchivoSeguro(nombre)}"`
}

// Excel y LibreOffice evalúan celdas que empiezan con = + - @ : neutralizar antes de exportar.
export function celdaCsv(valor: string): string {
  const texto = FORMULA.test(valor) ? `'${valor}` : valor
  return `"${texto.replace(/"/g, '""')}"`
}
