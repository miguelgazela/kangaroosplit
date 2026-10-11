import { NavLink, useLocation } from 'react-router-dom'
import { t } from '../i18n/pt'
import { Icon, type IconName } from './Icon'

// `within` lists other routes that belong to the tab (its sub-pages).
function Tab({ to, icon, label, within = [] }: { to: string; icon: IconName; label: string; within?: string[] }) {
  const { pathname } = useLocation()
  const inSubPage = within.some((prefix) => pathname.startsWith(prefix))
  return (
    <NavLink to={to} end={to === '/'}>
      {({ isActive }) => {
        const active = isActive || inSubPage
        return (
          <span
            className={`flex h-[49px] flex-col items-center justify-center gap-[3px] ${active ? 'text-accent-text' : 'text-tab-off'}`}
          >
            <Icon name={icon} strokeWidth={active ? 2.2 : 1.8} />
            <span className={`text-tab tracking-[0.1px] ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
          </span>
        )
      }}
    </NavLink>
  )
}

export function TabBar({ onAdd, addDisabled = false }: { onAdd: () => void; addDisabled?: boolean }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20">
      <nav
        aria-label={t.tabs.nav}
        className="grid grid-cols-5 border-t-[0.5px] border-separator bg-tabbar px-1.5 pb-[env(safe-area-inset-bottom)] backdrop-blur-[20px]"
      >
        <Tab to="/" icon="home" label={t.tabs.home} within={['/lista/']} />
        <Tab to="/atividade" icon="activity" label={t.tabs.activity} />
        <div className="h-[49px]" />
        <Tab to="/estatisticas" icon="stats" label={t.tabs.stats} />
        <Tab to="/definicoes" icon="settings" label={t.tabs.settings} within={['/recorrentes', '/categorias']} />
      </nav>
      <button
        type="button"
        aria-label={t.tabs.add}
        disabled={addDisabled}
        onClick={onAdd}
        className="absolute -top-[17px] left-1/2 flex size-[60px] -translate-x-1/2 items-center justify-center rounded-full border-4 border-bg bg-accent text-white shadow-fab disabled:bg-disabled disabled:shadow-none"
      >
        <Icon name="plus" size={26} strokeWidth={2.4} />
      </button>
    </div>
  )
}
