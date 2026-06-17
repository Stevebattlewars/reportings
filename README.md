# Dialfire Reporting Dashboard

Real-time reporting dashboard for a Dialfire campaign, built with React, Vite, Tailwind CSS, Lucide icons, and Recharts.

## Features

- KPI cards for total calls, success rate, cost tracking, and talk time.
- Live filters for user, status, and date range.
- Call-volume chart using Recharts.
- Detailed reporting table for time, agent, status, and call duration.
- Vercel serverless proxy for secure Dialfire API access.

## Local Development

```sh
npm install
npm run dev
```

Create `.env.local` from `.env.example` and set the Dialfire API key before testing the proxy.

## Vercel Deployment

Use these settings:

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

Required environment variables:

- `DIALFIRE_CAMPAIGN_URL=https://api.dialfire.com/api/campaigns/P7XGJGFTHAG3U3VJ`
- `DIALFIRE_REPORT_PATH=/reports/custom_dashboard/report/de-DE`
- `DIALFIRE_API_KEY=<Dialfire API token>`
- `VITE_DEFAULT_COST_PER_CALL_CENTS=10`

The report path targets the explicit `custom_dashboard` report template with German locale. The proxy joins `DIALFIRE_CAMPAIGN_URL` and `DIALFIRE_REPORT_PATH` into `https://api.dialfire.com/api/campaigns/P7XGJGFTHAG3U3VJ/reports/custom_dashboard/report/de-DE`.
