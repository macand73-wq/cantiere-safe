import { describe, it, expect } from 'vitest'
import { recentInspections } from '../recent'

const NOW = new Date('2026-11-07T12:00:00')

function isoDaysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

interface Row {
  id: string
  data?: string
}

describe('recentInspections', () => {
  it('returns only items within N days, newest first', () => {
    const items: Row[] = [
      { id: 'old', data: isoDaysAgo(10) },
      { id: 'mid', data: isoDaysAgo(3) },
      { id: 'new', data: isoDaysAgo(1) },
    ]

    const result = recentInspections(items, 7, NOW)

    expect(result.map((r) => r.id)).toEqual(['new', 'mid'])
  })

  it('includes a record exactly N days ago (inclusive boundary)', () => {
    const items: Row[] = [{ id: 'edge', data: isoDaysAgo(5) }]

    expect(recentInspections(items, 5, NOW).map((r) => r.id)).toEqual(['edge'])
  })

  it('excludes a record just past N days', () => {
    const items: Row[] = [{ id: 'past', data: isoDaysAgo(6) }]

    expect(recentInspections(items, 5, NOW)).toEqual([])
  })

  it('accepts date-only YYYY-MM-DD and ISO datetime strings', () => {
    const items: Row[] = [
      { id: 'dateOnly', data: '2026-11-07' },
      { id: 'iso', data: '2026-11-07T09:00:00' },
    ]

    const result = recentInspections(items, 7, NOW)

    expect(result.map((r) => r.id).sort()).toEqual(['dateOnly', 'iso'])
  })

  it('excludes missing or invalid dates', () => {
    const items: Row[] = [
      { id: 'missing' },
      { id: 'empty', data: '' },
      { id: 'garbage', data: 'not-a-date' },
      { id: 'ok', data: isoDaysAgo(1) },
    ]

    const result = recentInspections(items, 7, NOW)

    expect(result.map((r) => r.id)).toEqual(['ok'])
  })

  it('does not mutate the input array', () => {
    const items: Row[] = [
      { id: 'new', data: isoDaysAgo(1) },
      { id: 'old', data: isoDaysAgo(9) },
    ]
    const before = [...items]

    recentInspections(items, 7, NOW)

    expect(items).toEqual(before)
  })
})
