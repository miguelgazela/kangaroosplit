import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionSheet } from '../components/ActionSheet'
import { Avatar } from '../components/Avatar'
import { DateRow } from '../components/DateRow'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/ToastContext'
import { t } from '../i18n/pt'
import type { List, ListDefaultShare, Member } from '../lib/database.types'
import { OfflineError } from '../lib/online'
import { nameForms, ratio } from '../lib/people'
import {
  useCreateList,
  useDefaultShares,
  useDeleteList,
  useLists,
  useMembers,
  useSetDefaultShares,
  useSetListArchived,
  useUpdateList,
} from '../query/hooks'

const ICONS = ['🏠', '✈️', '🎁', '🎄', '🏕️', '🚗', '🍽️', '🎉', '🐱', '🛒', '💡', '🏖️', '⛰️', '🎂', '📚', '🔨']
const PRESETS = [50, 60, 70]

export type ListSheetProps = {
  // Present when editing.
  list?: List
  onClose: () => void
}

export function ListSheet({ list, onClose }: ListSheetProps) {
  const { data: members } = useMembers()
  const { data: lists } = useLists()
  const { data: defaultShares } = useDefaultShares()

  if (!members || !lists || !defaultShares || members.length !== 2) return null
  return <ListForm list={list} onClose={onClose} members={members} lists={lists} defaultShares={defaultShares} />
}

function ListForm({
  list,
  onClose,
  members,
  lists,
  defaultShares,
}: ListSheetProps & { members: Member[]; lists: List[]; defaultShares: ListDefaultShare[] }) {
  const navigate = useNavigate()
  const toast = useToast()
  const createList = useCreateList()
  const updateList = useUpdateList()
  const setDefaultShares = useSetDefaultShares()
  const setArchived = useSetListArchived()
  const deleteList = useDeleteList()

  // A new list starts from the main list's ratio.
  const reference = list ?? lists.find((candidate) => candidate.is_default)
  const [first, second] = reference ? ratio(members, defaultShares, reference.id) : [50, 50]
  const initialPercent = first + second === 0 ? 50 : Math.round((first * 100) / (first + second))

  const [name, setName] = useState(list?.name ?? '')
  const [icon, setIcon] = useState(list?.icon ?? ICONS[1])
  const [startsOn, setStartsOn] = useState(list?.starts_on ?? null)
  const [endsOn, setEndsOn] = useState(list?.ends_on ?? null)
  // First member's percentage; the second gets the rest.
  const [percent, setPercent] = useState(initialPercent)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const datesInvalid = startsOn !== null && endsOn !== null && startsOn > endsOn
  const pending =
    createList.isPending || updateList.isPending || setDefaultShares.isPending || setArchived.isPending || deleteList.isPending
  const canSave = name.trim() !== '' && !datesInvalid && !pending
  const archived = list?.archived_at != null

  const fail = (error: unknown) =>
    toast({ kind: 'error', message: error instanceof OfflineError ? t.system.offline : t.system.error })

  const input = { name: name.trim(), icon, starts_on: startsOn, ends_on: endsOn }
  const weights = [
    { userId: members[0].user_id, weight: percent },
    { userId: members[1].user_id, weight: 100 - percent },
  ]

  const onSave = async () => {
    try {
      if (list) {
        await updateList.mutateAsync({ id: list.id, patch: input })
        if (percent !== initialPercent) await setDefaultShares.mutateAsync({ listId: list.id, weights })
        toast({ message: t.listEditor.saved })
      } else {
        const created = await createList.mutateAsync({ input, weights })
        toast({ message: t.listEditor.created })
        void navigate(`/lista/${created.id}`)
      }
      onClose()
    } catch (error) {
      fail(error)
    }
  }

  const onArchive = () => {
    if (!list) return
    setArchived.mutate(
      { id: list.id, archived: !archived },
      {
        onSuccess: () => {
          toast({ message: archived ? t.listEditor.unarchived : t.listEditor.archived })
          if (!archived) void navigate('/')
          onClose()
        },
        onError: fail,
      },
    )
  }

  const onDelete = () => {
    if (!list) return
    setConfirmingDelete(false)
    deleteList.mutate(list.id, {
      onSuccess: () => {
        toast({ message: t.listEditor.deleted })
        void navigate('/')
        onClose()
      },
      onError: fail,
    })
  }

  return (
    <Sheet
      title={list ? t.listEditor.edit : t.listEditor.create}
      onCancel={onClose}
      action={{ label: t.actions.save, onClick: () => void onSave(), disabled: !canSave }}
    >
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="flex flex-none items-center gap-3.5 rounded-card bg-surface px-4 py-3">
          <span className="flex size-[60px] flex-none items-center justify-center rounded-[18px] bg-accent-soft text-[32px]">
            {icon}
          </span>
          <label className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-footnote text-text-2">{t.listEditor.name}</span>
            <input
              type="text"
              value={name}
              maxLength={40}
              autoFocus={!list}
              onChange={(event) => setName(event.target.value)}
              className="min-w-0 bg-transparent p-0 text-xl font-semibold text-text outline-none"
            />
          </label>
        </div>

        <div className="flex-none rounded-card bg-surface px-2.5 pt-3 pb-2.5">
          <span className="block px-1.5 pb-1.5 text-footnote text-text-2">{t.listEditor.icon}</span>
          <div role="radiogroup" aria-label={t.listEditor.icon} className="grid grid-cols-8">
            {(ICONS.includes(icon) ? ICONS : [icon, ...ICONS.slice(0, -1)]).map((option) => {
              const active = option === icon
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={option}
                  onClick={() => setIcon(option)}
                  className="flex h-11 items-center justify-center"
                >
                  <span
                    className={`flex size-[38px] items-center justify-center rounded-xl text-[22px] ${active ? 'bg-accent-soft ring-2 ring-accent ring-inset' : ''}`}
                  >
                    {option}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {!list?.is_default && (
          <div className={`flex-none overflow-hidden rounded-card bg-surface ${datesInvalid ? 'ring-[1.5px] ring-danger ring-inset' : ''}`}>
            <DateRow label={t.listEditor.startsOn} value={startsOn} onChange={setStartsOn} optional />
            <DateRow label={t.listEditor.endsOn} value={endsOn} onChange={setEndsOn} optional border />
          </div>
        )}
        {datesInvalid && <p className="-mt-1 px-1 text-footnote text-danger">{t.listEditor.datesInvalid}</p>}

        <div className="flex flex-none flex-col gap-2.5 rounded-card bg-surface px-4 pt-3 pb-3.5">
          <div className="flex items-center justify-between">
            <span className="text-body">{t.listEditor.defaultSplit}</span>
            <span className="text-body font-semibold tabular-nums">
              {percent} / {100 - percent}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Avatar member={members[0]} size={28} />
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={percent}
              aria-label={t.listEditor.percentOf(nameForms(members[0]).of)}
              onChange={(event) => setPercent(Number(event.target.value))}
              className="h-8 min-w-0 flex-1 accent-accent"
            />
            <Avatar member={members[1]} size={28} />
          </div>
          <div className="flex gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={preset === percent}
                onClick={() => setPercent(preset)}
                className={`h-9 flex-1 rounded-control text-subhead font-semibold tabular-nums ${preset === percent ? 'bg-accent text-white' : 'bg-fill'}`}
              >
                {preset} / {100 - preset}
              </button>
            ))}
          </div>
        </div>

        {list && !list.is_default && (
          <div className="flex-none overflow-hidden rounded-card bg-surface">
            <button type="button" disabled={pending} onClick={onArchive} className="h-[50px] w-full text-body text-accent-text">
              {archived ? t.listEditor.unarchive : t.listEditor.archive}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmingDelete(true)}
              className="h-[50px] w-full border-t-[0.5px] border-separator text-body text-danger"
            >
              {t.listEditor.delete}
            </button>
          </div>
        )}
      </div>

      {confirmingDelete && (
        <ActionSheet
          message={t.listEditor.deleteConfirm}
          confirmLabel={t.listEditor.delete}
          onConfirm={onDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </Sheet>
  )
}
