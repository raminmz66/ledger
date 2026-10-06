import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { emitNeedRefresh } from './pwa/update'

// Update is applied only when the user taps the banner, never mid-form.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() { emitNeedRefresh(() => { void updateSW(true) }) },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
