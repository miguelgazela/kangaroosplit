import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { Segmented } from '../components/Segmented'
import { Sheet } from '../components/Sheet'
import { t } from '../i18n/pt'
import { EMOJI_GROUPS, firstEmoji, searchEmoji, suggestEmoji } from '../lib/emoji'
import {
  cropSquare,
  loadPhoto,
  renderIcon,
  type Crop,
  type LoadedPhoto,
} from '../lib/shoppingImage'
import { useShoppingImage } from '../query/hooks'

export type IconChoice =
  | { kind: 'emoji'; emoji: string }
  // A newly cropped photo, or the one the item already has (`blob` null).
  | { kind: 'photo'; blob: Blob | null }

type Tab = 'emoji' | 'foto'

const FRAME = 240

function EmojiTab({
  name,
  emoji,
  onPick,
}: {
  name: string
  emoji: string
  onPick: (emoji: string) => void
}) {
  const [query, setQuery] = useState('')
  const typed = firstEmoji(query)
  const found = useMemo(() => (typed ? [] : searchEmoji(query)), [query, typed])
  const suggested = useMemo(() => suggestEmoji(name), [name])
  const searching = query.trim() !== '' && !typed

  const cell = (candidate: string) => (
    <button
      key={candidate}
      type="button"
      role="option"
      aria-selected={candidate === emoji}
      onClick={() => onPick(candidate)}
      className={`flex size-[46px] touch-manipulation items-center justify-center rounded-xl text-[26px] ${candidate === emoji ? 'bg-accent-soft ring-2 ring-accent' : ''}`}
    >
      {candidate}
    </button>
  )

  return (
    <div className="flex flex-col gap-3">
      <label className="flex h-11 items-center gap-2 rounded-control bg-fill px-3">
        <Icon name="search" size={18} className="text-text-2" />
        <input
          type="text"
          aria-label={t.shopping.searchEmoji}
          placeholder={t.shopping.searchEmoji}
          value={query}
          maxLength={40}
          autoComplete="off"
          autoCorrect="off"
          onChange={(event) => {
            const value = event.target.value
            setQuery(value)
            // Any emoji from the keyboard is taken at once.
            const typedEmoji = firstEmoji(value)
            if (typedEmoji) onPick(typedEmoji)
          }}
          className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-text-2"
        />
      </label>

      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-[60px] flex-none items-center justify-center rounded-2xl bg-surface text-[34px] shadow-card"
        >
          {emoji}
        </span>
        <p className="text-footnote leading-[18px] text-text-2">{t.shopping.emojiHint}</p>
      </div>

      {searching ? (
        found.length > 0 ? (
          <div role="listbox" aria-label={t.shopping.emoji} className="flex flex-wrap gap-0.5 rounded-card bg-surface p-2">
            {found.map((entry) => cell(entry.emoji))}
          </div>
        ) : (
          <p className="px-1 text-subhead text-text-2">{t.shopping.noEmoji}</p>
        )
      ) : (
        <>
          {suggested.length > 0 && (
            <section className="flex flex-col gap-1.5">
              <h2 className="px-1 text-footnote font-semibold tracking-[0.4px] text-text-2 uppercase">
                {t.shopping.suggestedFor(name.trim())}
              </h2>
              <div role="listbox" aria-label={t.shopping.suggestedFor(name.trim())} className="flex flex-wrap gap-1">
                {suggested.map(cell)}
              </div>
            </section>
          )}
          {EMOJI_GROUPS.map((group) => (
            <section key={group.id} className="flex flex-col gap-1.5">
              <h2 className="px-1 text-footnote font-semibold tracking-[0.4px] text-text-2 uppercase">{group.label}</h2>
              <div role="listbox" aria-label={group.label} className="flex flex-wrap gap-0.5 rounded-card bg-surface p-2">
                {group.entries.map((entry) => cell(entry.emoji))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  )
}

// Drag to move, slider (or wheel) to zoom. The picture is a square window on
// the photo; what shows in the frame is what is saved.
function Cropper({ photo, crop, onChange }: { photo: LoadedPhoto; crop: Crop; onChange: (crop: Crop) => void }) {
  const { naturalWidth: width, naturalHeight: height } = photo.image
  const drag = useRef<{ x: number; y: number; crop: Crop } | null>(null)
  const { sx, sy, side } = cropSquare(width, height, crop)
  const scale = FRAME / side

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        role="img"
        aria-label={t.shopping.cropArea}
        className="relative touch-none overflow-hidden rounded-2xl bg-fill"
        style={{ width: FRAME, height: FRAME }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          drag.current = { x: event.clientX, y: event.clientY, crop }
        }}
        onPointerMove={(event) => {
          const start = drag.current
          if (!start) return
          // Dragging right moves the picture right, so the window moves left.
          onChange({
            zoom: start.crop.zoom,
            x: start.crop.x - (event.clientX - start.x) / scale / width,
            y: start.crop.y - (event.clientY - start.y) / scale / height,
          })
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onWheel={(event) => onChange({ ...crop, zoom: Math.min(4, Math.max(1, crop.zoom - event.deltaY / 400)) })}
      >
        <img
          src={photo.url}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none"
          style={{
            width: width * scale,
            height: height * scale,
            left: -sx * scale,
            top: -sy * scale,
          }}
        />
      </div>
      <label className="flex w-[240px] items-center gap-2 text-text-2">
        <span aria-hidden="true" className="text-footnote">−</span>
        <input
          type="range"
          aria-label={t.shopping.zoom}
          min={1}
          max={4}
          step={0.01}
          value={crop.zoom}
          onChange={(event) => onChange({ ...crop, zoom: Number(event.target.value) })}
          className="min-w-0 flex-1 accent-(--ks-accent)"
        />
        <span aria-hidden="true" className="text-body">+</span>
      </label>
    </div>
  )
}

function PhotoTab({
  name,
  partnerSubject,
  currentPath,
  photo,
  crop,
  removed,
  onPhoto,
  onCrop,
  onRemove,
}: {
  name: string
  partnerSubject: string
  currentPath: string | null
  photo: LoadedPhoto | null
  crop: Crop
  removed: boolean
  onPhoto: (file: File) => void
  onCrop: (crop: Crop) => void
  onRemove: () => void
}) {
  const { data: currentLink } = useShoppingImage(removed ? null : currentPath)
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) onPhoto(file)
  }
  const hasPhoto = photo !== null || (currentPath !== null && !removed)

  return (
    <div className="flex flex-col gap-3">
      {photo ? (
        <Cropper photo={photo} crop={crop} onChange={onCrop} />
      ) : hasPhoto && currentLink ? (
        <div className="flex justify-center">
          <img
            src={currentLink}
            alt=""
            width={FRAME}
            height={FRAME}
            className="rounded-2xl object-cover"
            style={{ width: FRAME, height: FRAME }}
          />
        </div>
      ) : (
        <div
          className="mx-auto flex items-center justify-center rounded-2xl bg-fill px-6 text-center text-subhead text-text-2"
          style={{ width: FRAME, height: FRAME }}
        >
          {t.shopping.noPhotoYet}
        </div>
      )}
      {photo && <p className="px-1 text-center text-footnote text-text-2">{t.shopping.cropHint}</p>}

      <input ref={camera} type="file" accept="image/*" capture="environment" onChange={pick} className="hidden" />
      <input ref={gallery} type="file" accept="image/*" onChange={pick} className="hidden" />

      <div className="overflow-hidden rounded-card bg-surface">
        <button
          type="button"
          onClick={() => camera.current?.click()}
          className="flex h-[52px] w-full items-center gap-3 px-4 text-left text-body text-link"
        >
          <Icon name="camera" size={20} />
          {t.shopping.takePhoto}
        </button>
        <button
          type="button"
          onClick={() => gallery.current?.click()}
          className="flex h-[52px] w-full items-center gap-3 border-t-[0.5px] border-separator px-4 text-left text-body text-link"
        >
          <Icon name="grid" size={20} />
          {t.shopping.pickPhoto}
        </button>
        {hasPhoto && (
          <button
            type="button"
            onClick={onRemove}
            className="flex h-[52px] w-full items-center gap-3 border-t-[0.5px] border-separator px-4 text-left text-body text-danger"
          >
            <Icon name="trash" size={20} />
            {t.shopping.removePhoto}
          </button>
        )}
      </div>
      <p className="px-1 text-footnote text-text-2">{t.shopping.photoNote(name.trim() || '…', partnerSubject)}</p>
    </div>
  )
}

// "Ícone": an emoji (from the grid, a search, or the keyboard) or a photo.
// "Usar" decides by the tab that is open.
export function ShoppingIconSheet({
  name,
  emoji: initialEmoji,
  imagePath,
  partnerSubject,
  onCancel,
  onUse,
  onError,
}: {
  name: string
  emoji: string
  imagePath: string | null
  partnerSubject: string
  onCancel: () => void
  onUse: (choice: IconChoice) => void
  onError: (message: string) => void
}) {
  const [tab, setTab] = useState<Tab>(imagePath ? 'foto' : 'emoji')
  const [emoji, setEmoji] = useState(initialEmoji)
  const [photo, setPhoto] = useState<LoadedPhoto | null>(null)
  const [crop, setCrop] = useState<Crop>({ zoom: 1, x: 0.5, y: 0.5 })
  const [removed, setRemoved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url)
  }, [photo])

  const onPhoto = async (file: File) => {
    try {
      setPhoto(await loadPhoto(file))
      setCrop({ zoom: 1, x: 0.5, y: 0.5 })
      setRemoved(false)
    } catch {
      onError(t.shopping.photoError)
    }
  }

  const keepsPhoto = tab === 'foto' && (photo !== null || (imagePath !== null && !removed))

  const use = async () => {
    if (tab === 'emoji' || !keepsPhoto) {
      onUse({ kind: 'emoji', emoji })
      return
    }
    if (!photo) {
      onUse({ kind: 'photo', blob: null })
      return
    }
    setBusy(true)
    try {
      onUse({ kind: 'photo', blob: await renderIcon(photo.image, crop) })
    } catch {
      setBusy(false)
      onError(t.shopping.photoError)
    }
  }

  return (
    <Sheet title={t.shopping.iconTitle} onCancel={onCancel} action={{ label: t.shopping.use, onClick: use, disabled: busy }}>
      <div className="flex flex-col gap-3 overflow-y-auto px-4 pt-1 pb-[calc(env(safe-area-inset-bottom)+34px)]">
        <Segmented
          label={t.shopping.iconTabs}
          value={tab}
          onChange={setTab}
          options={[
            { id: 'emoji', label: t.shopping.tabEmoji },
            { id: 'foto', label: t.shopping.tabPhoto },
          ]}
        />
        {tab === 'emoji' ? (
          <EmojiTab name={name} emoji={emoji} onPick={setEmoji} />
        ) : (
          <PhotoTab
            name={name}
            partnerSubject={partnerSubject}
            currentPath={imagePath}
            photo={photo}
            crop={crop}
            removed={removed}
            onPhoto={onPhoto}
            onCrop={setCrop}
            onRemove={() => {
              setPhoto(null)
              setRemoved(true)
            }}
          />
        )}
      </div>
    </Sheet>
  )
}
