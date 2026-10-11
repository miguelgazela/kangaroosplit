import type { ListDefaultShare, ShareInput, SplitMode } from './database.types'

// What the user entered for one person. Meaning of `value` depends on mode:
// percent -> percentage, exact -> cents, shares -> share count, equal -> ignored.
export type SplitEntry = {
  userId: string
  value: number | null
}

export type SplitResult =
  | { ok: true; shares: ShareInput[] }
  // remaining > 0: still to assign; remaining < 0: over-assigned.
  // Unit is percentage points for 'percent_total' and cents for 'exact_total'.
  | { ok: false; error: 'percent_total' | 'exact_total'; remaining: number }
  | { ok: false; error: 'no_shares' | 'invalid_value' }

// Weights may carry up to 2 decimals (e.g. 33.33 %); scaled to integers so the
// arithmetic below stays exact.
const WEIGHT_SCALE = 100

// Splits an amount by weights. Shares always sum exactly to amountCents;
// leftover cents go to the largest remainders, ties to the earliest index.
export function splitByWeights(amountCents: number, weights: number[]): number[] {
  const scaled = weights.map((weight) => Math.round(weight * WEIGHT_SCALE))
  const total = scaled.reduce((sum, weight) => sum + weight, 0)
  if (total <= 0) return weights.map(() => 0)

  const shares = scaled.map((weight) => Math.floor((amountCents * weight) / total))
  let leftover = amountCents - shares.reduce((sum, share) => sum + share, 0)

  const byRemainder = scaled
    .map((weight, index) => ({ index, remainder: (amountCents * weight) % total }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)

  for (const { index } of byRemainder) {
    if (leftover <= 0) break
    shares[index] += 1
    leftover -= 1
  }
  return shares
}

function fromWeights(amountCents: number, entries: SplitEntry[], weights: number[], keepInput: boolean): SplitResult {
  const cents = splitByWeights(amountCents, weights)
  return {
    ok: true,
    shares: entries.map((entry, index) => ({
      user_id: entry.userId,
      share_cents: cents[index],
      input_value: keepInput ? weights[index] : null,
    })),
  }
}

export function computeShares(mode: SplitMode, amountCents: number, entries: SplitEntry[]): SplitResult {
  if (mode === 'equal') {
    return fromWeights(amountCents, entries, entries.map(() => 1), false)
  }

  const values = entries.map((entry) => entry.value ?? 0)
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    return { ok: false, error: 'invalid_value' }
  }

  switch (mode) {
    case 'percent': {
      const totalScaled = values.reduce((sum, value) => sum + Math.round(value * WEIGHT_SCALE), 0)
      if (totalScaled !== 100 * WEIGHT_SCALE) {
        return { ok: false, error: 'percent_total', remaining: (100 * WEIGHT_SCALE - totalScaled) / WEIGHT_SCALE }
      }
      return fromWeights(amountCents, entries, values, true)
    }
    case 'exact': {
      if (values.some((value) => !Number.isInteger(value))) {
        return { ok: false, error: 'invalid_value' }
      }
      const total = values.reduce((sum, value) => sum + value, 0)
      if (total !== amountCents) {
        return { ok: false, error: 'exact_total', remaining: amountCents - total }
      }
      return {
        ok: true,
        shares: entries.map((entry, index) => ({
          user_id: entry.userId,
          share_cents: values[index],
          input_value: null,
        })),
      }
    }
    case 'shares': {
      if (values.every((value) => value === 0)) {
        return { ok: false, error: 'no_shares' }
      }
      return fromWeights(amountCents, entries, values, true)
    }
  }
}

// Starting point for a new expense, from the list's default ratio.
// Weights summing to 100 read as percentages (60 / 40), anything else as shares (2 / 1).
export function defaultSplit(
  memberIds: string[],
  defaults: ListDefaultShare[],
): { mode: SplitMode; entries: SplitEntry[] } {
  const weights = memberIds.map(
    (userId) => defaults.find((share) => share.user_id === userId)?.weight ?? 1,
  )
  const total = weights.reduce((sum, weight) => sum + weight, 0)

  if (total === 0 || weights.every((weight) => weight === weights[0])) {
    return { mode: 'equal', entries: memberIds.map((userId) => ({ userId, value: null })) }
  }
  return {
    mode: total === 100 ? 'percent' : 'shares',
    entries: memberIds.map((userId, index) => ({ userId, value: weights[index] })),
  }
}

// Rebuilds editor entries from stored shares, for editing an existing expense.
export function entriesFromShares(mode: SplitMode, shares: ShareInput[]): SplitEntry[] {
  return shares.map((share) => ({
    userId: share.user_id,
    value: mode === 'exact' ? share.share_cents : mode === 'equal' ? null : share.input_value,
  }))
}
