import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { MenuList, PressMenu } from '../components/PressMenu'
import { ReactionBar } from '../components/ReactionBar'
import { ReceiptViewer } from '../components/ReceiptViewer'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/ToastContext'
import { t } from '../i18n/pt'
import type { ExpenseComment, ExpenseWithShares, Member } from '../lib/database.types'
import { dayLabel, localDay } from '../lib/dayLabel'
import { formatISODate, formatMoney, formatTime } from '../lib/format'
import { OfflineError, useOnline } from '../lib/online'
import { nameForms } from '../lib/people'
import {
  bubbles,
  COMMENT_MAX_LENGTH,
  nextReaction,
  reactionSummary,
  socialFor,
  type Bubble,
} from '../lib/social'
import { expensePosition } from '../lib/stats'
import { useKeyboardInset } from '../lib/useKeyboardInset'
import { useLongPress } from '../lib/useLongPress'
import {
  useAddComment,
  useCategories,
  useComments,
  useCurrentMember,
  useEditComment,
  useExpenses,
  useLists,
  useMarkRead,
  useMembers,
  useReactions,
  useReads,
  useReceiptLink,
  useSetCommentDeleted,
  useSetReaction,
} from '../query/hooks'

function BubbleView({
  bubble,
  author,
  subject,
  onMenu,
}: {
  bubble: Bubble
  author: Member
  subject: string
  onMenu: (bubble: Bubble, element: HTMLElement) => void
}) {
  const { comment, mine, endOfRun } = bubble
  const press = useLongPress({ onTap: () => {}, onLongPress: (element) => onMenu(bubble, element) })
  const radius = mine
    ? endOfRun
      ? 'rounded-[18px] rounded-br-[6px]'
      : 'rounded-[18px]'
    : endOfRun
      ? 'rounded-[18px] rounded-bl-[6px]'
      : 'rounded-[18px]'

  return (
    <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
      {!mine && (
        <span className={endOfRun ? '' : 'invisible'}>
          <Avatar member={author} size={28} />
        </span>
      )}
      <div className={`flex max-w-[260px] flex-col gap-0.5 ${mine ? 'items-end' : 'items-start'}`}>
        <span
          {...press}
          className={`px-3 py-2 text-base leading-[21px] break-words whitespace-pre-wrap select-none [-webkit-touch-callout:none] ${radius} ${
            mine ? 'bg-accent text-white' : 'bg-surface text-text'
          }`}
        >
          {comment.body}
        </span>
        <span className="px-1.5 text-[11px] text-text-2">
          {mine ? '' : `${subject} · `}
          {formatTime(comment.created_at)}
          {comment.edited_at ? ` · ${t.detail.edited}` : ''}
        </span>
      </div>
    </div>
  )
}

export function ExpenseDetailSheet({
  expenseId,
  focusComment,
  onEdit,
  onClose,
}: {
  expenseId: string
  focusComment: boolean
  onEdit: (expense: ExpenseWithShares) => void
  onClose: () => void
}) {
  const online = useOnline()
  const toast = useToast()
  const { me, partner } = useCurrentMember()
  const { data: members } = useMembers()
  const { data: lists } = useLists()
  const { data: categories } = useCategories()
  const { data: expenses } = useExpenses()
  const { data: reactions } = useReactions()
  const { data: comments } = useComments()
  const { data: reads } = useReads()
  const setReaction = useSetReaction()
  const addComment = useAddComment()
  const editComment = useEditComment()
  const setCommentDeleted = useSetCommentDeleted()
  const markRead = useMarkRead()
  const inset = useKeyboardInset()

  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<ExpenseComment | null>(null)
  const [menu, setMenu] = useState<{ bubble: Bubble; top: number } | null>(null)
  const [viewingReceipt, setViewingReceipt] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const thread = useRef<HTMLDivElement>(null)

  const expense = expenses?.find((candidate) => candidate.id === expenseId)
  const receipt = useReceiptLink(expense?.receipt_path)

  const social = useMemo(
    () =>
      me
        ? socialFor(expenseId, me.user_id, reactions ?? [], comments ?? [], reads ?? [])
        : { mine: null, theirs: null, comments: [], unread: false },
    [expenseId, me, reactions, comments, reads],
  )
  const items = useMemo(
    () => (me ? bubbles(social.comments, me.user_id, localDay) : []),
    [social.comments, me],
  )

  // Opening the sheet, or a comment arriving while it is open, counts as read.
  const needsRead = social.unread
  const markReadNow = markRead.mutate
  useEffect(() => {
    if (needsRead && online && me) markReadNow({ expenseId, userId: me.user_id })
  }, [needsRead, online, me, expenseId, markReadNow])

  // Newest at the bottom, and always in view.
  useEffect(() => {
    const element = thread.current
    if (element) element.scrollTop = element.scrollHeight
  }, [items.length, inset])

  useEffect(() => {
    if (focusComment) input.current?.focus()
  }, [focusComment])

  // Deleted elsewhere while open.
  const gone = expenses !== undefined && expense === undefined
  useEffect(() => {
    if (gone) onClose()
  }, [gone, onClose])

  if (!me || !partner || !members || !lists || !expense) return null

  const names = nameForms(partner)
  const list = lists.find((candidate) => candidate.id === expense.list_id)
  const category = categories?.find((candidate) => candidate.id === expense.category_id)
  const position = expensePosition(expense, me.user_id)
  const split = members
    .map((member) => {
      const share = expense.expense_shares.find((candidate) => candidate.user_id === member.user_id)?.share_cents ?? 0
      return Math.round((share / expense.amount_cents) * 100)
    })
    .join(' / ')
  const payer = expense.paid_by === me.user_id ? t.expense.paidByYou : t.expense.paidBy(names.by)
  const positionLabel =
    position > 0 ? t.detail.lent(formatMoney(position)) : position < 0 ? t.detail.owe(formatMoney(-position)) : t.detail.even

  const fail = (error: unknown) =>
    toast({ kind: 'error', message: error instanceof OfflineError ? t.system.offline : t.system.error })

  const react = (emoji: string) =>
    setReaction.mutate({ expenseId, userId: me.user_id, emoji: nextReaction(social.mine, emoji) }, { onError: fail })

  const canSend = online && draft.trim() !== '' && !addComment.isPending && !editComment.isPending

  const send = (event: FormEvent) => {
    event.preventDefault()
    if (!canSend) return
    const body = draft.trim()
    if (editing) {
      editComment.mutate(
        { id: editing.id, body },
        {
          onSuccess: () => {
            setDraft('')
            setEditing(null)
          },
          onError: fail,
        },
      )
    } else {
      addComment.mutate(
        { expenseId, body },
        { onSuccess: () => setDraft(''), onError: fail },
      )
    }
  }

  const openMenu = (bubble: Bubble, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    // Keep the bubble and its menu (about 150 px) on screen.
    const top = Math.min(Math.max(rect.top, 80), window.innerHeight - 260)
    setMenu({ bubble, top })
  }

  const removeComment = (comment: ExpenseComment) => {
    setMenu(null)
    if (editing?.id === comment.id) {
      setEditing(null)
      setDraft('')
    }
    setCommentDeleted.mutate(
      { id: comment.id, deleted: true },
      {
        onSuccess: () =>
          toast({
            message: t.detail.commentDeleted,
            action: {
              label: t.actions.undo,
              onClick: () => setCommentDeleted.mutate({ id: comment.id, deleted: false }, { onError: fail }),
            },
          }),
        onError: fail,
      },
    )
  }

  const startEditing = (comment: ExpenseComment) => {
    setMenu(null)
    setEditing(comment)
    setDraft(comment.body)
    input.current?.focus()
  }

  const copy = (comment: ExpenseComment) => {
    setMenu(null)
    void navigator.clipboard?.writeText(comment.body).then(() => toast({ message: t.detail.copied }))
  }

  return (
    <Sheet
      title={t.detail.title}
      cancelLabel={t.detail.close}
      onCancel={onClose}
      action={{ label: t.detail.edit, onClick: () => onEdit(expense), disabled: !online || list?.archived_at != null }}
    >
      <div className="flex min-h-0 flex-1 flex-col" style={{ paddingBottom: inset }}>
        <div className="flex flex-none flex-col gap-3 px-4 pt-1">
          <section aria-label={t.detail.summary} className="flex flex-col gap-2.5 rounded-[20px] bg-surface p-4 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex size-12 flex-none items-center justify-center rounded-[14px] bg-fill text-2xl">
                {category?.icon ?? '📦'}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-headline font-semibold">{expense.description}</span>
                <span className="text-footnote text-text-2">
                  {formatISODate(expense.spent_on)}
                  {list ? ` · ${list.icon} ${list.name}` : ''} · {payer}
                </span>
              </div>
              <span className="text-title2 font-bold tabular-nums">{formatMoney(expense.amount_cents)}</span>
            </div>
            <div className="flex items-center gap-2 border-t-[0.5px] border-separator pt-2.5">
              <span
                className={`flex flex-1 items-center gap-1 text-base font-semibold tabular-nums ${
                  position > 0 ? 'text-pos' : position < 0 ? 'text-neg' : 'text-text-2'
                }`}
              >
                {position !== 0 && (
                  <Icon name={position > 0 ? 'arrowDownLeft' : 'arrowUpRight'} size={13} strokeWidth={3} />
                )}
                {positionLabel} · {split}
              </span>
              {expense.receipt_path && (
                <button
                  type="button"
                  disabled={!receipt.data}
                  onClick={() => setViewingReceipt(true)}
                  className="flex h-8 items-center gap-1.5 rounded-full bg-fill px-2.5 text-footnote font-medium disabled:text-disabled"
                >
                  <Icon name="paperclip" size={14} strokeWidth={2.2} />
                  {t.detail.receipt}
                </button>
              )}
            </div>
            {expense.note && <p className="text-body text-text-2">{t.detail.note(expense.note)}</p>}
          </section>

          <ReactionBar
            variant="card"
            mine={social.mine}
            theirs={social.theirs}
            partner={partner}
            disabled={!online}
            onPick={react}
          />
          <p aria-live="polite" className="-mt-1 mb-0 min-h-[18px] px-1 text-footnote text-text-2">
            {reactionSummary(social, names.subject, t.detail.tapToReact)}
          </p>

          <h2 className="px-1 text-footnote font-semibold tracking-[0.4px] text-text-2 uppercase">
            {items.length > 0 ? t.detail.commentsCount(items.length) : t.detail.comments}
          </h2>
        </div>

        <div ref={thread} role="log" aria-label={t.detail.thread} className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-3">
          <div className="flex min-h-full flex-col justify-end gap-1.5">
            {items.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-6 text-center text-text-2">
                <Icon name="comment" size={34} strokeWidth={1.7} />
                <span className="text-body font-semibold text-text">{t.detail.noComments}</span>
                <span className="text-footnote">{t.detail.writeTo(names.to)}</span>
              </div>
            )}
            {items.map((bubble) => (
              <div key={bubble.comment.id} className="flex flex-col gap-1.5">
                {bubble.dayStart && (
                  <span className="self-center py-1 text-xs font-medium text-text-2">
                    {dayLabel(localDay(bubble.comment.created_at))}
                  </span>
                )}
                <BubbleView
                  bubble={bubble}
                  author={bubble.mine ? me : partner}
                  subject={names.subject}
                  onMenu={openMenu}
                />
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={send}
          className="flex flex-none flex-col gap-1.5 border-t-[0.5px] border-separator bg-bg/95 px-3 pt-2 backdrop-blur-[20px]"
          style={{ paddingBottom: inset > 0 ? 8 : 'max(8px, env(safe-area-inset-bottom))' }}
        >
          {editing && (
            <div className="flex items-center justify-between px-1 text-footnote text-text-2">
              <span>{t.detail.editing}</span>
              <button
                type="button"
                aria-label={t.detail.cancelEdit}
                onClick={() => {
                  setEditing(null)
                  setDraft('')
                }}
                className="flex size-6 items-center justify-center"
              >
                <Icon name="close" size={14} strokeWidth={2.6} />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <label className="flex min-h-10 flex-1 items-center rounded-full bg-surface px-3.5 shadow-[inset_0_0_0_1px_var(--ks-separator)]">
              <input
                ref={input}
                type="text"
                aria-label={t.detail.placeholder}
                placeholder={t.detail.placeholder}
                value={draft}
                maxLength={COMMENT_MAX_LENGTH}
                disabled={!online}
                enterKeyHint="send"
                onChange={(event) => setDraft(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-2"
              />
            </label>
            <button
              type="submit"
              aria-label={t.detail.send}
              disabled={!canSend}
              className={`flex size-10 flex-none items-center justify-center rounded-full text-white ${canSend ? 'bg-accent' : 'bg-disabled'}`}
            >
              <Icon name="send" size={20} strokeWidth={2.6} />
            </button>
          </div>
        </form>
      </div>

      {menu && (
        <PressMenu
          label={t.detail.commentMenu}
          top={menu.top}
          align={menu.bubble.mine ? 'end' : 'start'}
          onClose={() => setMenu(null)}
        >
          <span
            className={`max-w-[260px] px-3 py-2 text-base leading-[21px] break-words whitespace-pre-wrap shadow-[0_8px_24px_rgba(17,17,20,0.18)] rounded-[18px] ${
              menu.bubble.mine ? 'rounded-br-[6px] bg-accent text-white' : 'rounded-bl-[6px] bg-surface text-text'
            }`}
          >
            {menu.bubble.comment.body}
          </span>
          <MenuList
            label={t.detail.commentMenu}
            items={[
              { label: t.detail.copy, icon: 'copy', onSelect: () => copy(menu.bubble.comment) },
              ...(menu.bubble.mine
                ? [
                    {
                      label: t.detail.editComment,
                      icon: 'edit' as const,
                      disabled: !online,
                      onSelect: () => startEditing(menu.bubble.comment),
                    },
                    {
                      label: t.detail.deleteComment,
                      icon: 'trash' as const,
                      destructive: true,
                      disabled: !online,
                      onSelect: () => removeComment(menu.bubble.comment),
                    },
                  ]
                : []),
            ]}
          />
        </PressMenu>
      )}

      {viewingReceipt && receipt.data && <ReceiptViewer src={receipt.data} onClose={() => setViewingReceipt(false)} />}
    </Sheet>
  )
}
