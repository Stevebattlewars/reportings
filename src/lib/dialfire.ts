export type DialfireCallRecord = {
  id: string
  time: string
  user: string
  status: string
  durationSeconds: number
  costCents?: number
}

type ReportPayload = {
  records: DialfireCallRecord[]
  fetchedAt: string
}

type UnknownRecord = Record<string, unknown>

const pickString = (record: UnknownRecord, keys: string[], fallback = 'Unknown') => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }
  }

  return fallback
}

const pickNumber = (record: UnknownRecord, keys: string[], fallback = 0) => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value.replace(',', '.'))
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return fallback
}

const normalizeStatus = (status: string) => status.toLowerCase().replace(/\s+/g, '_')

const extractRows = (payload: unknown): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is UnknownRecord => item !== null && typeof item === 'object')
  }

  if (payload === null || typeof payload !== 'object') {
    return []
  }

  const record = payload as UnknownRecord
  const candidates = [record.data, record.rows, record.records, record.items, record.report]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is UnknownRecord => item !== null && typeof item === 'object')
    }
  }

  return []
}

export const normalizeDialfireReport = (payload: unknown): DialfireCallRecord[] => {
  return extractRows(payload).map((record, index) => {
    const time = pickString(
      record,
      ['time', 'timestamp', 'createdAt', 'created_at', 'date', 'callTime', 'call_time'],
      new Date().toISOString(),
    )
    const duration =
      pickNumber(record, ['durationSeconds', 'duration_seconds', 'duration'], 0) ||
      pickNumber(record, ['callDuration', 'call_duration', 'talkTime', 'talk_time'], 0)
    const costCents = pickNumber(record, ['costCents', 'cost_cents'], Number.NaN)
    const costAmount = pickNumber(record, ['cost', 'costs', 'price'], Number.NaN)
    const cost = Number.isFinite(costCents)
      ? costCents
      : Number.isFinite(costAmount)
        ? costAmount * 100
        : undefined

    return {
      id: pickString(record, ['id', 'callId', 'call_id', 'contactId', 'contact_id'], `${time}-${index}`),
      time,
      user: pickString(record, ['user', 'agent', 'agentName', 'agent_name', 'username'], 'Unassigned'),
      status: normalizeStatus(pickString(record, ['status', 'result', 'outcome', 'callStatus'], 'open')),
      durationSeconds: Math.max(0, Math.round(duration)),
      costCents: cost === undefined ? undefined : Math.max(0, Math.round(cost)),
    }
  })
}

export const fetchDialfireReport = async (): Promise<ReportPayload> => {
  const response = await fetch('/api/dialfire-proxy')

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Dialfire proxy failed with ${response.status}`)
  }

  const payload: unknown = await response.json()

  return {
    records: normalizeDialfireReport(payload),
    fetchedAt: new Date().toISOString(),
  }
}
