// Brand voice prompt block — shared by every content-generation module
// (organic content, ad copy, blog). Injects the client's Brand Voice Profile
// into the Claude prompt so generated content stays on-brand.

export function buildBrandVoiceSection(client: {
  brandKeywords?: string | null
  contentDos?: string | null
  contentDonts?: string | null
  competitorsToAvoid?: string | null
  preferredHashtags?: string | null
}): string {
  const parts: string[] = []
  if (client.brandKeywords) {
    parts.push(`- Tone Keywords: ${client.brandKeywords}`)
  }
  if (client.contentDos) {
    const lines = client.contentDos.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length) parts.push(`- Always Do:\n${lines.map(l => `  • ${l}`).join('\n')}`)
  }
  if (client.contentDonts) {
    const lines = client.contentDonts.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length) parts.push(`- Never Do:\n${lines.map(l => `  • ${l}`).join('\n')}`)
  }
  if (client.competitorsToAvoid) {
    parts.push(`- Do NOT sound like these brands: ${client.competitorsToAvoid}`)
  }
  if (client.preferredHashtags) {
    parts.push(`- Preferred hashtags to consider: ${client.preferredHashtags}`)
  }
  if (!parts.length) return ''
  return `\n\nBRAND VOICE RULES (strictly follow for all content):\n${parts.join('\n')}`
}
