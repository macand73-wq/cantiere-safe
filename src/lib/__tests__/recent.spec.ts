import { describe, it, expect } from 'vitest'
import { recentInspections } from '../recent'

// Local noon, fixed so the tests are timezone-independent.
const NOW = new Date(2026, 10, 7, 12, 0, 0) // 2026-11-07 12:00 local

interface Row {
  id: string
  data?: string
  created?: string
}

describe('recentInspections', () => {
  it('parses the real PocketBase space-separated datetime format', () => {
    const items: Row[] = [
      { id: 'pb', data: '2026-11-07 00:00:00.000Z' },
      { id: 'old', data: '2026-10-20 00:00:00.000Z' },
    ]

    expect(recentInspections(items, 7, NOW).map((r) => r.id)).toEqual(['pb'])
  })

  it('returns only items within N days, newest first', () => {
    const items: Row[] = [
      { id: 'old', data: '2026-11-03' },
      { id: 'mid', data: '2026-11-06' },
      { id: 'new', data: '2026-11-07' },
    ]

    const result = recentInspections(items, 3, NOW)

    expect(result.map((r) => r.id)).toEqual(['new', 'mid'])
  })

  it('includes a record exactly N calendar days ago (UTC midnight), excludes N+1', () => {
    const items: Row[] = [
      { id: 'edge', data: '2026-11-05 00:00:00.000Z' },
      { id: 'past', data: '2026-11-04 00:00:00.000Z' },
    ]

    expect(recentInspections(items, 2, NOW).map((r) => r.id)).toEqual(['edge'])
  })

  it('excludes missing, empty and invalid dates', () => {
    const items: Row[] = [
      { id: 'missing' },
      { id: 'empty', data: '' },
      { id: 'garbage', data: 'not-a-date' },
      { id: 'impossible', data: '2026-02-30' },
      { id: 'ok', data: '2026-11-07' },
    ]

    expect(recentInspections(items, 7, NOW).map((r) => r.id)).toEqual(['ok'])
  })

  it('sorts mixed date-only and datetime strings newest first', () => {
    const items: Row[] = [
      { id: 'dateOnly', data: '2026-11-06' },
      { id: 'isoT', data: '2026-11-07T09:00:00' },
      { id: 'space', data: '2026-11-05 23:59:59.000Z' },
    ]

    expect(recentInspections(items, 7, NOW).map((r) => r.id)).toEqual([
      'isoT',
      'dateOnly',
      'space',
    ])
  })

  it('breaks equal dates by created descending', () => {
    const items: Row[] = [
      { id: 'early', data: '2026-11-07', created: '2026-11-07 08:00:00.000Z' },
      { id: 'late', data: '2026-11-07', created: '2026-11-07 18:00:00.000Z' },
    ]

    expect(recentInspections(items, 7, NOW).map((r) => r.id)).toEqual([
      'late',
      'early',
    ])
  })

  it('does not mutate the input array', () => {
    const items: Row[] = [
      { id: 'new', data: '2026-11-07' },
      { id: 'old', data: '2026-10-01' },
    ]
    const before = [...items]

    recentInspections(items, 7, NOW)

    expect(items).toEqual(before)
  })
})
