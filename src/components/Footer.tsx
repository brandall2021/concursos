import { CIUDAD, DIRECCION, EMAIL_CONTACTO, FACULTAD, PAIS_CODIGO_POSTAL } from '@/lib/institucion'

export function Footer() {
  return (
    <footer className="mt-auto bg-face-blue text-white/75">
      <div className="h-2 bg-face-red" />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <p className="text-sm font-semibold text-white">{FACULTAD}</p>
        <address className="mt-2 text-sm not-italic leading-6">
          <span>{DIRECCION}</span>
          <br />
          <span>
            {CIUDAD}{' '}
            <a href={`mailto:${EMAIL_CONTACTO}`} className="font-medium text-white underline-offset-2 hover:text-face-gold hover:underline">
              {EMAIL_CONTACTO}
            </a>
          </span>
          <br />
          <span>{PAIS_CODIGO_POSTAL}</span>
        </address>
      </div>
    </footer>
  )
}
