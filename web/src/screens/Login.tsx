import { useState, type FormEvent } from 'react'
import { useAuth, InvalidCredentialsError } from '../auth/AuthContext'
import { Guru } from '../components/Guru'
import { Icon } from '../components/Icon'
import { t } from '../i18n/pt'

export function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await signIn(email, password)
    } catch (caught) {
      setError(caught instanceof InvalidCredentialsError ? t.login.invalid : t.system.error)
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-6 pt-[calc(env(safe-area-inset-top)+23px)] pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <div className="flex flex-col items-center gap-1">
        <Guru pose="ola" size={170} />
        <span className="font-rounded text-[30px] font-bold">{t.appName}</span>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3.5" aria-labelledby="login-title">
        <h1 id="login-title" className="mb-0.5 text-xl font-semibold">
          {t.login.title}
        </h1>
        <div className={`overflow-hidden rounded-cta bg-surface ${error ? 'ring-[1.5px] ring-danger' : ''}`}>
          <label className="flex flex-col gap-0.5 px-4 py-2.5">
            <span className="text-footnote text-text-2">{t.login.email}</span>
            <input
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="bg-transparent p-0 text-body text-text outline-none"
            />
          </label>
          <label className="flex flex-col gap-0.5 border-t-[0.5px] border-separator px-4 py-2.5">
            <span className="text-footnote text-text-2">{t.login.password}</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="bg-transparent p-0 text-body text-text outline-none"
            />
          </label>
        </div>
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-2.5 text-subhead text-danger">
            <Icon name="alert" size={18} strokeWidth={2.4} className="mt-px flex-none" />
            <span>{error}</span>
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="h-[52px] rounded-cta bg-accent text-body font-semibold text-white disabled:opacity-60"
        >
          {t.login.submit}
        </button>
        {/* TODO: open the password-recovery flow once it is designed (spec, open item 1). */}
        <button type="button" className="flex h-11 items-center self-center px-2 text-subhead font-medium text-link">
          {t.login.forgot}
        </button>
      </form>
    </div>
  )
}
