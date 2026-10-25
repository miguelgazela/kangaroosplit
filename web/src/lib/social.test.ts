import { describe, expect, it } from 'vitest'
import type { ExpenseComment, ExpenseRead, ExpenseReaction } from './database.types'
import { bubbles, nextReaction, reactionSummary, rowReactions, socialFor } from './social'

const ME = 'me'
const MARA = 'mara'

const reaction = (expense_id: string, user_id: string, emoji: string): ExpenseReaction => ({
  expense_id,
  user_id,
  emoji,
  created_at: '',
})
const comment = (id: string, user_id: string, created_at: string, expense_id = 'e1'): ExpenseComment => ({
  id,
  expense_id,
  user_id,
  body: id,
  created_at,
  edited_at: null,
  deleted_at: null,
})

describe('socialFor', () => {
  it('splits reactions into mine and theirs for one expense', () => {
    const social = socialFor(
      'e1',
      ME,
      [reaction('e1', ME, '😂'), reaction('e1', MARA, '❤️'), reaction('e2', MARA, '👍')],
      [],
      [],
    )
    expect(social.mine).toBe('😂')
    expect(social.theirs).toBe('❤️')
    expect(rowReactions(social)).toEqual(['❤️', '😂'])
  })

  it('is unread when the other person wrote after the last read', () => {
    const comments = [comment('a', MARA, '2026-10-08T21:14:00Z'), comment('b', ME, '2026-10-08T21:20:00Z')]
    const read = (at: string): ExpenseRead[] => [{ expense_id: 'e1', user_id: ME, last_read_at: at }]
    expect(socialFor('e1', ME, [], comments, []).unread).toBe(true)
    expect(socialFor('e1', ME, [], comments, read('2026-10-08T21:00:00Z')).unread).toBe(true)
    expect(socialFor('e1', ME, [], comments, read('2026-10-08T22:00:00Z')).unread).toBe(false)
  })

  it('does not count my own comments, deleted ones or other expenses as unread', () => {
    const own = [comment('a', ME, '2026-10-08T21:14:00Z')]
    expect(socialFor('e1', ME, [], own, []).unread).toBe(false)
    const deleted = [{ ...comment('a', MARA, '2026-10-08T21:14:00Z'), deleted_at: '2026-10-09T00:00:00Z' }]
    expect(socialFor('e1', ME, [], deleted, []).unread).toBe(false)
    const other = [comment('a', MARA, '2026-10-08T21:14:00Z', 'e2')]
    expect(socialFor('e1', ME, [], other, []).comments).toEqual([])
  })
})

describe('nextReaction', () => {
  it('sets, changes and removes', () => {
    expect(nextReaction(null, '❤️')).toBe('❤️')
    expect(nextReaction('❤️', '😂')).toBe('😂')
    expect(nextReaction('😂', '😂')).toBeNull()
  })
})

describe('reactionSummary', () => {
  const empty = 'Toca num emoji para reagir.'
  it('says it in words', () => {
    expect(reactionSummary({ mine: '😂', theirs: '❤️' }, 'A Mara', empty)).toBe('A Mara reagiu com ❤️ e tu com 😂.')
    expect(reactionSummary({ mine: '😂', theirs: null }, 'A Mara', empty)).toBe('Reagiste com 😂.')
    expect(reactionSummary({ mine: null, theirs: '❤️' }, 'A Mara', empty)).toBe('A Mara reagiu com ❤️.')
    expect(reactionSummary({ mine: null, theirs: null }, 'A Mara', empty)).toBe(empty)
  })
})

describe('bubbles', () => {
  it('marks day starts and the end of each run', () => {
    const day = (instant: string) => instant.slice(0, 10)
    const result = bubbles(
      [
        comment('a', MARA, '2026-10-08T21:14:00Z'),
        comment('b', ME, '2026-10-08T21:20:00Z'),
        comment('c', ME, '2026-10-08T21:21:00Z'),
        comment('d', MARA, '2026-10-09T08:00:00Z'),
      ],
      ME,
      day,
    )
    expect(result.map((b) => b.dayStart)).toEqual([true, false, false, true])
    expect(result.map((b) => b.endOfRun)).toEqual([true, false, true, true])
    expect(result.map((b) => b.mine)).toEqual([false, true, true, false])
  })
})
