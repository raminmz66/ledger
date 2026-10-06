import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import copy from '../copy'

export default function Settings() {
  const { email, logout } = useAuth()
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)
  return (
    <main className="page">
      <Link to="/" className="icon-link">{copy.settings.back}</Link>
      <h1 className="auth-title">{copy.settings.title}</h1>
      <div className="settings-row">
        <span>{copy.settings.account}</span>
        <bdi dir="ltr">{email}</bdi>
      </div>
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
      <p className="tagline">{copy.settings.version}</p>
    </main>
  )
}
