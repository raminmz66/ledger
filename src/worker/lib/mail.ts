import type { Env } from '../env'

type MailEnv = Pick<Env, 'RESEND_API_KEY' | 'EMAIL_FROM' | 'EMAIL_DEV_LOG'>

export function loginEmail(code: string): { subject: string; html: string; text: string } {
  const subject = `کد ورود به سیمرغ: ${code}`
  const intro = 'کد ورود شما به دفتر حساب سیمرغ'
  const note = 'این کد ۱۰ دقیقه اعتبار دارد. اگر شما درخواست ورود نکرده‌اید، این ایمیل را نادیده بگیرید.'
  const text = `${intro}:\n\n${code}\n\n${note}\n`
  const html = `<!doctype html>
<html lang="fa" dir="rtl"><body dir="rtl" style="margin:0;padding:24px;background:#f4efe6;font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;color:#3d3428">
<table dir="rtl" role="presentation" width="100%" style="max-width:420px;margin:0 auto"><tr><td dir="rtl" style="padding:0;text-align:right;direction:rtl">
<p dir="rtl" style="margin:0 0 16px;font-size:16px;line-height:1.9;text-align:right">${intro}:</p>
<p dir="ltr" style="margin:0 0 16px;font-size:34px;font-weight:bold;letter-spacing:6px;text-align:center;color:#0f6b6b">${code}</p>
<p dir="rtl" style="margin:0;font-size:14px;line-height:1.9;color:#6a5f50;text-align:right">${note}</p>
</td></tr></table></body></html>`
  return { subject, html, text }
}

export async function sendLoginCode(env: MailEnv, email: string, code: string): Promise<void> {
  if (env.EMAIL_DEV_LOG === '1') {
    console.log(`[dev] login code for ${email}: ${code}`)
    return
  }
  const { subject, html, text } = loginEmail(code)
  let res: Response
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [email], subject, html, text }),
    })
  } catch {
    throw new Error('email_failed')
  }
  if (!res.ok) throw new Error('email_failed')
}
