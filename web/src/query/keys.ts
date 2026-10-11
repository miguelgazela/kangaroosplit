import type { Database } from '../lib/database.types'

export const queryKeys = {
  members: ['members'],
  lists: ['lists'],
  defaultShares: ['defaultShares'],
  categories: ['categories'],
  expenses: ['expenses'],
  settlements: ['settlements'],
  balances: ['balances'],
  recurring: ['recurring'],
  activity: ['activity'],
} as const

type QueryKey = (typeof queryKeys)[keyof typeof queryKeys]
type TableName = keyof Database['kangaroosplit']['Tables']

// Which cached queries a change to each table makes stale. Used for realtime
// events from the other phone and after local writes.
export const keysByTable: Partial<Record<TableName, readonly QueryKey[]>> = {
  members: [queryKeys.members],
  lists: [queryKeys.lists, queryKeys.defaultShares, queryKeys.balances],
  list_default_shares: [queryKeys.defaultShares],
  categories: [queryKeys.categories],
  expenses: [queryKeys.expenses, queryKeys.balances],
  expense_shares: [queryKeys.expenses, queryKeys.balances],
  settlements: [queryKeys.settlements, queryKeys.balances],
  recurring_expenses: [queryKeys.recurring],
  activity: [queryKeys.activity],
}

export const realtimeTables = Object.keys(keysByTable) as TableName[]
