import { useEffect, useState } from 'react'
import copy from '../copy'
import { subscribeNeedRefresh } from './update'

export function UpdateBanner() {
  // Functions in state need the wrapper form to avoid being called as updaters.
  const [apply, setApply] = useState<(() => void) | null>(null)
  const [applied, setApplied] = useState(false)
  useEffect(() => subscribeNeedRefresh((fn) => setApply(() => fn)), [])
  if (!apply) return null
  return (
    <div className="update-banner" role="status">
      <span>{copy.update.ready}</span>
      <button
        className="btn btn--ghost update-banner__btn"
        type="button"
        disabled={applied}
        onClick={() => { setApplied(true); apply() }}
      >
        {copy.update.apply}
      </button>
    </div>
  )
}
