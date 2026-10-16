import { BackLink } from '../components/BackLink'
import { Screen } from '../components/Screen'
import { CHANGELOG } from '../data/changelog'
import { t } from '../i18n/pt'
import { formatISODate } from '../lib/format'

export function Changelog() {
  return (
    <Screen gap={12}>
      <div className="-mx-2 flex h-11 items-center">
        <BackLink to="/definicoes" label={t.tabs.settings} />
      </div>
      <h1 className="text-[30px] leading-9 font-bold">{t.settings.changelog}</h1>

      {CHANGELOG.map((entry) => (
        <section key={entry.version} className="rounded-card bg-surface p-4 shadow-card">
          <div className="flex items-baseline justify-between">
            <h2 className="text-headline font-bold">{t.settings.version(entry.version)}</h2>
            <span className="text-footnote text-text-2">{formatISODate(entry.date)}</span>
          </div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {entry.changes.map((change) => (
              <li key={change} className="flex gap-2 text-body">
                <span aria-hidden="true" className="mt-[9px] size-1.5 flex-none rounded-full bg-accent" />
                {change}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Screen>
  )
}
