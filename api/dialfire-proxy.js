const defaultCampaignUrl = 'https://api.dialfire.com/api/campaigns/P7XGJGFTHAG3U3VJ'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  const campaignUrl = process.env.DIALFIRE_CAMPAIGN_URL || defaultCampaignUrl
  const apiKey = process.env.DIALFIRE_API_KEY

  if (!apiKey) {
    return response.status(500).json({
      error: 'Missing DIALFIRE_API_KEY environment variable.',
    })
  }

  const reportUrl = new URL(`${campaignUrl.replace(/\/$/, '')}/reports`)

  for (const [key, value] of Object.entries(request.query ?? {})) {
    if (typeof value === 'string') {
      reportUrl.searchParams.set(key, value)
    }
  }

  try {
    const dialfireResponse = await fetch(reportUrl, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Dialfire-ApiKey': apiKey,
      },
    })

    const body = await dialfireResponse.text()
    response.status(dialfireResponse.status)

    const contentType = dialfireResponse.headers.get('content-type')
    if (contentType) {
      response.setHeader('content-type', contentType)
    }

    return response.send(body)
  } catch (error) {
    return response.status(502).json({
      error: 'Failed to reach Dialfire reports API.',
      detail: error instanceof Error ? error.message : 'Unknown proxy error',
    })
  }
}
