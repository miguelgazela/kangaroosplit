import { useEffect, useMemo, useState } from 'react'
import { ShoppingIcon } from '../components/ShoppingIcon'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/ToastContext'
import { t } from '../i18n/pt'
import type { Member, ShoppingItem, ShoppingSection } from '../lib/database.types'
import { dayLabel, localDay } from '../lib/dayLabel'
import { formatTime } from '../lib/format'
import { isOnline, OfflineError } from '../lib/online'
import { nameForms } from '../lib/people'
import { MAX_QUANTITY, SECTIONS } from '../lib/shopping'
import { removeShoppingImage, uploadShoppingImage } from '../lib/shoppingImage'
import { useDeleteShoppingItem, useUpdateShoppingItem } from '../query/hooks'
import { ShoppingIconSheet, type IconChoice } from './ShoppingIconSheet'

const adder = (item: ShoppingItem, me: Member, partner: Member): string =>
  item.added_by === me.user_id ? 'por ti' : nameForms(partner).by

export function ShoppingItemSheet({
  item,
  me,
  partner,
  onClose,
}: {
  item: ShoppingItem
  me: Member
  partner: Member
  onClose: () => void
}) {
  const toast = useToast()
  const update = useUpdateShoppingItem()
  const remove = useDeleteShoppingItem()
  const [name, setName] = useState(item.name)
  const [emoji, setEmoji] = useState(item.emoji)
  const [quantity, setQuantity] = useState(item.quantity)
  const [note, setNote] = useState(item.note ?? '')
  const [section, setSection] = useState<ShoppingSection>(item.section)
  const [pickingIcon, setPickingIcon] = useState(false)
  // The photo: kept as it is, removed, or a new one still to be uploaded.
  const [image, setImage] = useState<{ kind: 'keep' } | { kind: 'remove' } | { kind: 'new'; blob: Blob }>({
    kind: 'keep',
  })
  const preview = useMemo(() => (image.kind === 'new' ? URL.createObjectURL(image.blob) : null), [image])
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])
  const [uploading, setUploading] = useState(false)

  const failed = (error: unknown) =>
    toast({ kind: 'error', message: error instanceof OfflineError ? t.system.offline : t.system.error })

  const valid = name.trim().length > 0
  const busy = update.isPending || remove.isPending || uploading

  const applyIcon = (choice: IconChoice) => {
    setPickingIcon(false)
    if (choice.kind === 'emoji') {
      setEmoji(choice.emoji)
      setImage(item.image_path ? { kind: 'remove' } : { kind: 'keep' })
    } else if (choice.blob) {
      setImage({ kind: 'new', blob: choice.blob })
    } else {
      setImage({ kind: 'keep' })
    }
  }

  const save = async () => {
    const patch: Parameters<typeof update.mutate>[0]['patch'] = {
      name,
      emoji,
      quantity,
      section,
      note: note.trim() === '' ? null : note.trim(),
    }
    let uploaded: string | null = null
    if (image.kind === 'new') {
      if (!isOnline()) {
        toast({ kind: 'error', message: t.shopping.photoOffline })
        return
      }
      setUploading(true)
      try {
        uploaded = await uploadShoppingImage(image.blob)
      } catch {
        setUploading(false)
        toast({ kind: 'error', message: t.shopping.photoUploadError })
        return
      }
      patch.image_path = uploaded
    } else if (image.kind === 'remove') {
      patch.image_path = null
    }
    update.mutate(
      { id: item.id, patch },
      {
        onSuccess: () => {
          // The old file is no longer used by anything.
          if (image.kind !== 'keep' && item.image_path) void removeShoppingImage(item.image_path)
          onClose()
        },
        onError: (error) => {
          if (uploaded) void removeShoppingImage(uploaded)
          setUploading(false)
          failed(error)
        },
      },
    )
  }

  const erase = () =>
    remove.mutate(item.id, {
      onSuccess: () => {
        onClose()
        toast({ message: t.shopping.itemDeleted })
      },
      onError: failed,
    })

  const when = `${dayLabel(localDay(item.created_at)).toLowerCase()}, ${formatTime(item.created_at)}`

  return (
    <Sheet
      title={t.shopping.sheetTitle}
      onCancel={onClose}
      action={{ label: t.actions.save, onClick: save, disabled: !valid || busy }}
    >
      <div className="flex flex-col gap-3 overflow-y-auto px-4 pt-1 pb-[calc(env(safe-area-inset-bottom)+34px)]">
        <div className="overflow-hidden rounded-card bg-surface">
          <div className="flex h-[60px] items-center gap-3 pr-4 pl-2.5">
            <button
              type="button"
              aria-label={t.shopping.changeEmoji}
              onClick={() => setPickingIcon(true)}
              className="flex-none touch-manipulation"
            >
              {preview ? (
                <img src={preview} alt="" className="size-11 rounded-xl object-cover" />
              ) : (
                <ShoppingIcon emoji={emoji} imagePath={image.kind === 'remove' ? null : item.image_path} size={44} />
              )}
            </button>
            <input
              type="text"
              aria-label={t.shopping.name}
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-body font-semibold outline-none"
            />
          </div>

          <div className="flex h-[52px] items-center border-t-[0.5px] border-separator pr-2 pl-4">
            <span className="flex-1 text-body">{t.shopping.quantity}</span>
            <div className="flex h-10 items-center rounded-[10px] bg-fill">
              <button
                type="button"
                aria-label={t.shopping.less}
                disabled={quantity <= 1}
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="h-10 w-11 text-[22px] text-link disabled:text-disabled"
              >
                −
              </button>
              <span className="min-w-6 text-center text-body font-semibold tabular-nums">{quantity}</span>
              <button
                type="button"
                aria-label={t.shopping.more}
                disabled={quantity >= MAX_QUANTITY}
                onClick={() => setQuantity((value) => Math.min(MAX_QUANTITY, value + 1))}
                className="h-10 w-11 text-[22px] text-link disabled:text-disabled"
              >
                +
              </button>
            </div>
          </div>

          <label className="flex h-[52px] items-center border-t-[0.5px] border-separator px-4">
            <input
              type="text"
              aria-label={t.shopping.note}
              placeholder={t.shopping.note}
              value={note}
              maxLength={120}
              onChange={(event) => setNote(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-text-2"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2 rounded-card bg-surface px-3 pt-3 pb-3.5">
          <span className="px-1 text-footnote text-text-2">{t.shopping.section}</span>
          <div role="radiogroup" aria-label={t.shopping.section} className="flex flex-wrap gap-1.5">
            {SECTIONS.map((candidate) => {
              const on = candidate.id === section
              return (
                <button
                  key={candidate.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSection(candidate.id)}
                  className={`h-[34px] rounded-full px-3 text-subhead ${on ? 'bg-accent font-semibold text-white' : 'bg-fill'}`}
                >
                  {candidate.label}
                </button>
              )
            })}
          </div>
        </div>

        <span className="px-1 text-footnote text-text-2">
          {t.shopping.addedByOn(adder(item, me, partner), when)}
        </span>

        <button
          type="button"
          disabled={busy}
          onClick={erase}
          className="h-[50px] rounded-cta bg-surface text-body font-semibold text-danger disabled:text-disabled"
        >
          {t.shopping.deleteItem}
        </button>
      </div>
      {pickingIcon && (
        <ShoppingIconSheet
          name={name}
          emoji={emoji}
          imagePath={image.kind === 'remove' ? null : image.kind === 'new' ? null : (item.image_path ?? null)}
          partnerSubject={nameForms(partner).subject}
          onCancel={() => setPickingIcon(false)}
          onUse={applyIcon}
          onError={(message) => toast({ kind: 'error', message })}
        />
      )}
    </Sheet>
  )
}
