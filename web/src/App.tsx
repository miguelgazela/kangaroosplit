import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { InstallHint } from './components/InstallHint'
import { NotificationPrompt } from './components/NotificationPrompt'
import { TabBar } from './components/TabBar'
import { ToastProvider } from './components/Toast'
import { useOnline } from './lib/online'
import { useCurrentMember } from './query/hooks'
import { Activity } from './screens/Activity'
import { Categories } from './screens/Categories'
import { Home } from './screens/Home'
import { ListDetail } from './screens/ListDetail'
import { Login } from './screens/Login'
import { NoAccess } from './screens/NoAccess'
import { Recurring } from './screens/Recurring'
import { Settings } from './screens/Settings'
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

function ListRoute() {
  const { addExpense, editExpense, settle, editList } = useSheets()
  return (
    <ListDetail onAddExpense={addExpense} onEditExpense={editExpense} onSettle={settle} onOptions={editList} />
  )
}

function App() {
  const { loading, session } = useAuth()
  const { status } = useCurrentMember()

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
          <Route path="lista/:id" element={<ListRoute />} />
          <Route path="atividade" element={<Activity />} />
          <Route path="estatisticas" element={<Stats />} />
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

export default App
