// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loginEmail, sendLoginCode } from './mail'

const env = { RESEND_API_KEY: 're_test', EMAIL_FROM: 'سیمرغ <onboarding@resend.dev>' }

afterEach(() => vi.restoreAllMocks())

describe('loginEmail', () => {
  it('puts the Latin-digit code in the subject, html and text; html is RTL', () => {
    const m = loginEmail('481209')
    expect(m.subject).toBe('کد ورود به سیمرغ: 481209')
    expect(m.html).toContain('481209')
    expect(m.html).toContain('dir="rtl"')
    expect(m.text).toContain('481209')
  })
  it('follows Persian orthography: no Arabic ي/ك, no em dash', () => {
    const m = loginEmail('123456')
    for (const s of [m.subject, m.html, m.text]) expect(s).not.toMatch(/[يك—]/)
  })
})

describe('sendLoginCode', () => {
  it('POSTs to Resend with bearer auth and the message', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"id":"x"}', { status: 200 }))
    await sendLoginCode(env, 'a@b.co', '481209')
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.resend.com/emails')
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer re_test')
    const body = JSON.parse(init!.body as string)
    expect(body.to).toEqual(['a@b.co'])
    expect(body.from).toBe(env.EMAIL_FROM)
    expect(body.subject).toContain('481209')
    expect(body.html).toContain('481209')
    expect(body.text).toContain('481209')
  })

  it('throws email_failed on a non-2xx response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 403 }))
    await expect(sendLoginCode(env, 'a@b.co', '1')).rejects.toThrow('email_failed')
  })

  it('throws email_failed when the network fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network'))
    await expect(sendLoginCode(env, 'a@b.co', '1')).rejects.toThrow('email_failed')
  })

  it('logs instead of sending in dev mode', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await sendLoginCode({ ...env, EMAIL_DEV_LOG: '1' }, 'a@b.co', '481209')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith('[dev] login code for a@b.co: 481209')
  })
})
