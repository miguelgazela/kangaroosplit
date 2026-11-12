import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ActionSheet } from '../components/ActionSheet'
import { BackLink } from '../components/BackLink'
import { Icon } from '../components/Icon'
import { Screen } from '../components/Screen'
import { useToast } from '../components/ToastContext'
import { t } from '../i18n/pt'
import { addDays, todayISO } from '../lib/dates'
import { localDay } from '../lib/dayLabel'
import { formatDayMonth, formatTime } from '../lib/format'
import { OfflineError, useOnline } from '../lib/online'
import { useCreatePaymentToken, usePaymentTokenStatus } from '../query/hooks'

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kangaroosplit-payments`

function lastPaymentLabel(instant: string): string {
  const day = localDay(instant)
  const today = todayISO()
  const label = day === today ? t.activity.today.toLowerCase() : day === addDays(today, -1) ? t.activity.yesterday.toLowerCase() : formatDayMonth(day)
  return `${label}, ${formatTime(instant)}`
}

export function PaymentsSetup() {
  const online = useOnline()
  const toast = useToast()
  const { data: status, isPending } = usePaymentTokenStatus()
  const createToken = useCreatePaymentToken()
  // The plain key exists only here, right after it is made.
  const [freshKey, setFreshKey] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast({ message: t.paymentsSetup.copied }),
      () => toast({ kind: 'error', message: t.paymentsSetup.copyFailed }),
    )
  }

  const makeKey = () => {
    createToken.mutate(undefined, {
      onSuccess: (key) => {
        setFreshKey(key)
        toast({ message: t.paymentsSetup.keyCreated })
      },
      onError: (error) =>
        toast({ kind: 'error', message: error instanceof OfflineError ? t.system.offline : t.paymentsSetup.error }),
    })
  }

  const state = !status ? 'off' : status.last_used_at ? 'on' : 'waiting'
  const statusText =
    state === 'on' ? t.paymentsSetup.on : state === 'waiting' ? t.paymentsSetup.waiting : t.paymentsSetup.off

  return (
    <Screen gap={12}>
      <div className="-mx-2 flex h-11 items-center">
        <BackLink to="/definicoes" label={t.paymentsSetup.back} />
      </div>
      <h1 className="text-[30px] leading-9 font-bold">{t.paymentsSetup.title}</h1>
      <p className="text-subhead text-text-2">{t.paymentsSetup.intro}</p>

      <div className="flex items-center gap-3 rounded-card bg-surface px-4 py-3.5 shadow-card">
        <span
          aria-hidden="true"
          className={`flex size-[42px] flex-none items-center justify-center rounded-xl ${state === 'on' ? 'bg-pos-soft text-pos' : state === 'waiting' ? 'bg-warn-soft text-warn' : 'bg-fill text-text-2'}`}
        >
          <Icon name={state === 'off' ? 'card' : state === 'on' ? 'check' : 'activity'} size={22} strokeWidth={2.4} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-headline font-semibold">{statusText}</span>
          {status?.last_used_at && (
            <span className="text-footnote text-text-2">{t.paymentsSetup.lastPayment(lastPaymentLabel(status.last_used_at))}</span>
          )}
        </span>
        {state === 'on' && (
          <Link to="/pagamentos" className="flex h-11 items-center gap-1 text-subhead font-semibold text-link">
            {t.paymentsSetup.see}
            <Icon name="chevronRight" size={12} strokeWidth={2.6} />
          </Link>
        )}
      </div>

      <h2 className="mt-2 px-4 text-footnote font-medium tracking-[0.3px] text-text-2 uppercase">
        {t.paymentsSetup.stepsTitle}
      </h2>
      <ol className="overflow-hidden rounded-card bg-surface shadow-card">
        <Step n={1} title={t.paymentsSetup.step1}>
          {freshKey ? (
            <KeyRow text={freshKey} onCopy={() => copy(freshKey)} />
          ) : status ? (
            <KeyRow text={t.paymentsSetup.maskedKey(status.hint)} />
          ) : (
            <button
              type="button"
              disabled={!online || createToken.isPending || isPending}
              onClick={makeKey}
              className="h-11 self-start rounded-xl bg-accent px-4 text-subhead font-semibold text-white disabled:opacity-40"
            >
              {t.paymentsSetup.createKey}
            </button>
          )}
          <p className="text-footnote text-text-2">{freshKey ? t.paymentsSetup.keyShownOnce : t.paymentsSetup.keyHelp}</p>
        </Step>

        <Step n={2} title={t.paymentsSetup.step2} border>
          <p className="text-subhead text-text-2">{t.paymentsSetup.step2Body}</p>
          <dl className="flex flex-col gap-2 text-subhead">
            <Field label={t.paymentsSetup.urlLabel}>
              <KeyRow text={ENDPOINT} onCopy={() => copy(ENDPOINT)} />
            </Field>
            <Field label={t.paymentsSetup.methodLabel}>
              <code className="font-mono">POST</code>
            </Field>
            <Field label={t.paymentsSetup.headerLabel}>
              <code className="font-mono break-all">{t.paymentsSetup.keyHeaderName}</code>
              <span className="text-text-2"> = {t.paymentsSetup.yourKey}</span>
            </Field>
            <Field label={t.paymentsSetup.bodyLabel}>
              <ul className="flex flex-col gap-1">
                {t.paymentsSetup.fields.map(([name, what]) => (
                  <li key={name}>
                    <code className="font-mono">{name}</code>
                    <span className="text-text-2"> · {what}</span>
                  </li>
                ))}
              </ul>
            </Field>
          </dl>
        </Step>

        <Step n={3} title={t.paymentsSetup.step3} border>
          <ul className="flex flex-col gap-2 text-subhead">
            {t.paymentsSetup.step3Lines.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden="true" className="text-text-2">
                  •
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </Step>
      </ol>

      <div className="flex gap-3 rounded-card bg-settle p-3.5">
        <Icon name="alert" size={22} className="mt-px flex-none text-link" />
        <div className="flex flex-col gap-1">
          <span className="text-subhead font-semibold">{t.paymentsSetup.limitsTitle}</span>
          <span className="text-[14px] leading-5 text-text-2">{t.paymentsSetup.limitsBody}</span>
        </div>
      </div>
      <p className="px-1 text-footnote text-text-2">{t.paymentsSetup.privacy}</p>

      {status && (
        <>
          <button
            type="button"
            disabled={!online}
            onClick={() => setConfirming(true)}
            className="h-[52px] rounded-card bg-surface text-body text-danger shadow-card disabled:opacity-40"
          >
            {t.paymentsSetup.newKey}
          </button>
          <p className="-mt-1 px-1 text-footnote text-text-2">{t.paymentsSetup.newKeyHelp}</p>
        </>
      )}

      {confirming && (
        <ActionSheet
          message={t.paymentsSetup.newKeyConfirm}
          confirmLabel={t.paymentsSetup.newKey}
          onConfirm={() => {
            setConfirming(false)
            makeKey()
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </Screen>
  )
}

function Step({ n, title, border = false, children }: { n: number; title: string; border?: boolean; children: ReactNode }) {
  return (
    <li className={`flex gap-3 p-4 ${border ? 'border-t-[0.5px] border-separator' : ''}`}>
      <span
        aria-hidden="true"
        className="flex size-7 flex-none items-center justify-center rounded-full bg-accent-soft text-subhead font-bold text-link"
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <h3 className="text-headline leading-7 font-semibold">{title}</h3>
        {children}
      </div>
    </li>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-footnote text-text-2">{label}</dt>
      <dd className="m-0">{children}</dd>
    </div>
  )
}

function KeyRow({ text, onCopy }: { text: string; onCopy?: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex min-h-11 min-w-0 flex-1 items-center rounded-control bg-fill px-3 font-mono text-subhead break-all select-all">
        {text}
      </span>
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="flex h-11 flex-none items-center gap-1.5 rounded-xl bg-accent px-3.5 text-subhead font-semibold text-white"
        >
          <Icon name="share" size={16} strokeWidth={2.2} />
          {t.paymentsSetup.copy}
        </button>
      )}
    </div>
  )
}
