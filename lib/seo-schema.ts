/**
 * Schema.org JSON-LD builders for Blog Post / Landing Page content.
 *
 * Deliberately NOT an AI call — this is a pure mapping of fields the team
 * already reviewed/edited (title, metaDescription, slug), so a deterministic
 * function is both cheaper and more reliable than asking Claude to hand-write
 * valid JSON (see lib/humanize.ts's history: hand-typed JSON from a model is
 * exactly the failure mode that bit the Humanize step before it switched to
 * tool-calling — no reason to introduce that risk here when there's nothing
 * to "generate," only to map).
 */

export interface SchemaClient {
  name: string
  website?: string | null
}

function joinUrl(website: string | null | undefined, path: string | null | undefined, prefix: string): string | undefined {
  if (!website || !path) return undefined
  return `${website.replace(/\/$/, '')}/${prefix}${path}`
}

export function buildArticleSchema(params: {
  title: string
  metaDescription: string | null
  slug: string | null
  client: SchemaClient
  createdAt: Date | string
  updatedAt: Date | string
}): object {
  const { title, metaDescription, slug, client, createdAt, updatedAt } = params
  const url = joinUrl(client.website, slug, 'blog/')

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    ...(metaDescription ? { description: metaDescription } : {}),
    author: { '@type': 'Organization', name: client.name },
    publisher: { '@type': 'Organization', name: client.name },
    datePublished: new Date(createdAt).toISOString(),
    dateModified: new Date(updatedAt).toISOString(),
    ...(url ? { mainEntityOfPage: url } : {}),
  }
}

export function buildServiceSchema(params: {
  title: string
  metaDescription: string | null
  slug: string | null
  client: SchemaClient
}): object {
  const { title, metaDescription, slug, client } = params
  const url = joinUrl(client.website, slug, '')

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: title,
    ...(metaDescription ? { description: metaDescription } : {}),
    provider: {
      '@type': 'Organization',
      name: client.name,
      ...(client.website ? { url: client.website } : {}),
    },
    ...(url ? { url } : {}),
  }
}
