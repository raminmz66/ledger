import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import OtpInput from '../components/OtpInput'
import copy from '../copy'
import { toFaDigits } from '../format/digits'

const t = copy.signIn
type Err = { email?: string; error?: string; retryAfter?: number; attemptsLeft?: number }

export default function Login() {
  const { status, setAuthed } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [canResend, setCanResend] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (seconds <= 0) return
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [seconds > 0])

  if (status === 'authed') return <Navigate to="/" replace />

  async function sendCode(e?: FormEvent) {
    e?.preventDefault()
    setBusy(true)
    setError('')
    const r = await api<Err>('POST', '/api/auth/request-code', { email: email.trim() })
    setBusy(false)
    if (r.ok) {
      setStep('code')
      setSeconds(60)
      setCanResend(false)
      setResetKey((k) => k + 1)
    } else if (r.status === 0) setError(t.errNetwork)
    else if (r.status === 429) {
      const wait = r.data?.retryAfter ?? 60
      setError(wait <= 60 ? t.errWaitSeconds : t.errRateLimited)
      if (step === 'code') { setSeconds(Math.min(wait, 60)); setCanResend(false) }
    } else if (r.data?.error === 'invalid_email') setError(t.errInvalidEmail)
    else if (r.data?.error === 'email_failed') setError(t.errEmailFailed)
    else setError(t.errGeneric)
  }

  async function verify(value: string) {
    setBusy(true)
    setError('')
    const r = await api<Err>('POST', '/api/auth/verify', { email: email.trim(), code: value })
    setBusy(false)
    if (r.ok) {
      setAuthed(r.data?.email ?? email.trim())
      navigate('/', { replace: true })
      return
    }
    setResetKey((k) => k + 1)
    const d = r.data
    if (r.status === 0) setError(t.errNetwork)
    else if (r.status === 429) setError(t.errRateLimited)
    else if (d?.error === 'code_expired') { setError(t.errCodeExpired); setCanResend(true) }
    else if (d?.error === 'invalid_code') setError(t.errInvalidCode)
    else if (d?.error === 'wrong_code') {
      const left = d.attemptsLeft ?? 0
      setError(left === 0
        ? `${t.errWrongCode} ${t.errCodeExpired}`
        : `${t.errWrongCode} ${t.errAttemptsLeft} ${toFaDigits(left)}`)
      if (left === 0) setCanResend(true)
    } else setError(t.errGeneric)
  }

  return (
    <main className="page">
      <h1 className="wordmark">{t.title}</h1>
      {step === 'email' ? (
        <form className="auth-card" onSubmit={sendCode} noValidate>
          <label className="field">
            <span>{t.emailLabel}</span>
            <input
              type="email"
              dir="ltr"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>{busy ? t.sending : t.sendCode}</button>
          <p className="tagline">{t.firstTimeNote}</p>
        </form>
      ) : (
        <div className="auth-card">
          <p className="auth-title">{t.codeTitle}</p>
          <p className="tagline">{t.codeSentTo} <bdi>{email}</bdi></p>
          <OtpInput disabled={busy} onChange={setTyped} onComplete={verify} resetKey={resetKey} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn" type="button" disabled={busy || typed.length < 6} onClick={() => verify(typed)}>
            {busy ? t.verifying : t.verify}
          </button>
          {seconds > 0 && !canResend ? (
            <p className="tagline">{t.resendIn} {toFaDigits(seconds)} {t.resendSeconds}</p>
          ) : (
            <button className="btn btn--ghost" type="button" disabled={busy} onClick={() => sendCode()}>{t.resend}</button>
          )}
          <button className="btn btn--ghost" type="button" onClick={() => { setStep('email'); setError('') }}>
            {t.changeEmail}
          </button>
        </div>
      )}
    </main>
  )
}
