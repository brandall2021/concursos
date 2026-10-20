import nodemailer, { type Transporter } from 'nodemailer'

let cachedTransport: Transporter | null = null

export function smtpConfigurado(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_FROM
  )
}

function getTransport(): Transporter {
  if (cachedTransport) return cachedTransport

  const port = Number(process.env.SMTP_PORT)
  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : port === 465,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        }
      : undefined,
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
