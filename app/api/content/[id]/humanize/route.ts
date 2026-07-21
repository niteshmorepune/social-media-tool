import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { runHumanizeAndCheck } from '@/lib/humanize'

const HUMANIZABLE_TYPES = ['BLOG_POST', 'LANDING_PAGE']

// Team-only: rewrite a blog post's or landing page's body to read more
// naturally and spot-check it against live web search for close matches.
// Overwrites body in place (like a regenerate) and logs a Revision so the
// change is visible in history.
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const content = await prisma.content.findUnique({
    where: { id },
    include: { briefPlatform: true },
  })

  if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!HUMANIZABLE_TYPES.includes(content.contentType) || !content.body) {
    return NextResponse.json({ error: 'Humanize & Check only applies to a blog post or landing page with a body' }, { status: 400 })
  }

  let result
  try {
    result = await runHumanizeAndCheck(content.body, content.briefPlatform.targetKeyword)
  } catch (err) {
    console.error('Humanize & Check error:', err)
    return NextResponse.json({ error: 'Humanize & Check failed — try again' }, { status: 500 })
  }

  const originalityNotes = result.flags.length
    ? result.flags.map(f => `"${f.excerpt}" — ${f.note} (${f.sourceUrl})`).join('\n')
    : 'No close matches found in a live web check.'

  const updated = await prisma.content.update({
    where: { id },
    data: {
      body:             result.revisedBody,
      originalityScore: result.originalityScore,
      originalityNotes,
      humanizedAt:      new Date(),
    },
  })

  await prisma.revision.create({
    data: {
      contentId:     id,
      requestedById: session.user.id,
      comment:       `Humanized & originality-checked — ${result.flags.length} flag(s) found.`,
    },
  })

  return NextResponse.json(updated)
}
