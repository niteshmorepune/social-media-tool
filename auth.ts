import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

function verifyPortalSsoToken(token: string): { email: string } | null {
  const secret = process.env.PORTAL_SSO_SECRET
  if (!secret) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [header, payload, sig] = parts
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')

  const expectedBuf = Buffer.from(expected, 'utf8')
  const actualBuf   = Buffer.from(sig, 'utf8')
  if (expectedBuf.length !== actualBuf.length) return null
  if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) return null

  let claims: Record<string, unknown>
  try {
    const rem = payload.length % 4
    const padded = rem > 0 ? payload + '='.repeat(4 - rem) : payload
    claims = JSON.parse(Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
  } catch {
    return null
  }

  if (!claims.email || typeof claims.exp !== 'number' || claims.exp < Math.floor(Date.now() / 1000)) {
    return null
  }

  return { email: claims.email as string }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login'
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
        token:    { label: 'SSO Token', type: 'text' },
      },
      async authorize(credentials) {
        // SSO path: CRM portal JWT
        if (credentials?.token) {
          const claims = verifyPortalSsoToken(credentials.token as string)
          if (!claims) return null

          const user = await prisma.user.findUnique({ where: { email: claims.email } })
          if (!user) return null

          return { id: user.id, name: user.name, email: user.email, role: user.role, clientId: user.clientId }
        }

        // Normal email + password path
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!valid) return null

        return {
          id:       user.id,
          name:     user.name,
          email:    user.email,
          role:     user.role,
          clientId: user.clientId
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id       = user.id
        token.role     = (user as { role: string }).role
        token.clientId = (user as { clientId: string | null }).clientId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id       = token.id as string
        session.user.role     = token.role as string
        session.user.clientId = token.clientId as string | null
      }
      return session
    }
  }
})
