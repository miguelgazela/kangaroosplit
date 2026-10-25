import type {
  Category,
  ExpenseComment,
  ExpenseReaction,
  ExpenseWithShares,
  List,
  Member,
  Settlement,
} from './database.types'
import { parseISODate } from './dates'

// The year in review ("O vosso 2026"): every number the stories show, worked
// out on the client from data the app already caches. See design/README.md,
// "Year in review".

// Entry points show only for a year with at least this many expenses.
export const MIN_EXPENSES = 20

export type YearSummaryInput = {
  year: number
  today: string
  members: Member[]
  lists: List[]
  categories: Category[]
  expenses: ExpenseWithShares[]
  settlements: Settlement[]
  reactions: ExpenseReaction[]
  comments: ExpenseComment[]
}

export type CategoryTotal = { categoryId: string; totalCents: number; count: number }
export type PayerTotal = { userId: string; totalCents: number; count: number }
export type Moment = { description: string; categoryId: string; amountCents: number; spentOn: string }

export type YearSummary = {
  year: number
  expenseCount: number
  totalCents: number
  // Days of the year so far: all of them once the year is over.
  days: number
  perDayCents: number
  // Lists with at least one expense, biggest first. Archived ones count too.
  lists: List[]
  // Biggest first.
  categories: CategoryTotal[]
  // In member order.
  payers: PayerTotal[]
  // Index 0 = January.
  months: number[]
  // listId: the list with most spend that month, unless it is the main list.
  // categoryId: the category with most spend that month.
  topMonth: { month: number; totalCents: number; listId: string | null; categoryId: string } | null
  biggest: Moment | null
  smallest: Moment | null
  restaurant: { description: string; count: number; totalCents: number } | null
  reactionCount: number
  commentCount: number
  topEmojis: { emoji: string; count: number }[]
  mostCommented: { description: string; count: number } | null
  // One "settle all" makes one row per list; it counts once.
  settlementCount: number
  lastSettlement: { settledOn: string; amountCents: number } | null
  // What is left to settle across all lists at the end of the year (or today).
  outstandingCents: number
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function dayOfYear(iso: string): number {
  const { year, month, day } = parseISODate(iso)
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86_400_000) + 1
}

// Days elapsed in `year` as of `today`, counting today.
export function daysElapsed(year: number, today: string): number {
  const full = isLeapYear(year) ? 366 : 365
  const thisYear = parseISODate(today).year
  if (year < thisYear) return full
  if (year > thisYear) return 0
  return dayOfYear(today)
}

// The year whose summary the Início card and the Estatísticas row offer:
// from 24 December to 31 January. Null outside that window.
export function reviewYearFor(today: string): number | null {
  const { year, month, day } = parseISODate(today)
  if (month === 12 && day >= 24) return year
  if (month === 1) return year - 1
  return null
}

// "Jantar  no Ramiro" and "jantar no ramiro" are the same place.
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function moment(expense: ExpenseWithShares): Moment {
  return {
    description: expense.description,
    categoryId: expense.category_id,
    amountCents: expense.amount_cents,
    spentOn: expense.spent_on,
  }
}

// Expenses that count for the year: dated in it, not in the future, not deleted.
export function expensesOfYear(expenses: ExpenseWithShares[], year: number, today: string): ExpenseWithShares[] {
  const prefix = `${year}-`
  return expenses.filter((expense) => !expense.deleted_at && expense.spent_on.startsWith(prefix) && expense.spent_on <= today)
}

export function yearSummary(input: YearSummaryInput): YearSummary {
  const { year, today, members, lists, categories, settlements, reactions, comments } = input
  const expenses = expensesOfYear(input.expenses, year, today)
  const totalCents = expenses.reduce((sum, expense) => sum + expense.amount_cents, 0)
  const days = daysElapsed(year, today)

  const sumBy = <K extends string>(key: (expense: ExpenseWithShares) => K) => {
    const map = new Map<K, { totalCents: number; count: number }>()
    for (const expense of expenses) {
      const entry = map.get(key(expense)) ?? { totalCents: 0, count: 0 }
      entry.totalCents += expense.amount_cents
      entry.count += 1
      map.set(key(expense), entry)
    }
    return map
  }
  const biggestFirst = (a: { totalCents: number; count: number }, b: { totalCents: number; count: number }) =>
    b.totalCents - a.totalCents || b.count - a.count

  const byList = sumBy((expense) => expense.list_id)
  const usedLists = lists
    .filter((list) => byList.has(list.id))
    .sort((a, b) => biggestFirst(byList.get(a.id)!, byList.get(b.id)!))

  const categoryTotals = [...sumBy((expense) => expense.category_id)]
    .map(([categoryId, entry]) => ({ categoryId, ...entry }))
    .sort(biggestFirst)

  const byPayer = sumBy((expense) => expense.paid_by)
  const payers = members.map((member) => ({
    userId: member.user_id,
    ...(byPayer.get(member.user_id) ?? { totalCents: 0, count: 0 }),
  }))

  const months = Array.from({ length: 12 }, () => 0)
  for (const expense of expenses) months[parseISODate(expense.spent_on).month - 1] += expense.amount_cents
  const top = months.reduce((best, cents, index) => (cents > months[best] ? index : best), 0)
  let topMonth: YearSummary['topMonth'] = null
  if (months[top] > 0) {
    // The list with most spend in that month, unless it is the main list.
    const prefix = `${year}-${String(top + 1).padStart(2, '0')}`
    const inMonth = new Map<string, number>()
    const categoriesInMonth = new Map<string, number>()
    for (const expense of expenses) {
      if (expense.spent_on.startsWith(prefix)) {
        inMonth.set(expense.list_id, (inMonth.get(expense.list_id) ?? 0) + expense.amount_cents)
        categoriesInMonth.set(expense.category_id, (categoriesInMonth.get(expense.category_id) ?? 0) + expense.amount_cents)
      }
    }
    const [listId] = [...inMonth].sort((a, b) => b[1] - a[1])[0]
    const [categoryId] = [...categoriesInMonth].sort((a, b) => b[1] - a[1])[0]
    const isMain = lists.find((list) => list.id === listId)?.is_default ?? false
    topMonth = { month: top + 1, totalCents: months[top], listId: isMain ? null : listId, categoryId }
  }

  const byAmount = [...expenses].sort((a, b) => b.amount_cents - a.amount_cents || a.spent_on.localeCompare(b.spent_on))
  const positive = byAmount.filter((expense) => expense.amount_cents > 0)

  // Favourite restaurant: the description that comes up most in Restaurantes.
  const restaurantIds = new Set(
    categories.filter((category) => normalize(category.name) === 'restaurantes').map((category) => category.id),
  )
  const places = new Map<string, { description: string; count: number; totalCents: number; last: string }>()
  for (const expense of expenses) {
    if (!restaurantIds.has(expense.category_id)) continue
    const key = normalize(expense.description)
    const place = places.get(key) ?? { description: expense.description, count: 0, totalCents: 0, last: '' }
    place.count += 1
    place.totalCents += expense.amount_cents
    // Keep the spelling of the latest one.
    if (expense.spent_on >= place.last) {
      place.description = expense.description.trim()
      place.last = expense.spent_on
    }
    places.set(key, place)
  }
  const favourite = [...places.values()].sort(biggestFirst)[0]
  // One visit is not a favourite.
  const restaurant =
    favourite && favourite.count >= 2
      ? { description: favourite.description, count: favourite.count, totalCents: favourite.totalCents }
      : null

  // Reactions and comments on this year's expenses.
  const byId = new Map(expenses.map((expense) => [expense.id, expense]))
  const yearReactions = reactions.filter((reaction) => byId.has(reaction.expense_id))
  const yearComments = comments.filter((comment) => !comment.deleted_at && byId.has(comment.expense_id))
  const emojis = new Map<string, number>()
  for (const reaction of yearReactions) emojis.set(reaction.emoji, (emojis.get(reaction.emoji) ?? 0) + 1)
  const topEmojis = [...emojis]
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
  const perExpense = new Map<string, number>()
  for (const comment of yearComments) perExpense.set(comment.expense_id, (perExpense.get(comment.expense_id) ?? 0) + 1)
  const [mostId, mostCount] = [...perExpense].sort((a, b) => b[1] - a[1])[0] ?? [null, 0]
  const mostCommented = mostId ? { description: byId.get(mostId)!.description, count: mostCount } : null

  // Settlements: a "settle all" batch counts as one, with its rows added up.
  const yearEnd = `${year}-12-31`
  const cutoff = today < yearEnd ? today : yearEnd
  const live = settlements.filter((settlement) => !settlement.deleted_at)
  const batches = new Map<string, { settledOn: string; amountCents: number; createdAt: string }>()
  for (const settlement of live) {
    if (!settlement.settled_on.startsWith(`${year}-`) || settlement.settled_on > cutoff) continue
    const key = settlement.batch_id ?? settlement.id
    const batch = batches.get(key) ?? { settledOn: settlement.settled_on, amountCents: 0, createdAt: settlement.created_at }
    batch.amountCents += settlement.amount_cents
    batches.set(key, batch)
  }
  const last = [...batches.values()].sort(
    (a, b) => b.settledOn.localeCompare(a.settledOn) || b.createdAt.localeCompare(a.createdAt),
  )[0]

  // Net position of the first member across every list, as of the cutoff:
  // paid − owed + settlements sent − settlements received. With two people,
  // the other one's is the same amount with the opposite sign.
  const first = members[0]?.user_id
  let net = 0
  if (first) {
    for (const expense of input.expenses) {
      if (expense.deleted_at || expense.spent_on > cutoff) continue
      if (expense.paid_by === first) net += expense.amount_cents
      net -= expense.expense_shares.find((share) => share.user_id === first)?.share_cents ?? 0
    }
    for (const settlement of live) {
      if (settlement.settled_on > cutoff) continue
      if (settlement.from_user === first) net += settlement.amount_cents
      if (settlement.to_user === first) net -= settlement.amount_cents
    }
  }

  return {
    year,
    expenseCount: expenses.length,
    totalCents,
    days,
    perDayCents: days > 0 ? Math.round(totalCents / days) : 0,
    lists: usedLists,
    categories: categoryTotals,
    payers,
    months,
    topMonth,
    biggest: positive[0] ? moment(positive[0]) : null,
    smallest: positive.length > 1 ? moment(positive[positive.length - 1]) : null,
    restaurant,
    reactionCount: yearReactions.length,
    commentCount: yearComments.length,
    topEmojis,
    mostCommented,
    settlementCount: batches.size,
    lastSettlement: last ? { settledOn: last.settledOn, amountCents: last.amountCents } : null,
    outstandingCents: Math.abs(net),
  }
}

// Years that have a summary worth showing, newest first.
export function reviewableYears(expenses: ExpenseWithShares[], today: string): number[] {
  const counts = new Map<number, number>()
  for (const expense of expenses) {
    if (expense.deleted_at || expense.spent_on > today) continue
    const year = parseISODate(expense.spent_on).year
    counts.set(year, (counts.get(year) ?? 0) + 1)
  }
  return [...counts]
    .filter(([, count]) => count >= MIN_EXPENSES)
    .map(([year]) => year)
    .sort((a, b) => b - a)
}
