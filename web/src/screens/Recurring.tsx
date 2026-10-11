import { BackLink } from '../components/BackLink'
import { Icon } from '../components/Icon'
import { Screen } from '../components/Screen'
import { useToast } from '../components/ToastContext'
import { t } from '../i18n/pt'
import { formatMoney } from '../lib/format'
import { OfflineError, useOnline } from '../lib/online'
import { ruleStatus } from '../lib/ruleStatus'
import { useCategories, useLists, useRecurring, useSetRecurringPaused } from '../query/hooks'
import { useSheets } from '../sheets/SheetContext'

const FREQUENCY = { weekly: t.recurring.weekly, monthly: t.recurring.monthly, yearly: t.recurring.yearly }

export function Recurring() {
  const online = useOnline()
  const toast = useToast()
  const { editRecurring } = useSheets()
  const { data: rules } = useRecurring()
  const { data: lists } = useLists()
  const { data: categories } = useCategories()
  const setPaused = useSetRecurringPaused()

  const resume = (id: string) =>
    setPaused.mutate(
      { id, paused: false },
      {
        onError: (error) =>
          toast({ kind: 'error', message: error instanceof OfflineError ? t.system.offline : t.system.error }),
      },
    )

  return (
    <Screen gap={12}>
      <div className="-mx-2 flex h-11 items-center justify-between">
        <BackLink to="/definicoes" label={t.tabs.settings} />
        <button
          type="button"
          aria-label={t.recurring.create}
          disabled={!online}
          onClick={() => editRecurring()}
          className="flex size-11 items-center justify-center"
        >
          <span className={`flex size-[34px] items-center justify-center rounded-full text-white ${online ? 'bg-accent' : 'bg-disabled'}`}>
            <Icon name="plus" size={18} strokeWidth={2.6} />
          </span>
        </button>
      </div>
      <h1 className="text-[30px] leading-9 font-bold">{t.recurring.title}</h1>

      {rules && lists && categories && rules.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3.5 pb-[60px] text-center">
          <div className="flex size-[104px] items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="repeat" size={44} strokeWidth={1.8} />
          </div>
          <p className="text-headline font-semibold">{t.recurring.empty}</p>
          <p className="max-w-[280px] text-subhead text-text-2">{t.recurring.emptyHint}</p>
          <button
            type="button"
            disabled={!online}
            onClick={() => editRecurring()}
            className="mt-1 flex h-12 items-center gap-2 rounded-button bg-accent px-5 text-headline font-semibold text-white disabled:bg-disabled"
          >
            <Icon name="plus" size={20} strokeWidth={2.4} />
            {t.recurring.create}
          </button>
        </div>
      )}

      {rules && lists && categories && rules.length > 0 && (
        <>
          <div className="overflow-hidden rounded-card bg-surface shadow-card">
            {rules.map((rule, index) => {
              const list = lists.find((candidate) => candidate.id === rule.list_id)
              const category = categories.find((candidate) => candidate.id === rule.category_id)
              const paused = rule.paused_at !== null
              return (
                <div key={rule.id} className={`flex items-center ${index > 0 ? 'border-t-[0.5px] border-separator' : ''}`}>
                  <button
                    type="button"
                    disabled={!online}
                    onClick={() => editRecurring(rule)}
                    className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-2 pl-3.5 text-left"
                  >
                    <span className={`flex size-[42px] flex-none items-center justify-center rounded-xl bg-fill text-[21px] ${paused ? 'opacity-50' : ''}`}>
                      {category?.icon ?? '📦'}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={`truncate text-base font-semibold ${paused ? 'text-text-2' : ''}`}>{rule.description}</span>
                      <span className="truncate text-footnote text-text-2">
                        {FREQUENCY[rule.frequency]} · {list?.icon} {list?.name}
                      </span>
                      {paused ? (
                        <span className="inline-flex items-center gap-1 self-start rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">
                          <Icon name="pause" size={11} strokeWidth={3.4} />
                          {t.recurring.paused}
                        </span>
                      ) : (
                        <span className="truncate text-footnote text-text-2">{ruleStatus(rule)}</span>
                      )}
                    </span>
                  </button>
                  <span className="flex flex-none flex-col items-end pr-3.5">
                    <span className={`text-base font-semibold tabular-nums ${paused ? 'text-text-2' : ''}`}>
                      {formatMoney(rule.amount_cents)}
                    </span>
                    {paused && (
                      <button
                        type="button"
                        disabled={!online || setPaused.isPending}
                        onClick={() => resume(rule.id)}
                        className="-mr-2 h-9 px-2 text-subhead font-semibold text-accent-text disabled:text-disabled"
                      >
                        {t.recurring.resume}
                      </button>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="px-1 text-footnote text-text-2">{t.recurring.footnote}</p>
        </>
      )}
    </Screen>
  )
}
