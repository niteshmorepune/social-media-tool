import Anthropic from '@anthropic-ai/sdk'

// Server-only — never import this in client components
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

export default anthropic
