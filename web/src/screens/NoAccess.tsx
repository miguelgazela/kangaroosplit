import { useAuth } from '../auth/AuthContext'
import { t } from '../i18n/pt'

// Signed in with an account that is not one of the two members.
export function NoAccess() {
  const { signOut } = useAuth()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-title2 font-bold">{t.noAccess.title}</h1>
      <p className="text-body text-text-2">{t.noAccess.body}</p>
      <button type="button" onClick={() => void signOut()} className="h-11 px-4 text-body text-link">
        {t.system.signOut}
      </button>
    </div>
  )
}
