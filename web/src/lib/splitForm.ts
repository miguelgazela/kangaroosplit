import { t } from '../i18n/pt'
import type { ListDefaultShare, Member, ShareInput, SplitMode } from './database.types'
import { formatAmountInput, formatDecimal, formatMoney, parseDecimal, parseMoney } from './format'
import { computeShares, defaultSplit, entriesFromShares, type SplitEntry, type SplitResult } from './split'

// Editor state for a split: the mode, and what is typed for each member (in
// member order). Text is kept as typed so partial input like "33," survives.
export type SplitForm = {
  mode: SplitMode
  texts: string[]
}

function toTexts(mode: SplitMode, entries: SplitEntry[]): string[] {
  return entries.map(({ value }) => {
    if (mode === 'equal' || value === null) return ''
    return mode === 'exact' ? formatAmountInput(value) : formatDecimal(value)
  })
}

function toEntries(form: SplitForm, members: Member[]): SplitEntry[] | null {
  const entries: SplitEntry[] = []
  for (const [index, member] of members.entries()) {
    const text = form.texts[index] ?? ''
    let value: number | null = null
    if (form.mode === 'exact') value = parseMoney(text)
    else if (form.mode !== 'equal') value = parseDecimal(text)
    if (form.mode !== 'equal' && value === null) return null
    entries.push({ userId: member.user_id, value })
  }
  return entries
}

export function splitFormFromDefaults(members: Member[], defaults: ListDefaultShare[]): SplitForm {
  const { mode, entries } = defaultSplit(
    members.map((member) => member.user_id),
    defaults,
  )
  return { mode, texts: toTexts(mode, entries) }
}

export function splitFormFromShares(members: Member[], mode: SplitMode, shares: ShareInput[]): SplitForm {
  const ordered = members.map(
    (member) =>
      shares.find((share) => share.user_id === member.user_id) ?? {
        user_id: member.user_id,
        share_cents: 0,
        input_value: null,
      },
  )
  return { mode, texts: toTexts(mode, entriesFromShares(mode, ordered)) }
}

export function resolveSplit(form: SplitForm, members: Member[], amountCents: number): SplitResult {
  const entries = toEntries(form, members)
  if (!entries) return { ok: false, error: 'invalid_value' }
  return computeShares(form.mode, amountCents, entries)
}

// Switching mode carries the current split over, so nothing jumps.
export function changeMode(form: SplitForm, mode: SplitMode, members: Member[], amountCents: number): SplitForm {
  if (mode === form.mode) return form
  const current = resolveSplit(form, members, amountCents)
  const cents = current.ok ? current.shares.map((share) => share.share_cents) : null

  switch (mode) {
    case 'equal':
      return { mode, texts: members.map(() => '') }
    case 'exact':
      return {
        mode,
        texts: cents ? cents.map(formatAmountInput) : members.map(() => ''),
      }
    case 'percent': {
      if (!cents || amountCents === 0) return { mode, texts: members.map(() => formatDecimal(100 / members.length)) }
      const percents = cents.map((share) => Math.round((share * 10000) / amountCents) / 100)
      // Rounding may leave the total a hair off 100; the last person absorbs it.
      const others = percents.slice(0, -1).reduce((sum, value) => sum + value, 0)
      percents[percents.length - 1] = Math.round((100 - others) * 100) / 100
      return { mode, texts: percents.map(formatDecimal) }
    }
    case 'shares':
      return { mode, texts: members.map(() => '1') }
  }
}

// Typing one person's value fills in the other's with what is left, since
// with two people the second value is never a free choice.
export function changeText(form: SplitForm, index: number, text: string, amountCents: number): SplitForm {
  const texts = form.texts.map((existing, position) => (position === index ? text : existing))
  if (texts.length !== 2) return { ...form, texts }

  const other = index === 0 ? 1 : 0
  if (form.mode === 'percent') {
    const value = parseDecimal(text)
    if (value !== null && value <= 100) texts[other] = formatDecimal(100 - value)
  } else if (form.mode === 'exact') {
    const value = parseMoney(text)
    if (value !== null && value <= amountCents) texts[other] = formatAmountInput(amountCents - value)
  }
  return { ...form, texts }
}

const amounts = (shares: ShareInput[]) => shares.map((share) => formatMoney(share.share_cents)).join(' / ')

// Short form for the quick chip: "60 / 40", "50 / 50", "3 / 2 partes".
export function splitChip(form: SplitForm, result: SplitResult): string {
  switch (form.mode) {
    case 'equal':
      return form.texts.map(() => formatDecimal(100 / form.texts.length)).join(' / ')
    case 'percent':
      return form.texts.join(' / ')
    case 'shares':
      return t.split.sharesSummary(form.texts.join(' / '))
    case 'exact':
      return result.ok ? amounts(result.shares) : t.split.exact
  }
}

// One-line summary for the collapsed "Divisão" row.
export function splitSummary(form: SplitForm, result: SplitResult): string {
  if (!result.ok) return splitError(form, result, true)
  switch (form.mode) {
    case 'equal':
      return t.split.equalSummary(amounts(result.shares))
    case 'exact':
      return amounts(result.shares)
    default:
      return `${splitChip(form, result)} · ${amounts(result.shares)}`
  }
}

function splitError(form: SplitForm, result: Extract<SplitResult, { ok: false }>, short: boolean): string {
  switch (result.error) {
    case 'percent_total':
      return short ? `${form.texts.join(' / ')} · ${t.split.not100Short}` : t.split.not100
    case 'exact_total': {
      const gap =
        result.remaining > 0
          ? t.split.missing(formatMoney(result.remaining))
          : t.split.excess(formatMoney(-result.remaining))
      return short ? gap : `${gap}. ${t.split.mustSum}`
    }
    case 'no_shares':
      return t.split.noShares
    case 'invalid_value':
      return t.split.invalid
  }
}

// Status line under the editor.
export function splitStatus(form: SplitForm, result: SplitResult, amountCents: number): string {
  if (!result.ok) return splitError(form, result, false)
  switch (form.mode) {
    case 'equal':
      return t.split.half
    case 'percent':
      return t.split.sums100
    case 'exact':
      return t.split.sums(formatMoney(amountCents))
    case 'shares': {
      const count = result.shares.reduce((sum, share) => sum + (share.input_value ?? 0), 0)
      return t.split.sharesOf(count, formatMoney(Math.round(amountCents / count)))
    }
  }
}
