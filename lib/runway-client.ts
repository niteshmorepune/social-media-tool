import RunwayML from '@runwayml/sdk'

// Server-only — never import in client components
const runway = new RunwayML({
  apiKey: process.env.RUNWAYML_API_SECRET!,
})

export default runway
