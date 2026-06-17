import fs from 'node:fs'
import process from 'node:process'

const defaultTemplates = [
  'main',
  'statistic',
  'statistics',
  'campaign_overview',
  'outbound',
  'default',
]

const loadEnvFile = (path) => {
  if (!fs.existsSync(path)) {
    return {}
  }

  return Object.fromEntries(
    fs
      .readFileSync(path, 'utf8')
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split(/=(.*)/s).slice(0, 2)),
  )
}

const env = {
  ...loadEnvFile('.env.local'),
  ...process.env,
}

const campaignUrl = env.DIALFIRE_CAMPAIGN_URL?.replace(/\/+$/, '')
const apiKey = env.DIALFIRE_API_KEY
const templates = process.argv.slice(2).length > 0 ? process.argv.slice(2) : defaultTemplates

if (!campaignUrl || !apiKey) {
  console.error('Missing DIALFIRE_CAMPAIGN_URL or DIALFIRE_API_KEY.')
  process.exit(1)
}

const headers = {
  Accept: 'application/json',
  Authorization: `Bearer ${apiKey}`,
  'X-Api-Key': apiKey,
  'X-Dialfire-ApiKey': apiKey,
  'X-Dialfire-Api-Key': apiKey,
}

for (const template of templates) {
  for (const kind of ['metadata', 'report']) {
    const path = `/reports/${template}/${kind}/de-DE`
    const response = await fetch(`${campaignUrl}${path}`, { headers })
    const text = await response.text()
    let summary = text.slice(0, 220).replace(/\s+/g, ' ')

    try {
      const json = JSON.parse(text)
      summary = `JSON keys: ${Object.keys(json).slice(0, 20).join(', ')}`
    } catch {
      // Non-JSON responses are expected when Dialfire returns template errors.
    }

    console.log(`${path} -> ${response.status} ${response.statusText} | ${summary}`)
  }
}
