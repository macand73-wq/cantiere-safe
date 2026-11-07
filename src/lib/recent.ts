// Framework-free filtering of recent inspections for the Home dashboard.
// Kept out of the Vue store so the date math is unit-testable in isolation.

// A record must expose a `data` string to be considered; everything else about
// the item is passed through untouched.
interface Dated {
  data?: string
}

const DAY_MS = 24 * 60 * 60 * 1000

function toTimestamp(value: string): number | null {
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : time
}

// Returns a new array of items whose `data` falls within `now - days` (the
// boundary is inclusive: a record exactly `days` ago still counts), sorted
// newest first. Records with a missing or unparseable `data` are excluded.
// `data` may be a date-only `YYYY-MM-DD` or an ISO datetime.
export function recentInspections<T extends Dated>(
  items: T[],
  days: number,
  now: Date,
): T[] {
  const cutoff = now.getTime() - days * DAY_MS
  const withTime = items
    .map((item) => ({ item, time: item.data ? toTimestamp(item.data) : null }))
    .filter((entry): entry is { item: T; time: number } => entry.time !== null && entry.time >= cutoff)

  withTime.sort((a, b) => b.time - a.time)
  return withTime.map((entry) => entry.item)
}
