import { beforeEach, describe, expect, it } from 'vitest'
import type { ShoppingItem } from './database.types'
import { pendingChecks, withPending } from './shoppingQueue'

const item = (id: string, checked_at: string | null = null): ShoppingItem => ({
  id,
  name: id,
  name_key: id,
  emoji: '🛒',
  section: 'outros',
  quantity: 1,
  note: null,
  added_by: 'u',
  created_at: '2026-10-14T10:00:00Z',
  checked_at,
  checked_by: null,
})

beforeEach(() => {
  for (const entry of pendingChecks.snapshot()) pendingChecks.remove(entry)
})

describe('withPending', () => {
  it('shows a queued tick on top of the server data', () => {
    pendingChecks.add({ id: 'a', userId: 'me', checked: true })
    const result = withPending([item('a'), item('b')], pendingChecks.snapshot())
    expect(result[0].checked_at).not.toBeNull()
    expect(result[0].checked_by).toBe('me')
    expect(result[1].checked_at).toBeNull()
  })

  it('shows a queued untick', () => {
    pendingChecks.add({ id: 'a', userId: 'me', checked: false })
    expect(withPending([item('a', '2026-10-14T11:00:00Z')], pendingChecks.snapshot())[0].checked_at).toBeNull()
  })

  it('is the same list when nothing is queued', () => {
    const list = [item('a')]
    expect(withPending(list, [])).toBe(list)
  })
})

describe('pendingChecks', () => {
  it('keeps only the latest change per item', () => {
    pendingChecks.add({ id: 'a', userId: 'me', checked: true })
    pendingChecks.add({ id: 'a', userId: 'me', checked: false })
    expect(pendingChecks.snapshot()).toHaveLength(1)
    expect(pendingChecks.snapshot()[0].checked).toBe(false)
  })

  it('does not drop a change that replaced the one that was sent', async () => {
    pendingChecks.add({ id: 'a', userId: 'me', checked: true })
    const sent = pendingChecks.snapshot()[0]
    await new Promise((resolve) => setTimeout(resolve, 5))
    pendingChecks.add({ id: 'a', userId: 'me', checked: false })
    pendingChecks.remove(sent)
    expect(pendingChecks.snapshot()).toHaveLength(1)
  })
})
