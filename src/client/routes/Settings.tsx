import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import copy from '../copy'
import { useInstall } from '../pwa/useInstall'

export default function Settings() {
  const { email, logout } = useAuth()
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)
  const { canPrompt, promptInstall, showIosHint } = useInstall()
  return (
    <main className="page settings-page">
      <Link to="/" className="icon-link">{copy.settings.back}</Link>
      <h1 className="auth-title">{copy.settings.title}</h1>
      <div className="settings-row">
        <span>{copy.settings.account}</span>
        <bdi dir="ltr">{email}</bdi>
      </div>
      {(canPrompt || showIosHint) && (
        <section className="settings-install">
          <h2 className="settings-install__title">{copy.install.title}</h2>
          {canPrompt && (
            <button className="btn btn--ghost" type="button" onClick={() => void promptInstall()}>
              {copy.install.button}
            </button>
          )}
          {showIosHint && <p className="tagline">{copy.install.iosHint}</p>}
        </section>
      )}
      <button
        className="btn btn--ghost"
        type="button"
        onClick={async () => {
          setFailed(false)
          if (await logout()) navigate('/login', { replace: true })
          else setFailed(true)
        }}
      >
        {copy.settings.logout}
      </button>
      {failed && <p className="form-error" role="alert">{copy.settings.errLogout}</p>}
      <p className="tagline settings-version">{copy.settings.version}</p>
    </main>
  )
}
