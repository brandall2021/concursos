import nodemailer, { type Transporter } from 'nodemailer'

const HOST_GMAIL = 'smtp.gmail.com'
const PUERTO_GMAIL = 465

let cachedTransport: Transporter | null = null

// El correo saliente usa Gmail. Gmail no acepta la contraseña de la cuenta: hay que generar una
// "contraseña de aplicación" (requiere verificación en 2 pasos) y ponerla en SMTP_PASSWORD.
// SMTP_HOST y SMTP_PORT pisan el default cuando se quiera volver a un SMTP institucional.
export function smtpConfigurado(): boolean {
  return Boolean(
    process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD &&
      process.env.SMTP_FROM
  )
}

function getTransport(): Transporter {
  if (cachedTransport) return cachedTransport

  const host = process.env.SMTP_HOST?.trim() || HOST_GMAIL
  const port = Number(process.env.SMTP_PORT) || PUERTO_GMAIL
  cachedTransport = nodemailer.createTransport({
    host,
    port,
    // 465 es TLS implícito; en 587 Gmail exige STARTTLS, que nodemailer negoceia con secure: false.
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })
  return cachedTransport
}

export type ComprobanteMail = {
  to: string
  nombrePostulante: string
  numeroExpediente: string
  cargo: string
  pdf: Buffer
  nombreArchivo: string
  comprobanteUrl?: string
}

export async function enviarComprobantePorEmail(mail: ComprobanteMail): Promise<void> {
  const transport = getTransport()
  const from = process.env.SMTP_FROM!

  const cuerpo = [
    `Hola ${mail.nombrePostulante},`,
    '',
    `Registramos tu inscripción al concurso Expte. ${mail.numeroExpediente} (${mail.cargo}).`,
    '',
    'Adjuntamos el comprobante de inscripción en formato PDF.',
    mail.comprobanteUrl ? `También podés descargarlo desde: ${mail.comprobanteUrl}` : '',
    '',
    'La información consignada y la documentación presentada tienen carácter de declaración jurada (art. 9 del Reglamento General de Concursos Docentes).',
    '',
    'Universidad Nacional de Tucumán — Facultad de Ciencias Económicas',
  ]
    .filter((l) => l !== undefined)
    .join('\n')

  await transport.sendMail({
    from,
    to: mail.to,
    subject: `Comprobante de inscripción — Expte. ${mail.numeroExpediente}`,
    text: cuerpo,
    attachments: [
      {
        filename: mail.nombreArchivo,
        content: mail.pdf,
        contentType: 'application/pdf',
      },
    ],
  })
}
