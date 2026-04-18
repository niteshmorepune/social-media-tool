import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true }
  })
  return NextResponse.json(user)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, email } = await req.json()

  if (!name?.trim() || !email?.trim())
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })

  const existing = await prisma.user.findFirst({
    where: { email: email.trim(), NOT: { id: session.user.id } }
  })
  if (existing)
    return NextResponse.json({ error: 'Email already in use' }, { status: 400 })

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: name.trim(), email: email.trim() }
  })

  return NextResponse.json({ ok: true })
}
