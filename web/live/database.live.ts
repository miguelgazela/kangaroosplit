// End-to-end check of the data layer against the real database.
// CAUTION: every expense and payment it creates sends a real push notification
// to the other member now that the push webhook exists. Warn them, or switch
// the webhook off, before running this.
// Works only inside throwaway lists that are deleted afterwards; the delete
// cascades to their expenses, settlements, recurring rules and activity.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fetchActivity } from '../src/data/activity'
import { fetchCategories } from '../src/data/categories'
import { fetchExpenses, moveExpense, saveExpense, setExpenseDeleted } from '../src/data/expenses'
import { createList, deleteList, fetchDefaultShares, fetchLists, setListArchived } from '../src/data/lists'
import { fetchMembers } from '../src/data/members'
import {
  createRecurring,
  fetchRecurring,
  generateRecurring,
  nextOccurrence,
  setRecurringPaused,
} from '../src/data/recurring'
import { createSettlement, fetchBalances, settleAll } from '../src/data/settlements'
import { addMonths, occurrenceDate, todayISO } from '../src/lib/dates'
import type { List } from '../src/lib/database.types'
import { computeShares } from '../src/lib/split'
import { listBalance } from '../src/lib/stats'
import { DB_SCHEMA, supabase } from '../src/lib/supabase'

const TEST_PREFIX = '__teste__'

let me: string
let partner: string
let categoryId: string
let list: List
let otherList: List
let expenseId: string
let otherBalancesAreZero: boolean

async function myBalance(listId: string): Promise<number> {
  return listBalance(await fetchBalances(), listId, me)
}

async function removeTestLists(): Promise<void> {
  for (const leftover of (await fetchLists()).filter((l) => l.name.startsWith(TEST_PREFIX))) {
    await deleteList(leftover.id)
  }
}

beforeAll(async () => {
  const email = process.env.TEST_EMAIL
  const password = process.env.TEST_PASSWORD
  if (!email || !password) throw new Error('Set TEST_EMAIL and TEST_PASSWORD in web/.env.local')

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Sign-in failed: ${error.message}`)
  me = data.user.id

  await removeTestLists()
})

afterAll(async () => {
  await removeTestLists()
  await supabase.auth.signOut({ scope: 'local' })
})

describe('setup', () => {
  it('has exactly the two members, including the signed-in user', async () => {
    const members = await fetchMembers()
    expect(members, 'members table: run setup step 6').toHaveLength(2)
    expect(members.map((m) => m.user_id)).toContain(me)
    partner = members.find((m) => m.user_id !== me)!.user_id
  })

  it('has the default list with a share row per member', async () => {
    const home = (await fetchLists()).find((l) => l.is_default)
    expect(home?.name).toBe('Casa')
    const shares = (await fetchDefaultShares()).filter((s) => s.list_id === home!.id)
    expect(shares).toHaveLength(2)
  })

  it('has the preset categories', async () => {
    const categories = await fetchCategories()
    expect(categories.filter((c) => c.is_preset)).toHaveLength(9)
    categoryId = categories[0].id
  })

  it('refuses to delete or archive the default list', async () => {
    const home = (await fetchLists()).find((l) => l.is_default)!
    await expect(deleteList(home.id)).rejects.toThrow()
    await expect(setListArchived(home.id, true)).rejects.toThrow()
  })
})

describe('lists', () => {
  it('creates a list with its own default ratio', async () => {
    otherBalancesAreZero = (await fetchBalances()).every((b) => b.balance_cents === 0)

    list = await createList({ name: `${TEST_PREFIX} A`, icon: '🧪', starts_on: null, ends_on: null }, [
      { userId: me, weight: 60 },
      { userId: partner, weight: 40 },
    ])
    const shares = (await fetchDefaultShares()).filter((s) => s.list_id === list.id)
    expect(shares.find((s) => s.user_id === me)?.weight).toBe(60)
    expect(shares.find((s) => s.user_id === partner)?.weight).toBe(40)
  })

  it('copies the default list ratio when none is given', async () => {
    otherList = await createList({ name: `${TEST_PREFIX} B`, icon: '🧪', starts_on: null, ends_on: null })
    const shares = (await fetchDefaultShares()).filter((s) => s.list_id === otherList.id)
    expect(shares).toHaveLength(2)
  })
})

describe('expenses', () => {
  const split = (mode: 'percent' | 'exact', amount: number, mine: number, theirs: number) => {
    const result = computeShares(mode, amount, [
      { userId: me, value: mine },
      { userId: partner, value: theirs },
    ])
    if (!result.ok) throw new Error(result.error)
    return result.shares
  }

  const input = (amountCents: number, shares: ReturnType<typeof split>, id?: string) => ({
    id,
    listId: list.id,
    description: 'Despesa de teste',
    amountCents,
    spentOn: todayISO(),
    paidBy: me,
    categoryId,
    note: null,
    splitMode: 'percent' as const,
    shares,
  })

  it('creates an expense with shares and updates the balance', async () => {
    expenseId = await saveExpense(input(10001, split('percent', 10001, 60, 40)))

    const saved = (await fetchExpenses()).find((e) => e.id === expenseId)
    expect(saved?.amount_cents).toBe(10001)
    expect(saved?.created_by).toBe(me)
    expect(saved?.expense_shares.reduce((sum, s) => sum + s.share_cents, 0)).toBe(10001)
    // Paid 100,01, own share 60,01 -> owed 40,00.
    expect(await myBalance(list.id)).toBe(4000)
  })

  it('edits an expense, replacing its shares', async () => {
    await saveExpense({ ...input(5000, split('exact', 5000, 2000, 3000), expenseId), splitMode: 'exact' })

    const saved = (await fetchExpenses()).find((e) => e.id === expenseId)
    expect(saved?.amount_cents).toBe(5000)
    expect(saved?.split_mode).toBe('exact')
    expect(saved?.updated_by).toBe(me)
    expect(saved?.expense_shares).toHaveLength(2)
    expect(await myBalance(list.id)).toBe(3000)
  })

  it('rejects shares that do not sum to the amount', async () => {
    const shares = split('exact', 5000, 2000, 3000)
    await expect(saveExpense(input(9999, shares))).rejects.toThrow(/do not sum/)
  })

  it('soft deletes and restores', async () => {
    await setExpenseDeleted(expenseId, true)
    expect((await fetchExpenses()).some((e) => e.id === expenseId)).toBe(false)
    expect(await myBalance(list.id)).toBe(0)

    await setExpenseDeleted(expenseId, false)
    expect((await fetchExpenses()).some((e) => e.id === expenseId)).toBe(true)
    expect(await myBalance(list.id)).toBe(3000)
  })

  it('cannot be hard deleted by a client', async () => {
    await supabase.from('expenses').delete().eq('id', expenseId)
    expect((await fetchExpenses()).some((e) => e.id === expenseId)).toBe(true)
  })

  it('moves between lists, taking its balance along', async () => {
    await moveExpense(expenseId, otherList.id)
    expect(await myBalance(list.id)).toBe(0)
    expect(await myBalance(otherList.id)).toBe(3000)

    await moveExpense(expenseId, list.id)
    expect(await myBalance(list.id)).toBe(3000)
  })
})

describe('settlements', () => {
  it('records a partial payment', async () => {
    await createSettlement({
      listId: list.id,
      fromUser: partner,
      toUser: me,
      amountCents: 1000,
      settledOn: todayISO(),
      note: null,
    })
    expect(await myBalance(list.id)).toBe(2000)
  })

  it('settles everything in one go', async (context) => {
    // settle_all touches every list; only safe while real lists are at zero.
    if (!otherBalancesAreZero) context.skip()

    expect(await settleAll()).toEqual(expect.any(String))
    expect((await fetchBalances()).every((b) => b.balance_cents === 0)).toBe(true)
    expect(await settleAll()).toBeNull()
  })
})

describe('recurring', () => {
  const startOn = addMonths(todayISO(), -3)
  let ruleId: string
  let expected: number

  it('generates every due occurrence exactly once', async () => {
    const shares = computeShares('equal', 2000, [
      { userId: me, value: null },
      { userId: partner, value: null },
    ])
    if (!shares.ok) throw new Error(shares.error)

    const rule = await createRecurring({
      listId: otherList.id,
      description: 'Recorrente de teste',
      amountCents: 2000,
      paidBy: me,
      categoryId,
      note: null,
      splitMode: 'equal',
      shares: shares.shares,
      frequency: 'monthly',
      startOn,
      endOn: null,
    })
    ruleId = rule.id

    expected = 0
    while (occurrenceDate(startOn, 'monthly', expected) <= todayISO()) expected++

    expect(await generateRecurring()).toBe(expected)
    expect(await generateRecurring()).toBe(0)

    const generated = (await fetchExpenses()).filter((e) => e.recurring_id === ruleId)
    expect(generated).toHaveLength(expected)
    expect(generated.every((e) => e.expense_shares.length === 2)).toBe(true)
    expect(generated.map((e) => e.spent_on)).toContain(startOn)
    expect(await myBalance(otherList.id)).toBe(expected * 1000)
  })

  it('agrees with the client on the next date', async () => {
    const rule = (await fetchRecurring()).find((r) => r.id === ruleId)!
    expect(rule.last_generated_on).not.toBeNull()
    expect(nextOccurrence(rule, todayISO())).toBe(occurrenceDate(startOn, 'monthly', expected))
  })

  it('creates nothing while paused or right after resuming', async () => {
    await setRecurringPaused(ruleId, true)
    expect(await generateRecurring()).toBe(0)
    await setRecurringPaused(ruleId, false)
    expect(await generateRecurring()).toBe(0)
  })
})

describe('activity', () => {
  it('logged every action with the acting member', async () => {
    const entries = (await fetchActivity(500)).filter((a) => a.list_id === list.id)
    const actions = new Set(entries.map((a) => a.action))

    for (const action of [
      'list_created',
      'expense_created',
      'expense_updated',
      'expense_deleted',
      'expense_restored',
      'settlement_created',
    ] as const) {
      expect(actions, action).toContain(action)
    }
    expect(entries.every((a) => a.actor_id === me)).toBe(true)
  })

  it('cannot be written by a client', async () => {
    const { error } = await supabase
      .from('activity')
      .insert({ list_id: list.id, actor_id: me, action: 'list_created', entity_id: list.id })
    expect(error).not.toBeNull()
  })
})

describe('realtime', () => {
  it('delivers changes to a subscribed client', async () => {
    const received = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no realtime event within 10s')), 10000)
      const channel = supabase
        .channel('kangaroosplit-live-check')
        .on('postgres_changes', { event: 'UPDATE', schema: DB_SCHEMA, table: 'lists' }, () => {
          clearTimeout(timer)
          void supabase.removeChannel(channel)
          resolve()
        })
        // Database changes flow only after this acknowledgement, which comes
        // slightly later than the channel's own SUBSCRIBED status.
        .on('system', {}, (message: { extension?: string; status?: string }) => {
          if (message.extension === 'postgres_changes' && message.status === 'ok') {
            void setListArchived(otherList.id, true)
          }
        })
        .subscribe()
    })
    await received
  })
})
