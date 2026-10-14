import { useMemo, useState, type ReactNode } from 'react'
import type { Category, ExpenseWithShares, List, RecurringExpense } from '../lib/database.types'
import { CategorySheet } from './CategorySheet'
import { ExpenseDetailSheet } from './ExpenseDetailSheet'
import { ExpenseSheet } from './ExpenseSheet'
import { ListSheet } from './ListSheet'
import { SettleSheet } from './SettleSheet'
import { SheetContext, type SheetActions } from './SheetContext'

type Open = { key: number } & (
  | { kind: 'expense'; listId?: string; expense?: ExpenseWithShares; copyFrom?: ExpenseWithShares }
  | { kind: 'detail'; expenseId: string; focusComment: boolean }
  | { kind: 'settle'; listId?: string }
  | { kind: 'list'; list?: List }
  | { kind: 'recurring'; rule?: RecurringExpense }
  | { kind: 'category'; category?: Category }
)

// Owns whichever sheet is open, so any screen can open one.
export function SheetHost({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null)
  const close = () => setOpen(null)

  const actions = useMemo<SheetActions>(
    () => ({
      addExpense: (listId) => setOpen({ kind: 'expense', key: Date.now(), listId }),
      editExpense: (expense) => setOpen({ kind: 'expense', key: Date.now(), expense }),
      openExpense: (expenseId, options) =>
        setOpen({ kind: 'detail', key: Date.now(), expenseId, focusComment: options?.focusComment ?? false }),
      settle: (listId) => setOpen({ kind: 'settle', key: Date.now(), listId }),
      newList: () => setOpen({ kind: 'list', key: Date.now() }),
      editList: (list) => setOpen({ kind: 'list', key: Date.now(), list }),
      editRecurring: (rule) => setOpen({ kind: 'recurring', key: Date.now(), rule }),
      editCategory: (category) => setOpen({ kind: 'category', key: Date.now(), category }),
    }),
    [],
  )

  return (
    <SheetContext value={actions}>
      {children}
      {open?.kind === 'expense' && (
        <ExpenseSheet
          key={open.key}
          listId={open.listId}
          expense={open.expense}
          copyFrom={open.copyFrom}
          onDuplicate={(copyFrom) => setOpen({ kind: 'expense', key: Date.now(), copyFrom })}
          onClose={close}
        />
      )}
      {open?.kind === 'detail' && (
        <ExpenseDetailSheet
          key={open.key}
          expenseId={open.expenseId}
          focusComment={open.focusComment}
          onEdit={(expense) => setOpen({ kind: 'expense', key: Date.now(), expense })}
          onClose={close}
        />
      )}
      {open?.kind === 'settle' && <SettleSheet key={open.key} listId={open.listId} onClose={close} />}
      {open?.kind === 'list' && <ListSheet key={open.key} list={open.list} onClose={close} />}
      {open?.kind === 'recurring' && <ExpenseSheet key={open.key} recurring={{ rule: open.rule }} onClose={close} />}
      {open?.kind === 'category' && <CategorySheet key={open.key} category={open.category} onClose={close} />}
    </SheetContext>
  )
}
