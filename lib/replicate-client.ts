import Replicate from 'replicate'

// Server-only — never import in client components
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

export default replicate
