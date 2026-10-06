import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import Home from './routes/Home'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          {/* ponytail: real routes arrive in M2–M4; unknown paths go home. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
