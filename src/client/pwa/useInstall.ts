import { useCallback, useEffect, useRef, useState } from 'react'

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

export function useInstall(): { canPrompt: boolean; promptInstall(): Promise<void>; showIosHint: boolean } {
  const evtRef = useRef<InstallEvent | null>(null)
  const [canPrompt, setCanPrompt] = useState(false)
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      evtRef.current = e as InstallEvent
      setCanPrompt(true)
    }
    const onInstalled = () => { evtRef.current = null; setCanPrompt(false) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])
  const promptInstall = useCallback(async () => {
    const e = evtRef.current
    if (!e) return
    await e.prompt()
    // The event is single-use.
    evtRef.current = null
    setCanPrompt(false)
  }, [])
  const standalone = isStandalone()
  return { canPrompt: canPrompt && !standalone, promptInstall, showIosHint: !standalone && isIos() }
}
