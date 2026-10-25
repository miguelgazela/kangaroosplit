import { useMemo, useSyncExternalStore } from 'react'
import {
  useCategories,
  useComments,
  useExpenses,
  useLists,
  useMembers,
  useReactions,
  useSettlements,
} from '../query/hooks'
import { todayISO } from './dates'
import { MIN_EXPENSES, expensesOfYear, reviewYearFor, yearSummary, type YearSummary } from './yearSummary'

const DISMISSED_KEY = 'ks.yearReviewDismissed'
// Local testing only: pretend today is another day (YYYY-MM-DD), so the
// Início card and the Estatísticas row can be seen outside December.
const DEV_TODAY_KEY = 'ks.devToday'

export function reviewToday(): string {
  if (import.meta.env.DEV) {
    try {
      const value = localStorage.getItem(DEV_TODAY_KEY)
      if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    } catch {
      // Storage blocked: use the real date.
    }
  }
  return todayISO()
}

// The whole summary, worked out once per change of the cached data.
export function useYearSummary(year: number): YearSummary | null {
  const { data: members } = useMembers()
  const { data: lists } = useLists()
  const { data: categories } = useCategories()
  const { data: expenses } = useExpenses()
  const { data: settlements } = useSettlements()
  const { data: reactions } = useReactions()
  const { data: comments } = useComments()
  const today = reviewToday()

  return useMemo(() => {
    if (!members || !lists || !categories || !expenses || !settlements || !reactions || !comments) return null
    return yearSummary({ year, today, members, lists, categories, expenses, settlements, reactions, comments })
  }, [year, today, members, lists, categories, expenses, settlements, reactions, comments])
}

// The year the entry points offer right now, if it has enough expenses.
export function useOfferedYear(): number | null {
  const { data: expenses } = useExpenses()
  const today = reviewToday()
  const year = reviewYearFor(today)
  if (year === null || !expenses) return null
  return expensesOfYear(expenses, year, today).length >= MIN_EXPENSES ? year : null
}

// The Início card can be closed; it stays hidden until the next year's summary.
const listeners = new Set<() => void>()
// Fallback when storage is blocked: hidden for this session only.
let dismissedInMemory: string | null = null

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY) ?? dismissedInMemory
  } catch {
    return dismissedInMemory
  }
}

export function useCardDismissed(year: number | null): [boolean, () => void] {
  const stored = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    readDismissed,
  )
  const dismiss = () => {
    if (year === null) return
    dismissedInMemory = String(year)
    try {
      localStorage.setItem(DISMISSED_KEY, String(year))
    } catch {
      // Storage blocked: the in-memory value covers this session.
    }
    listeners.forEach((listener) => listener())
  }
  return [year !== null && stored === String(year), dismiss]
}
