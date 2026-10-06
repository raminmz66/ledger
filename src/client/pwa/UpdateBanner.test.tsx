import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import copy from '../copy'
import { __resetForTests, emitNeedRefresh } from './update'
import { UpdateBanner } from './UpdateBanner'

beforeEach(() => __resetForTests())

describe('UpdateBanner', () => {
  it('shows nothing until a new version is waiting, then applies it only on tap', async () => {
    const apply = vi.fn()
    render(<UpdateBanner />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    act(() => emitNeedRefresh(apply))
    expect(screen.getByRole('status')).toHaveTextContent(copy.update.ready)
    expect(apply).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: copy.update.apply }))
    expect(apply).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: copy.update.apply })).toBeDisabled()
  })

  it('a banner mounted after the event still shows the pending update', () => {
    act(() => emitNeedRefresh(() => {}))
    render(<UpdateBanner />)
    expect(screen.getByRole('status')).toHaveTextContent(copy.update.ready)
  })
})
