import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { __resetInstallForTests, useInstall } from './useInstall'

function mockEnv({ ua = 'Mozilla/5.0 (X11; Linux x86_64)', standalone = false, platform = 'Linux', touch = 0 } = {}) {
  vi.stubGlobal('navigator', { userAgent: ua, platform, maxTouchPoints: touch, standalone: undefined })
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: standalone && q.includes('standalone'), addEventListener() {}, removeEventListener() {} }))
}
afterEach(() => { vi.unstubAllGlobals(); __resetInstallForTests() })

describe('useInstall', () => {
  it('offers nothing by default on desktop/Android before the browser fires beforeinstallprompt', () => {
    mockEnv()
    const { result } = renderHook(() => useInstall())
    expect(result.current).toMatchObject({ canPrompt: false, showIosHint: false })
  })

  it('becomes promptable after beforeinstallprompt, calls prompt() on request, and clears on appinstalled', async () => {
    mockEnv()
    const { result } = renderHook(() => useInstall())
    const prompt = vi.fn().mockResolvedValue(undefined)
    const evt = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) })
    act(() => { window.dispatchEvent(evt) })
    expect(evt.defaultPrevented).toBe(true)
    expect(result.current.canPrompt).toBe(true)
    await act(async () => { await result.current.promptInstall() })
    expect(prompt).toHaveBeenCalledTimes(1)
    act(() => { window.dispatchEvent(new Event('appinstalled')) })
    expect(result.current.canPrompt).toBe(false)
  })

  it('keeps an event that fired before the hook mounted', () => {
    mockEnv()
    const evt = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt: vi.fn().mockResolvedValue(undefined) })
    window.dispatchEvent(evt)
    expect(evt.defaultPrevented).toBe(true)
    expect(renderHook(() => useInstall()).result.current.canPrompt).toBe(true)
  })

  it('clears the stored event even when prompt() rejects, without throwing', async () => {
    mockEnv()
    const evt = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt: vi.fn().mockRejectedValue(new Error('x')) })
    window.dispatchEvent(evt)
    const { result } = renderHook(() => useInstall())
    await act(async () => { await result.current.promptInstall() })
    expect(result.current.canPrompt).toBe(false)
  })

  it('shows the manual hint on iPhone Safari in a normal tab', () => {
    mockEnv({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone' })
    const { result } = renderHook(() => useInstall())
    expect(result.current.showIosHint).toBe(true)
  })

  it('shows the hint on iPadOS that reports itself as a Mac with touch', () => {
    mockEnv({ ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', touch: 5 })
    expect(renderHook(() => useInstall()).result.current.showIosHint).toBe(true)
  })

  it('shows nothing once installed (standalone), even on iOS', () => {
    mockEnv({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone', standalone: true })
    const { result } = renderHook(() => useInstall())
    expect(result.current).toMatchObject({ canPrompt: false, showIosHint: false })
  })

  it('a real desktop Mac without touch gets no iOS hint', () => {
    mockEnv({ ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', touch: 0 })
    expect(renderHook(() => useInstall()).result.current.showIosHint).toBe(false)
  })
})
