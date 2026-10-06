import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import copy from '../copy'

export default function Settings() {
  const { email, logout } = useAuth()
  const navigate = useNavigate()
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
        onClick={async () => { await logout(); navigate('/login', { replace: true }) }}
      >
        {copy.settings.logout}
      </button>
      <p className="tagline">{copy.settings.version}</p>
    </main>
  )
}
