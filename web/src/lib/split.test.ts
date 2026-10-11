import { describe, expect, it } from 'vitest'
import { computeShares, defaultSplit, entriesFromShares, splitByWeights } from './split'

const A = 'user-a'
const B = 'user-b'
const entries = (a: number | null, b: number | null) => [
  { userId: A, value: a },
  { userId: B, value: b },
]

describe('splitByWeights', () => {
  it('always sums to the amount', () => {
    for (const amount of [1, 7, 99, 100, 1001, 123457]) {
      for (const weights of [[1, 1], [60, 40], [2, 1], [33.33, 66.67], [1, 0], [7, 3]]) {
        const shares = splitByWeights(amount, weights)
        expect(shares.reduce((sum, share) => sum + share, 0)).toBe(amount)
      }
    }
  })

  it('gives the odd cent to the first person on a tie', () => {
    expect(splitByWeights(1001, [1, 1])).toEqual([501, 500])
  })

  it('gives leftover cents to the largest remainder', () => {
    // 100 * 1/3 = 33.33, 100 * 2/3 = 66.67 -> second has larger remainder
    expect(splitByWeights(100, [1, 2])).toEqual([33, 67])
  })

  it('returns zeros when there are no weights to split by', () => {
    expect(splitByWeights(500, [0, 0])).toEqual([0, 0])
  })
})

describe('computeShares', () => {
  it('splits equally without storing an input value', () => {
    expect(computeShares('equal', 1001, entries(null, null))).toEqual({
      ok: true,
      shares: [
        { user_id: A, share_cents: 501, input_value: null },
        { user_id: B, share_cents: 500, input_value: null },
      ],
    })
  })

  it('splits by percentage and keeps what was typed', () => {
    expect(computeShares('percent', 4000, entries(60, 40))).toEqual({
      ok: true,
      shares: [
        { user_id: A, share_cents: 2400, input_value: 60 },
        { user_id: B, share_cents: 1600, input_value: 40 },
      ],
    })
  })

  it('accepts decimal percentages that total 100', () => {
    const result = computeShares('percent', 1000, entries(33.33, 66.67))
    expect(result.ok && result.shares.map((share) => share.share_cents)).toEqual([333, 667])
  })

  it('reports how many percentage points are missing or in excess', () => {
    expect(computeShares('percent', 4000, entries(60, 30))).toEqual({
      ok: false,
      error: 'percent_total',
      remaining: 10,
    })
    expect(computeShares('percent', 4000, entries(60, 50))).toEqual({
      ok: false,
      error: 'percent_total',
      remaining: -10,
    })
  })

  it('accepts exact amounts that total the expense', () => {
    const result = computeShares('exact', 4000, entries(2500, 1500))
    expect(result.ok && result.shares.map((share) => share.share_cents)).toEqual([2500, 1500])
  })

  it('reports cents missing or in excess for exact amounts', () => {
    expect(computeShares('exact', 4000, entries(2500, 1000))).toEqual({
      ok: false,
      error: 'exact_total',
      remaining: 500,
    })
    expect(computeShares('exact', 4000, entries(2500, 2000))).toEqual({
      ok: false,
      error: 'exact_total',
      remaining: -500,
    })
  })

  it('splits by shares', () => {
    const result = computeShares('shares', 3000, entries(2, 1))
    expect(result.ok && result.shares).toEqual([
      { user_id: A, share_cents: 2000, input_value: 2 },
      { user_id: B, share_cents: 1000, input_value: 1 },
    ])
  })

  it('lets one person carry the whole expense', () => {
    const result = computeShares('shares', 3000, entries(0, 1))
    expect(result.ok && result.shares.map((share) => share.share_cents)).toEqual([0, 3000])
  })

  it('rejects all-zero shares and negative values', () => {
    expect(computeShares('shares', 3000, entries(0, 0))).toEqual({ ok: false, error: 'no_shares' })
    expect(computeShares('percent', 3000, entries(-10, 110))).toEqual({ ok: false, error: 'invalid_value' })
  })
})

describe('defaultSplit', () => {
  const share = (user_id: string, weight: number) => ({ list_id: 'list', user_id, weight })

  it('uses equal for matching weights or missing defaults', () => {
    expect(defaultSplit([A, B], [share(A, 1), share(B, 1)]).mode).toBe('equal')
    expect(defaultSplit([A, B], []).mode).toBe('equal')
  })

  it('reads weights totalling 100 as percentages', () => {
    expect(defaultSplit([A, B], [share(B, 40), share(A, 60)])).toEqual({
      mode: 'percent',
      entries: entries(60, 40),
    })
  })

  it('reads other weights as shares', () => {
    expect(defaultSplit([A, B], [share(A, 2), share(B, 1)])).toEqual({
      mode: 'shares',
      entries: entries(2, 1),
    })
  })
})

describe('entriesFromShares', () => {
  it('round-trips through computeShares for every mode', () => {
    const cases = [
      ['equal', entries(null, null)],
      ['percent', entries(60, 40)],
      ['exact', entries(2500, 1500)],
      ['shares', entries(2, 1)],
    ] as const
    for (const [mode, input] of cases) {
      const result = computeShares(mode, 4000, [...input])
      expect(result.ok && entriesFromShares(mode, result.shares)).toEqual(input)
    }
  })
})
