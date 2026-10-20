import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pdfkit', 'qrcode', 'nodemailer'],
  outputFileTracingIncludes: {
    '/*': ['./node_modules/pdfkit/js/data/**/*'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '250mb',
    },
  },
}

export default nextConfig
