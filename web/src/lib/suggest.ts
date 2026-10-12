import type { ExpenseWithShares } from './database.types'
import { normalize } from './stats'

export type Suggestion = {
  description: string
  // The category this description was most often filed under.
  categoryId: string
  count: number
}

// One entry per distinct description (ignoring case and accents), with its
// usual category. Expects expenses newest first, so the spelling kept is the
// most recent one.
export function descriptionHistory(expenses: ExpenseWithShares[]): Suggestion[] {
  const groups = new Map<string, { description: string; count: number; categories: Map<string, number> }>()
  for (const expense of expenses) {
    const key = normalize(expense.description.trim())
    if (key === '') continue
    let group = groups.get(key)
    if (!group) {
      group = { description: expense.description.trim(), count: 0, categories: new Map() }
      groups.set(key, group)
    }
    group.count += 1
    group.categories.set(expense.category_id, (group.categories.get(expense.category_id) ?? 0) + 1)
  }
  return [...groups.values()].map(({ description, count, categories }) => ({
    description,
    count,
    categoryId: [...categories].sort((a, b) => b[1] - a[1])[0][0],
  }))
}

// Past descriptions matching what has been typed: those starting with it
// first, then those containing it, most used first. Empty when nothing is
// typed, or when the only match is exactly what is already there.
export function suggestDescriptions(history: Suggestion[], query: string, limit = 4): Suggestion[] {
  const typed = normalize(query.trim())
  if (typed === '') return []
  const matches = history
    .map((suggestion) => ({ suggestion, position: normalize(suggestion.description).indexOf(typed) }))
    .filter(({ position }) => position !== -1)
    .sort(
      (a, b) =>
        Number(a.position !== 0) - Number(b.position !== 0) || b.suggestion.count - a.suggestion.count,
    )
    .slice(0, limit)
    .map(({ suggestion }) => suggestion)
  return matches.length === 1 && matches[0].description === query.trim() ? [] : matches
}

// The usual category for exactly this description, if it has been used before.
export function knownCategory(history: Suggestion[], description: string): string | null {
  const typed = normalize(description.trim())
  if (typed === '') return null
  return history.find((suggestion) => normalize(suggestion.description) === typed)?.categoryId ?? null
}
