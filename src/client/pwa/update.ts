type Apply = () => void
let pending: Apply | null = null
const listeners = new Set<(apply: Apply) => void>()

export function emitNeedRefresh(apply: Apply): void {
  pending = apply
  listeners.forEach((l) => l(apply))
}

export function subscribeNeedRefresh(listener: (apply: Apply) => void): () => void {
  listeners.add(listener)
  if (pending) listener(pending)
  return () => { listeners.delete(listener) }
}

/** Test helper: forget any pending update. */
export function __resetForTests(): void {
  pending = null
  listeners.clear()
}
