import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

function dominiosPermitidos(): string[] {
  return (process.env.AUTH_ALLOWED_DOMAINS ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
}

function emailDeDominio(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? ''
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      const email = user.email.toLowerCase()

      const permitidos = dominiosPermitidos()
      if (permitidos.length > 0 && !permitidos.includes(emailDeDominio(email))) {
        console.warn(`[auth] Login rechazado por dominio: ${email}`)
        return false
      }

      if (email === process.env.ADMIN_EMAIL?.toLowerCase()) return true
      const existing = await prisma.user.findUnique({ where: { email } })
      return Boolean(existing)
    },
    async session({ session, user }) {
      session.user.id = user.id
      session.user.role = user.role ?? 'NONE'
      return session
    },
  },
  pages: {
    signIn: '/admin/login',
  },
})
