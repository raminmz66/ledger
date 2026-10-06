import { useCallback, useSyncExternalStore } from 'react'

type InstallEvent = Event & { prompt(): Promise<void> }

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const mq = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches
  return mq || (typeof navigator !== 'undefined' && (navigator as unknown as { standalone?: boolean }).standalone === true)
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/.test(navigator.userAgent ?? '') ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1)
}

// Chrome fires beforeinstallprompt once, early: capture at module scope, not in a mounted component.
let deferred: InstallEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallEvent; notify() })
  window.addEventListener('appinstalled', () => { deferred = null; notify() })
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export function __resetInstallForTests() { deferred = null; notify() }

export function useInstall(): { canPrompt: boolean; promptInstall(): Promise<void>; showIosHint: boolean } {
  const evt = useSyncExternalStore(subscribe, () => deferred, () => null)
  const promptInstall = useCallback(async () => {
    const e = deferred
    if (!e) return
    try {
      await e.prompt()
    } catch {
      // A rejected prompt() just means no install; the event is single-use either way.
    } finally {
      deferred = null
      notify()
    }
  }, [])
  const standalone = isStandalone()
  return { canPrompt: evt !== null && !standalone, promptInstall, showIosHint: !standalone && isIos() }
}
