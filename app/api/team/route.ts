import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { isServiceKeyRequest } from '@/lib/service-key'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'TEAM'] } },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  })

  return NextResponse.json(users)
}

export async function POST(req: Request) {
  // Allow server-to-server calls from the NEDS CRM (deal won → provision a
  // CLIENT portal login for the client's primary contact, mirroring how the
  // CRM already provisions a Drishti CLIENT user). Same shared-secret pattern
  // as POST /api/clients.
  const isServiceCall = isServiceKeyRequest(req, 'POST /api/team', 'provisioning')

  if (!isServiceCall) {
    const session = await auth()
    if (!session || session.user.role === 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { name, email, password, role, clientId } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // A service-key caller may only ever create a CLIENT-role user tied to a
  // real clientId — never ADMIN/TEAM. The CRM's own ProvisionClientExternallyJob
  // always sends role: 'CLIENT' + clientId; without this check, the request
  // body's own `role` field was previously trusted as-is, letting a leaked
  // key mint a full ADMIN login (see lib/service-key.ts's own docblock for
  // why this matters — this was a real, exploitable backdoor).
  if (isServiceCall && (role !== 'CLIENT' || !clientId)) {
    return NextResponse.json(
      { error: 'Service calls may only create a CLIENT user with a clientId' },
      { status: 400 }
    )
  }

  // CLIENT role creation is allowed from the client edit page (non-ADMIN team members can't create users)
  // but we still require a valid session with at least TEAM role
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      // Belt-and-suspenders alongside the check above: a service call's role
      // is hardcoded here too, never taken from the request body directly.
      role: isServiceCall ? 'CLIENT' : (role ?? 'TEAM'),
      clientId: clientId ?? null
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  })

  return NextResponse.json(user, { status: 201 })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json()
  if (id === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  // Reassign briefs and revisions to the admin performing the deletion so that
  // foreign-key constraints don't block the delete (Brief.createdById and
  // Revision.requestedById have no cascade rule in the schema).
  await prisma.brief.updateMany({
    where: { createdById: id },
    data:  { createdById: session.user.id },
  })
  await prisma.revision.updateMany({
    where: { requestedById: id },
    data:  { requestedById: session.user.id },
  })

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
