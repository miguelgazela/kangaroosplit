import type { ExpenseComment, ExpenseRead, ExpenseReaction } from './database.types'

// Always these six, in this order.
export const REACTIONS = [
  { emoji: '❤️', name: 'coração' },
  { emoji: '👍', name: 'polegar para cima' },
  { emoji: '😂', name: 'a rir' },
  { emoji: '😮', name: 'surpresa' },
  { emoji: '😬', name: 'ai' },
  { emoji: '🙏', name: 'obrigado' },
] as const

export const COMMENT_MAX_LENGTH = 500

// Everything social known about one expense, from the cached tables.
export type Social = {
  mine: string | null
  theirs: string | null
  comments: ExpenseComment[]
  // The other person wrote after the viewer last opened the expense.
  unread: boolean
}

export function socialFor(
  expenseId: string,
  userId: string,
  reactions: ExpenseReaction[],
  comments: ExpenseComment[],
  reads: ExpenseRead[],
): Social {
  let mine: string | null = null
  let theirs: string | null = null
  for (const reaction of reactions) {
    if (reaction.expense_id !== expenseId) continue
    if (reaction.user_id === userId) mine = reaction.emoji
    else theirs = reaction.emoji
  }
  const thread = comments.filter((comment) => comment.expense_id === expenseId && !comment.deleted_at)
  const lastRead = reads.find((read) => read.expense_id === expenseId && read.user_id === userId)?.last_read_at
  const unread = thread.some(
    (comment) => comment.user_id !== userId && (lastRead === undefined || comment.created_at > lastRead),
  )
  return { mine, theirs, comments: thread, unread }
}

// What the row shows on the category icon: the other person's first, then yours.
export function rowReactions(social: Social): string[] {
  return [social.theirs, social.mine].filter((emoji): emoji is string => emoji !== null)
}

// Tapping the same emoji again removes the reaction.
export function nextReaction(current: string | null, tapped: string): string | null {
  return current === tapped ? null : tapped
}

// One sentence under the reaction bar. `subject` is "A Mara".
export function reactionSummary(
  social: Pick<Social, 'mine' | 'theirs'>,
  subject: string,
  empty: string,
): string {
  const parts: string[] = []
  if (social.theirs) parts.push(`${subject} reagiu com ${social.theirs}`)
  if (social.mine) parts.push(`reagiste com ${social.mine}`)
  if (parts.length === 0) return empty
  const text = parts.join(' · ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export type Bubble = {
  comment: ExpenseComment
  mine: boolean
  // First bubble of a new day: draws the day separator above it.
  dayStart: boolean
  // Last of a run by the same person: gets the tail and the avatar.
  endOfRun: boolean
}

export function bubbles(comments: ExpenseComment[], userId: string, localDay: (instant: string) => string): Bubble[] {
  return comments.map((comment, index) => {
    const previous = comments[index - 1]
    const next = comments[index + 1]
    return {
      comment,
      mine: comment.user_id === userId,
      dayStart: !previous || localDay(previous.created_at) !== localDay(comment.created_at),
      endOfRun: !next || next.user_id !== comment.user_id,
    }
  })
}
