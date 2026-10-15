import { useEffect } from 'react'
import { BrowserRouter, Outlet, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { InstallHint } from './components/InstallHint'
import { NotificationPrompt } from './components/NotificationPrompt'
import { OfflineScreen } from './components/OfflineScreen'
import { TabBar } from './components/TabBar'
import { ToastProvider } from './components/Toast'
import { applyBrand } from './lib/brand'
import { useOnline } from './lib/online'
import { useCurrentMember } from './query/hooks'
import { Activity } from './screens/Activity'
import { Categories } from './screens/Categories'
import { CategoryStats } from './screens/CategoryStats'
import { Home } from './screens/Home'
import { ListDetail } from './screens/ListDetail'
import { Login } from './screens/Login'
import { NoAccess } from './screens/NoAccess'
import { Recurring } from './screens/Recurring'
import { Settings } from './screens/Settings'
import { Shopping } from './screens/Shopping'
import { Stats } from './screens/Stats'
import { useSheets } from './sheets/SheetContext'
import { SheetHost } from './sheets/SheetHost'

function Shell() {
  const online = useOnline()
  const { addExpense } = useSheets()
  return (
    <>
      <Outlet />
      <TabBar onAdd={() => addExpense()} addDisabled={!online} />
    </>
  )
}

function HomeRoute() {
  const { settle, newList } = useSheets()
  return (
    <>
      <Home onSettleAll={() => settle()} onNewList={newList} />
      <NotificationPrompt />
    </>
  )
}

// Target of the home-screen shortcut: opens the add-expense sheet straight
// away, over the home screen, instead of landing on a blank page.
function NewExpenseRoute() {
  const online = useOnline()
  const { addExpense } = useSheets()
  const navigate = useNavigate()
  useEffect(() => {
    if (online) addExpense()
    navigate('/', { replace: true })
  }, [online, addExpense, navigate])
  return null
}

function ListRoute() {
  const { addExpense, editExpense, openExpense, settle, editList } = useSheets()
  const [params, setParams] = useSearchParams()

  // A push about a comment or reaction links to ?despesa=<id>.
  const target = params.get('despesa')
  useEffect(() => {
    if (!target) return
    openExpense(target)
    setParams({}, { replace: true })
  }, [target, openExpense, setParams])

  return (
    <ListDetail
      onAddExpense={addExpense}
      onEditExpense={editExpense}
      onOpenExpense={openExpense}
      onSettle={settle}
      onOptions={editList}
    />
  )
}

function Content() {
  const { loading, session } = useAuth()
  const { status, me } = useCurrentMember()

  // Accents take the signed-in person's colour; signing out restores the default.
  const brand = session ? me?.color : null
  useEffect(() => {
    // Undefined: signed in but profile not loaded yet, so keep the cached colour.
    if (brand !== undefined) applyBrand(brand)
  }, [brand])

  if (loading) return null
  if (!session) {
    return (
      <>
        <Login />
        <InstallHint />
      </>
    )
  }
  if (status === 'notMember') return <NoAccess />

  return (
    <ToastProvider>
      <BrowserRouter>
        <SheetHost>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<HomeRoute />} />
          <Route path="nova" element={<NewExpenseRoute />} />
          <Route path="lista/:id" element={<ListRoute />} />
          <Route path="atividade" element={<Activity />} />
          <Route path="compras" element={<Shopping />} />
          <Route path="estatisticas" element={<Stats />} />
          <Route path="estatisticas/categoria/:categoryId" element={<CategoryStats />} />
          <Route path="definicoes" element={<Settings />} />
          <Route path="recorrentes" element={<Recurring />} />
          <Route path="categorias" element={<Categories />} />
          <Route path="*" element={<HomeRoute />} />
        </Route>
      </Routes>
        </SheetHost>
      </BrowserRouter>
    </ToastProvider>
  )
}

function App() {
  const online = useOnline()
  return (
    <>
      <Content />
      {!online && <OfflineScreen />}
    </>
  )
}

export default App
