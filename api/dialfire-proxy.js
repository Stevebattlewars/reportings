const defaultCampaignUrl = 'https://api.dialfire.com/api/campaigns/P7XGJGFTHAG3U3VJ'
const defaultReportPath = '/reports/custom_dashboard/report/de-DE'

const joinUrlPath = (baseUrl, path) => {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '')
  const cleanPath = path.replace(/^\/+/, '')

  return `${cleanBaseUrl}/${cleanPath}`
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  const campaignUrl = process.env.DIALFIRE_CAMPAIGN_URL || defaultCampaignUrl
  const reportPath = process.env.DIALFIRE_REPORT_PATH || defaultReportPath
  const apiKey = process.env.DIALFIRE_API_KEY

  if (!apiKey) {
    return response.status(500).json({
      error: 'Missing DIALFIRE_API_KEY environment variable.',
    })
  }

  const reportUrl = new URL(joinUrlPath(campaignUrl, reportPath))

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
        'X-Api-Key': apiKey,
        'X-Dialfire-ApiKey': apiKey,
        'X-Dialfire-Api-Key': apiKey,
      },
    })

    const body = await dialfireResponse.text()

    if (!dialfireResponse.ok) {
      const isMissingReportConfig = body.includes('Cannot read property "conf" from undefined')

      return response.status(dialfireResponse.status).json({
        error: `Dialfire reports API returned ${dialfireResponse.status} ${dialfireResponse.statusText}.`,
        detail:
          dialfireResponse.status === 403
            ? 'The API key is valid for the campaign, but this report route is forbidden. Check report permissions and ensure DIALFIRE_REPORT_PATH is /reports/custom_dashboard/report/de-DE.'
            : isMissingReportConfig
              ? 'Dialfire reached the custom_dashboard report route, but the report template configuration is still missing or invalid. Check reports/custom_dashboard.json and verify the template has a valid conf object.'
            : body,
        url: reportUrl.toString(),
      })
    }

    response.status(dialfireResponse.status)
    response.setHeader('content-type', dialfireResponse.headers.get('content-type') || 'application/json')

    return response.send(body)
  } catch (error) {
    return response.status(502).json({
      error: 'Failed to reach Dialfire reports API.',
      detail: error instanceof Error ? error.message : 'Unknown proxy error',
    })
  }
}
