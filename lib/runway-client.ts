import RunwayML from '@runwayml/sdk'

let _runway: RunwayML | null = null

function getRunway(): RunwayML {
  if (!_runway) {
    _runway = new RunwayML({ apiKey: process.env.RUNWAYML_API_SECRET! })
  }
  return _runway
}

export default getRunway
