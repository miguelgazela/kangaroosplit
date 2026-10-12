import type { Category, ExpenseWithShares, List, Member, Settlement } from './database.types'

// Excel in a Portuguese locale expects semicolons between columns and a comma
// as the decimal separator.
const SEPARATOR = ';'

const amount = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')

function cell(value: string): string {
  return /[";\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

// Every expense and payment as CSV, oldest first, one row each.
export function buildCsv(data: {
  members: Member[]
  lists: List[]
  categories: Category[]
  expenses: ExpenseWithShares[]
  settlements: Settlement[]
}): string {
  const { members, lists, categories, expenses, settlements } = data
  const name = (userId: string) => members.find((member) => member.user_id === userId)?.display_name ?? ''
  const list = (id: string) => lists.find((candidate) => candidate.id === id)?.name ?? ''
  const category = (id: string) => categories.find((candidate) => candidate.id === id)?.name ?? ''

  const header = [
    'Data',
    'Lista',
    'Tipo',
    'Descrição',
    'Categoria',
    'Valor',
    'Pago por',
    ...members.map((member) => `Parte ${member.display_name}`),
    'Recebido por',
    'Nota',
  ]

  const rows = [
    ...expenses.map((expense) => ({
      date: expense.spent_on,
      createdAt: expense.created_at,
      cells: [
        expense.spent_on,
        list(expense.list_id),
        'Despesa',
        expense.description,
        category(expense.category_id),
        amount(expense.amount_cents),
        name(expense.paid_by),
        ...members.map((member) =>
          amount(expense.expense_shares.find((share) => share.user_id === member.user_id)?.share_cents ?? 0),
        ),
        '',
        expense.note ?? '',
      ],
    })),
    ...settlements.map((settlement) => ({
      date: settlement.settled_on,
      createdAt: settlement.created_at,
      cells: [
        settlement.settled_on,
        list(settlement.list_id),
        'Pagamento',
        '',
        '',
        amount(settlement.amount_cents),
        name(settlement.from_user),
        ...members.map(() => ''),
        name(settlement.to_user),
        settlement.note ?? '',
      ],
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))

  return [header, ...rows.map((row) => row.cells)].map((cells) => cells.map(cell).join(SEPARATOR)).join('\r\n')
}

// Hands the file to the system: the share sheet on iPhone ("Guardar em
// Ficheiros", AirDrop, Mail), a normal download elsewhere.
export async function saveCsv(csv: string, filename: string): Promise<void> {
  // The byte-order mark makes Excel read accents correctly.
  const file = new File(['﻿', csv], filename, { type: 'text/csv' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
    } catch (error) {
      // Closing the share sheet is not a failure.
      if (!(error instanceof DOMException && error.name === 'AbortError')) throw error
    }
    return
  }

  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
