import { BackLink } from '../components/BackLink'
import { Icon } from '../components/Icon'
import { Screen } from '../components/Screen'
import { t } from '../i18n/pt'
import type { Category } from '../lib/database.types'
import { useOnline } from '../lib/online'
import { useCategories } from '../query/hooks'
import { useSheets } from '../sheets/SheetContext'

export function Categories() {
  const online = useOnline()
  const { editCategory } = useSheets()
  const { data: categories } = useCategories()

  const active = categories?.filter((category) => !category.archived_at) ?? []
  const archived = categories?.filter((category) => category.archived_at) ?? []

  const group = (items: Category[]) => (
    <div className="overflow-hidden rounded-card bg-surface shadow-card">
      {items.map((category, index) => (
        <button
          key={category.id}
          type="button"
          disabled={!online}
          onClick={() => editCategory(category)}
          className={`flex h-14 w-full items-center gap-3 px-3.5 text-left ${index > 0 ? 'border-t-[0.5px] border-separator' : ''}`}
        >
          <span
            className="flex size-9 flex-none items-center justify-center rounded-[10px] text-lg"
            style={{ background: `${category.color}26` }}
          >
            {category.icon}
          </span>
          <span className="min-w-0 flex-1 truncate text-body">{category.name}</span>
          <span className="size-3 flex-none rounded-full" style={{ background: category.color }} />
          <Icon name="chevronRight" size={14} strokeWidth={2.5} className="flex-none text-text-2" />
        </button>
      ))}
    </div>
  )

  return (
    <Screen gap={12}>
      <div className="-mx-2 flex h-11 items-center justify-between">
        <BackLink to="/definicoes" label={t.tabs.settings} />
        <button
          type="button"
          aria-label={t.categories.create}
          disabled={!online}
          onClick={() => editCategory()}
          className="flex size-11 items-center justify-center"
        >
          <span className={`flex size-[34px] items-center justify-center rounded-full text-white ${online ? 'bg-accent' : 'bg-disabled'}`}>
            <Icon name="plus" size={18} strokeWidth={2.6} />
          </span>
        </button>
      </div>
      <h1 className="text-[30px] leading-9 font-bold">{t.settings.categories}</h1>

      {active.length > 0 && group(active)}
      {archived.length > 0 && (
        <>
          <h2 className="mt-2 px-4 text-footnote tracking-[0.4px] text-text-2 uppercase">{t.categories.archivedSection}</h2>
          {group(archived)}
        </>
      )}
      <p className="px-1 text-footnote text-text-2">{t.categories.footnote}</p>
    </Screen>
  )
}
