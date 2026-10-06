import copy from './copy'

type Known = Exclude<keyof typeof copy.errors, 'network'>

const KNOWN = new Set<string>(['invalid_name', 'invalid_amount', 'invalid_date', 'invalid_note', 'invalid_direction', 'invalid_body', 'not_found', 'internal'])

export function errorMessage(res: { status: number; data: { error?: string } | null }): string {
  if (res.status === 0) return copy.errors.network
  const code = res.data?.error
  return code && KNOWN.has(code) ? copy.errors[code as Known] : copy.errors.internal
}
