import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import copy from './copy'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import { ToastProvider } from './components/Toast'
import Home from './routes/Home'
import Login from './routes/Login'
import Settings from './routes/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-shell">
          <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home />} />
              <Route path="/people/:id" element={<p>{copy.loading}</p>} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ToastProvider>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
