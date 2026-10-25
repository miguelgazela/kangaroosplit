import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ActionSheet } from '../components/ActionSheet'
import { Avatar } from '../components/Avatar'
import { ColorSwatches } from '../components/ColorSwatches'
import { Icon } from '../components/Icon'
import { Screen } from '../components/Screen'
import { useToast } from '../components/ToastContext'
import { VERSION } from '../data/changelog'
import { t } from '../i18n/pt'
import { todayISO } from '../lib/dates'
import { buildCsv, saveCsv } from '../lib/export'
import { OfflineError, useOnline } from '../lib/online'
import { usePush } from '../lib/usePush'
import {
  useCategories,
  useCurrentMember,
  useExpenses,
  useLists,
  useMembers,
  useRecurring,
  useSettlements,
  useUpdateProfile,
} from '../query/hooks'

export function Settings() {
  const online = useOnline()
  const toast = useToast()
  const { session, signOut } = useAuth()
  const { me } = useCurrentMember()
  const { data: categories } = useCategories()
  const { data: rules } = useRecurring()
  const updateProfile = useUpdateProfile()
  const [name, setName] = useState<string | null>(null)
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)
  const push = usePush()
  const { data: members } = useMembers()
  const { data: lists } = useLists()
  const { data: expenses } = useExpenses()
  const { data: settlements } = useSettlements()
  const exportable = members && lists && categories && expenses && settlements

  const exportData = () => {
    if (!exportable) return
    const csv = buildCsv({ members, lists, categories, expenses, settlements })
    saveCsv(csv, `kangaroosplit-${todayISO()}.csv`).catch(fail)
  }

  const fail = (error: unknown) =>
    toast({ kind: 'error', message: error instanceof OfflineError ? t.system.offline : t.system.error })

  const saveName = () => {
    const trimmed = name?.trim()
    setName(null)
    if (!me || !trimmed || trimmed === me.display_name) return
    updateProfile.mutate(
      { userId: me.user_id, display_name: trimmed },
      { onSuccess: () => toast({ message: t.settings.profileSaved }), onError: fail },
    )
  }

  const togglePush = async () => {
    try {
      const next = await (push.state === 'on' ? push.disable() : push.enable())
      if (next === 'blocked') toast({ kind: 'error', message: t.notifications.blocked })
    } catch (error) {
      fail(error)
    }
  }

  const activeCategories = categories?.filter((category) => !category.archived_at) ?? []

  return (
    <Screen>
      <div className="mt-1 flex h-[52px] items-center">
        <h1 className="text-large-title font-bold tracking-[0.4px]">{t.tabs.settings}</h1>
      </div>

      {me && (
        <section className="flex flex-col gap-2">
          <h2 className="px-4 text-footnote tracking-[0.4px] text-text-2 uppercase">{t.settings.profile}</h2>
          <div className="overflow-hidden rounded-card bg-surface shadow-card">
            <div className="flex items-center gap-3.5 p-4">
              <Avatar member={me} size={56} />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-xl font-bold">{me.display_name}</span>
                <span className="truncate text-footnote text-text-2">{session?.user.email}</span>
              </div>
            </div>
            <label className="flex h-12 items-center gap-3 border-t-[0.5px] border-separator px-4">
              <span className="text-body">{t.settings.name}</span>
              <input
                type="text"
                value={name ?? me.display_name}
                maxLength={30}
                disabled={!online}
                enterKeyHint="done"
                onChange={(event) => setName(event.target.value)}
                onBlur={saveName}
                onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
                className="min-w-0 flex-1 bg-transparent text-right text-body text-text-2 outline-none focus:text-text"
              />
            </label>
            <div className="flex flex-col gap-2 border-t-[0.5px] border-separator px-4 pt-3 pb-3.5">
              <span className="text-body">{t.settings.color}</span>
              <ColorSwatches
                label={t.settings.color}
                value={me.color}
                disabled={!online}
                onChange={(color) => updateProfile.mutate({ userId: me.user_id, color }, { onError: fail })}
              />
            </div>
          </div>
        </section>
      )}

      <div className="mt-1 overflow-hidden rounded-card bg-surface shadow-card">
        <Link to="/categorias" className="flex flex-col gap-2.5 px-3.5 py-3">
          <span className="flex items-center gap-3">
            <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-neg-soft text-neg">
              <Icon name="grid" size={18} />
            </span>
            <span className="flex-1 text-body">{t.settings.categories}</span>
            <span className="text-body text-text-2">{activeCategories.length}</span>
            <Icon name="chevronRight" size={14} strokeWidth={2.5} className="text-text-2" />
          </span>
          <span className="flex flex-wrap gap-1.5 pl-11">
            {activeCategories.map((category) => (
              <span
                key={category.id}
                className="flex size-[30px] items-center justify-center rounded-lg text-base"
                style={{ background: `${category.color}26` }}
              >
                {category.icon}
              </span>
            ))}
          </span>
        </Link>
        <Link to="/recorrentes" className="flex h-[52px] items-center gap-3 border-t-[0.5px] border-separator px-3.5">
          <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-accent-soft text-link">
            <Icon name="repeat" size={18} />
          </span>
          <span className="flex-1 text-body">{t.recurring.title}</span>
          <span className="text-body text-text-2">{rules?.length ?? ''}</span>
          <Icon name="chevronRight" size={14} strokeWidth={2.5} className="text-text-2" />
        </Link>
        <div className="flex min-h-[52px] items-center gap-3 border-t-[0.5px] border-separator px-3.5 py-2">
          <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-pos-soft text-pos">
            <Icon name="bell" size={18} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-body">{t.notifications.title}</span>
            {push.state === 'unsupported' && (
              <span className="text-footnote text-text-2">{t.notifications.needsInstall}</span>
            )}
            {push.state === 'blocked' && <span className="text-footnote text-text-2">{t.notifications.blocked}</span>}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={push.state === 'on'}
            aria-label={t.notifications.title}
            disabled={!online || push.busy || push.state === null || push.state === 'unsupported' || push.state === 'blocked'}
            onClick={() => void togglePush()}
            className={`relative h-[31px] w-[51px] flex-none rounded-full transition-colors disabled:opacity-40 ${push.state === 'on' ? 'bg-pos' : 'bg-fill'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 size-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform ${push.state === 'on' ? 'translate-x-5' : ''}`}
            />
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={!exportable}
        onClick={exportData}
        className="mt-1 flex min-h-[52px] items-center gap-3 rounded-card bg-surface px-3.5 py-2 text-left shadow-card"
      >
        <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-fill text-text-2">
          <Icon name="share" size={18} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body">{t.settings.exportData}</span>
          <span className="text-footnote text-text-2">{t.settings.exportHint}</span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => setConfirmingSignOut(true)}
        className="mt-1 h-[52px] rounded-card bg-surface text-body text-danger shadow-card"
      >
        {t.system.signOut}
      </button>
      <Link to="/novidades" className="flex h-11 items-center justify-center gap-1 text-footnote text-text-2">
        {t.settings.version(VERSION)} · {t.settings.changelog}
        <Icon name="chevronRight" size={11} strokeWidth={2.5} />
      </Link>

      {confirmingSignOut && (
        <ActionSheet
          message={t.settings.signOutConfirm}
          confirmLabel={t.system.signOut}
          onConfirm={() => void signOut()}
          onCancel={() => setConfirmingSignOut(false)}
        />
      )}
    </Screen>
  )
}
