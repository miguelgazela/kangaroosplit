import { createContext, useContext } from 'react'
import type { Category, ExpenseWithShares, List, RecurringExpense } from '../lib/database.types'

export type SheetActions = {
  // Without a list, the last used one is preselected.
  addExpense: (listId?: string) => void
  editExpense: (expense: ExpenseWithShares) => void
  // The detail sheet: summary, reactions and comments.
  openExpense: (expenseId: string, options?: { focusComment?: boolean }) => void
  // Without a list, settles every active list at once.
  settle: (listId?: string) => void
  newList: () => void
  editList: (list: List) => void
  // Without a rule, creates a new one.
  editRecurring: (rule?: RecurringExpense) => void
  // Without a category, creates a new one.
  editCategory: (category?: Category) => void
}

export const SheetContext = createContext<SheetActions | null>(null)

export function useSheets(): SheetActions {
  const actions = useContext(SheetContext)
  if (!actions) throw new Error('useSheets must be used inside SheetHost')
  return actions
}
