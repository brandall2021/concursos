export const FACULTAD = 'Facultad de Ciencias Económicas'
export const DIRECCION = 'Av. Independencia 1900'
export const CIUDAD = 'S.M de Tucumán – Tucumán'
export const EMAIL_CONTACTO = 'concursos@face.unt.edu.ar'
export const PAIS_CODIGO_POSTAL = 'Argentina – T4000'

// Dirección que se imprime en el QR. Es distinta de AUTH_URL (la usa NextAuth y el enlace firmado
// del comprobante), así que mudar el dominio de sesión no cambia la referencia que lee un tercero.
export const URL_PORTAL = process.env.PORTAL_URL ?? 'https://concursos.face-unt.ar'
