import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject,
    html
  })
}

// ── Email templates ───────────────────────────────────────────────────────────

export function contentReadyEmail(clientName: string, portalUrl: string) {
  return {
    subject: 'Your content is ready for review',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Hi ${clientName},</h2>
        <p>New social media content has been prepared for your review.</p>
        <p>Please log in to your portal to review, approve, or request revisions.</p>
        <a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#3B82F6;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">
          Review Content
        </a>
        <p style="color:#6B7280;font-size:14px">If the button doesn't work, copy this link: ${portalUrl}</p>
      </div>
    `
  }
}

export function revisionRequestedEmail(teamMemberName: string, clientName: string, platform: string, comment: string, adminUrl: string) {
  return {
    subject: `Revision requested — ${clientName} / ${platform}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Hi ${teamMemberName},</h2>
        <p><strong>${clientName}</strong> has requested a revision for their <strong>${platform}</strong> content.</p>
        <blockquote style="border-left:3px solid #E5E7EB;padding-left:12px;color:#374151;margin:16px 0">
          ${comment}
        </blockquote>
        <a href="${adminUrl}" style="display:inline-block;padding:12px 24px;background:#3B82F6;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">
          View Content
        </a>
      </div>
    `
  }
}

export function approvedEmail(teamMemberName: string, clientName: string, platform: string, adminUrl: string) {
  return {
    subject: `Content approved — ${clientName} / ${platform}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Hi ${teamMemberName},</h2>
        <p><strong>${clientName}</strong> has <strong style="color:#16A34A">approved</strong> their <strong>${platform}</strong> content.</p>
        <a href="${adminUrl}" style="display:inline-block;padding:12px 24px;background:#3B82F6;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">
          View Content
        </a>
      </div>
    `
  }
}
