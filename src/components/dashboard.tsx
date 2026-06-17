import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  Activity,
  BarChart3,
  Clock3,
  Euro,
  Filter,
  Headphones,
  RefreshCw,
  Target,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { type DialfireCallRecord, fetchDialfireReport } from '../lib/dialfire'

const defaultCostPerCall = Number(import.meta.env.VITE_DEFAULT_COST_PER_CALL_CENTS ?? 10)
const costStorageKey = 'dialfire-cost-per-call-cents'

type Filters = {
  user: string
  status: string
  from: string
  to: string
}

type KpiCardProps = {
  label: string
  value: string
  helper: string
  icon: ComponentType<{ className?: string }>
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)

const formatDateTime = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

const getDateInputValue = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}

const isSuccessfulStatus = (status: string) =>
  ['success', 'successful', 'sale', 'sold', 'completed', 'done'].includes(status)

const statusClasses = (status: string) => {
  if (isSuccessfulStatus(status)) {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
  }

  if (['failed', 'declined', 'cancelled', 'canceled', 'error'].includes(status)) {
    return 'border-rose-400/30 bg-rose-400/10 text-rose-200'
  }

  return 'border-sky-400/30 bg-sky-400/10 text-sky-200'
}

const KpiCard = ({ label, value, helper, icon: Icon }: KpiCardProps) => (
  <section className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 shadow-glow backdrop-blur-xl">
    <div className="flex items-center justify-between gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-sky-200">
        <Icon className="h-5 w-5" />
      </div>
      <Activity className="h-4 w-4 text-slate-500" />
    </div>
    <div className="mt-6">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </div>
  </section>
)

export const Dashboard = () => {
  const [records, setRecords] = useState<DialfireCallRecord[]>([])
  const [filters, setFilters] = useState<Filters>({ user: 'all', status: 'all', from: '', to: '' })
  const [costPerCall, setCostPerCall] = useState(() => {
    const stored = window.localStorage.getItem(costStorageKey)
    const parsed = stored ? Number.parseFloat(stored) : defaultCostPerCall

    return Number.isFinite(parsed) ? parsed : defaultCostPerCall
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)

  const loadReport = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const report = await fetchDialfireReport()
      setRecords(report.records)
      setFetchedAt(report.fetchedAt)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not load Dialfire report.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadReport()
    }, 0)

    return () => window.clearTimeout(loadTimer)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(costStorageKey, String(costPerCall))
  }, [costPerCall])

  const users = useMemo(
    () => Array.from(new Set(records.map((record) => record.user))).sort(),
    [records],
  )
  const statuses = useMemo(
    () => Array.from(new Set(records.map((record) => record.status))).sort(),
    [records],
  )

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const recordDate = getDateInputValue(record.time)
      const matchesUser = filters.user === 'all' || record.user === filters.user
      const matchesStatus = filters.status === 'all' || record.status === filters.status
      const matchesFrom = !filters.from || recordDate >= filters.from
      const matchesTo = !filters.to || recordDate <= filters.to

      return matchesUser && matchesStatus && matchesFrom && matchesTo
    })
  }, [filters, records])

  const totalCalls = filteredRecords.length
  const successCount = filteredRecords.filter((record) => isSuccessfulStatus(record.status)).length
  const successRate = totalCalls > 0 ? Math.round((successCount / totalCalls) * 100) : 0
  const reportCost = filteredRecords.reduce((sum, record) => sum + (record.costCents ?? 0), 0)
  const hasReportCosts = filteredRecords.some((record) => record.costCents !== undefined)
  const estimatedCost = hasReportCosts ? reportCost : totalCalls * costPerCall
  const totalDuration = filteredRecords.reduce((sum, record) => sum + record.durationSeconds, 0)

  const chartData = useMemo(() => {
    const buckets = new Map<string, number>()

    for (const record of filteredRecords) {
      const date = new Date(record.time)
      const key = Number.isNaN(date.getTime())
        ? 'Unknown'
        : new Intl.DateTimeFormat('de-DE', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
          }).format(date)
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }

    return Array.from(buckets, ([time, calls]) => ({ time, calls })).slice(-24)
  }, [filteredRecords])

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 shadow-glow backdrop-blur-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-sm text-sky-200">
                <Headphones className="h-4 w-4" />
                Real-time Dialfire Reporting
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Dialfire Campaign Performance Dashboard
              </h1>
              <p className="mt-4 max-w-2xl text-slate-400">
                Track calls, outcomes, agent activity, and projected spend from the Dialfire reports API.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadReport()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-300/30 bg-sky-400/15 px-5 py-3 text-sm font-medium text-sky-100 transition hover:bg-sky-400/25 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh report
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={BarChart3}
            label="Total Calls"
            value={String(totalCalls)}
            helper="Anzahl der Anrufe gesamt"
          />
          <KpiCard
            icon={Target}
            label="Success Rate"
            value={`${successRate}%`}
            helper={`${successCount} successful outcomes`}
          />
          <KpiCard
            icon={Euro}
            label="Cost Tracker"
            value={formatCurrency(estimatedCost)}
            helper={hasReportCosts ? 'From report costs' : `${costPerCall} ct per call estimate`}
          />
          <KpiCard
            icon={Clock3}
            label="Talk Time"
            value={formatDuration(totalDuration)}
            helper="Summed call duration"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-2">
              <Filter className="h-5 w-5 text-sky-200" />
              <h2 className="text-lg font-semibold text-white">Live Filters</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-400">
                User / Agent
                <select
                  value={filters.user}
                  onChange={(event) => setFilters((current) => ({ ...current, user: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none ring-sky-400/40 focus:ring-2"
                >
                  <option value="all">All users</option>
                  {users.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-slate-400">
                Status
                <select
                  value={filters.status}
                  onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none ring-sky-400/40 focus:ring-2"
                >
                  <option value="all">All statuses</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-slate-400">
                From
                <input
                  type="date"
                  value={filters.from}
                  onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none ring-sky-400/40 focus:ring-2"
                />
              </label>

              <label className="space-y-2 text-sm text-slate-400">
                To
                <input
                  type="date"
                  value={filters.to}
                  onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none ring-sky-400/40 focus:ring-2"
                />
              </label>

              <label className="space-y-2 text-sm text-slate-400 sm:col-span-2">
                Fallback cost per call in cents
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={costPerCall}
                  onChange={(event) => setCostPerCall(Number.parseFloat(event.target.value) || 0)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none ring-sky-400/40 focus:ring-2"
                />
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Call Volume</h2>
                <p className="text-sm text-slate-500">Hourly/daily buckets from available timestamps</p>
              </div>
              <Users className="h-5 w-5 text-slate-500" />
            </div>

            <div className="h-72 min-w-0">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={288} minWidth={0} minHeight={288}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                    <XAxis dataKey="time" stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(14, 165, 233, 0.08)' }}
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '16px',
                        color: '#e2e8f0',
                      }}
                    />
                    <Bar dataKey="calls" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/30 px-6 text-center text-sm text-slate-500">
                  Call volume appears here after Dialfire returns report rows.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.07] backdrop-blur-xl">
          <div className="flex flex-col gap-2 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Reporting Log</h2>
              <p className="text-sm text-slate-500">
                {fetchedAt ? `Last updated ${formatDateTime(fetchedAt)}` : 'Waiting for the first report load'}
              </p>
            </div>
            <span className="text-sm text-slate-400">{filteredRecords.length} rows</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-slate-950/40 text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Zeit</th>
                  <th className="px-5 py-4 font-medium">User</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Call Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="transition hover:bg-white/[0.04]">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-300">{formatDateTime(record.time)}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-white">{record.user}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className={`rounded-full border px-3 py-1 text-xs ${statusClasses(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-300">
                      {formatDuration(record.durationSeconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No report rows match the current filters.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
