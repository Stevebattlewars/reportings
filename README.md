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

- `DIALFIRE_CAMPAIGN_URL`
- `DIALFIRE_REPORT_PATH`
- `DIALFIRE_API_KEY`
- `VITE_DEFAULT_COST_PER_CALL_CENTS`

`DIALFIRE_REPORT_PATH` defaults to `/reports`. If Dialfire returns `403` for that route, set it to the exact report template route from Dialfire, for example `/reports/{template_name}/report/{locale}`.
