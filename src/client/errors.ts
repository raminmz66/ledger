import copy from './copy'

type Known = Exclude<keyof typeof copy.errors, 'network'>

export function errorMessage(res: { status: number; data: unknown }): string {
  if (res.status === 0) return copy.errors.network
  const code = typeof res.data === 'object' && res.data !== null ? (res.data as { error?: unknown }).error : undefined
  return typeof code === 'string' && code !== 'network' && Object.hasOwn(copy.errors, code)
    ? copy.errors[code as Known]
    : copy.errors.internal
}
