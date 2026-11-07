// Framework-free filtering of recent inspections for the Home dashboard.
// Kept out of the Vue store so the date math is unit-testable in isolation.

// A record must expose a `data` string to be considered; `created` is used only
// to break ties between records sharing the same inspection date. Everything
// else about the item is passed through untouched.
interface Dated {
  data?: string
  created?: string
}

// Extracts the leading `YYYY-MM-DD` of a date string. PocketBase serialises
// `date` fields as `"YYYY-MM-DD HH:mm:ss.SSSZ"` (space, not `T`), which
// JavaScriptCore/Safari cannot `Date.parse`; this regex therefore does not rely
// on Date.parse. Returns the normalised date string, or null when the value is
// missing, malformed, or not a real calendar date.
function parseDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  // Rebuild in UTC and round-trip so impossible dates (e.g. 2026-02-30) fail.
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null
  }
  return `${match[1]}-${match[2]}-${match[3]}`
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Returns a new array of items whose inspection `data` is on or after the
// cutoff calendar date (now minus `days`, in local time; the boundary is
// inclusive), sorted newest first. String comparison of ISO `YYYY-MM-DD`
// values matches chronological order and avoids timezone off-by-one. Records
// with a missing or invalid `data` are excluded; equal dates break ties by
// `created` descending, otherwise keeping input order.
export function recentInspections<T extends Dated>(
  items: T[],
  days: number,
  now: Date,
): T[] {
  const cutoff = formatLocalDate(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - days),
  )

  const parsed = items.map((item) => ({
    item,
    date: item.data ? parseDate(item.data) : null,
  }))

  const included = parsed.filter(
    (entry): entry is { item: T; date: string } =>
      entry.date !== null && entry.date >= cutoff,
  )

  included.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    const ca = a.item.created
    const cb = b.item.created
    if (ca && cb && ca !== cb) return ca < cb ? 1 : -1
    return 0
  })

  return included.map((entry) => entry.item)
}
