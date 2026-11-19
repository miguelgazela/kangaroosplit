import { useEffect, useMemo, useState } from 'react'
import { ShoppingIcon } from '../components/ShoppingIcon'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/ToastContext'
import { t } from '../i18n/pt'
import type { ShoppingHistory, ShoppingSection } from '../lib/database.types'
import { isOnline, OfflineError } from '../lib/online'
import { SECTIONS } from '../lib/shopping'
import { removeShoppingImage, uploadShoppingImage } from '../lib/shoppingImage'
import { useDeleteShoppingHistory, useUpdateShoppingHistory } from '../query/hooks'
import { ShoppingIconSheet, type IconChoice } from './ShoppingIconSheet'

// Edit a "Habitual": its name, icon and section, or take it out of the grid.
// It only touches the history, never the items on the list.
export function UsualEditSheet({
  entry,
  partnerSubject,
  onClose,
}: {
  entry: ShoppingHistory
  partnerSubject: string
  onClose: () => void
}) {
  const toast = useToast()
  const update = useUpdateShoppingHistory()
  const remove = useDeleteShoppingHistory()
  const [name, setName] = useState(entry.name)
  const [emoji, setEmoji] = useState(entry.emoji)
  const [section, setSection] = useState<ShoppingSection>(entry.section)
  const [picking, setPicking] = useState(false)
  const [image, setImage] = useState<{ kind: 'keep' } | { kind: 'remove' } | { kind: 'new'; blob: Blob }>({
    kind: 'keep',
  })
  const [uploading, setUploading] = useState(false)
  const preview = useMemo(() => (image.kind === 'new' ? URL.createObjectURL(image.blob) : null), [image])
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const failed = (error: unknown) => {
    setUploading(false)
    const message =
      error instanceof OfflineError
        ? t.system.offline
        : error instanceof Error && /duplicate|23505|409/i.test(error.message)
          ? t.shopping.usualExists
          : t.system.error
    toast({ kind: 'error', message })
  }

  const busy = update.isPending || remove.isPending || uploading
  const valid = name.trim().length > 0

  const applyIcon = (choice: IconChoice) => {
    setPicking(false)
    if (choice.kind === 'emoji') {
      setEmoji(choice.emoji)
      setImage(entry.image_path ? { kind: 'remove' } : { kind: 'keep' })
    } else if (choice.blob) {
      setImage({ kind: 'new', blob: choice.blob })
    } else {
      setImage({ kind: 'keep' })
    }
  }

  const save = async () => {
    const patch: Parameters<typeof update.mutate>[0]['patch'] = { name, emoji, section }
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
      { nameKey: entry.name_key, patch },
      {
        onSuccess: () => {
          if (image.kind !== 'keep' && entry.image_path) void removeShoppingImage(entry.image_path)
          onClose()
        },
        onError: (error) => {
          if (uploaded) void removeShoppingImage(uploaded)
          failed(error)
        },
      },
    )
  }

  const erase = () =>
    remove.mutate(entry.name_key, {
      onSuccess: () => {
        onClose()
        toast({ message: t.shopping.usualRemoved(entry.name) })
      },
      onError: failed,
    })

  return (
    <Sheet
      title={t.shopping.editUsual}
      onCancel={onClose}
      action={{ label: t.actions.save, onClick: save, disabled: !valid || busy }}
    >
      <div className="flex flex-col gap-3 overflow-y-auto px-4 pt-1 pb-[calc(env(safe-area-inset-bottom)+34px)]">
        <div className="flex h-[60px] items-center gap-3 rounded-card bg-surface pr-4 pl-2.5">
          <button
            type="button"
            aria-label={t.shopping.changeEmoji}
            onClick={() => setPicking(true)}
            className="flex-none touch-manipulation"
          >
            {preview ? (
              <img src={preview} alt="" className="size-11 rounded-xl object-cover" />
            ) : (
              <ShoppingIcon emoji={emoji} imagePath={image.kind === 'remove' ? null : entry.image_path} size={44} />
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

        <button
          type="button"
          disabled={busy}
          onClick={erase}
          className="h-[50px] rounded-cta bg-surface text-body font-semibold text-danger disabled:text-disabled"
        >
          {t.shopping.removeUsual}
        </button>
      </div>

      {picking && (
        <ShoppingIconSheet
          name={name}
          emoji={emoji}
          imagePath={image.kind === 'remove' || image.kind === 'new' ? null : (entry.image_path ?? null)}
          partnerSubject={partnerSubject}
          onCancel={() => setPicking(false)}
          onUse={applyIcon}
          onError={(message) => toast({ kind: 'error', message })}
        />
      )}
    </Sheet>
  )
}
