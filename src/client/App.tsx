import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import { ToastProvider } from './components/Toast'
import { UpdateBanner } from './pwa/UpdateBanner'
import Home from './routes/Home'
import Person from './routes/Person'
import Login from './routes/Login'
import Settings from './routes/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-shell">
          <ToastProvider>
          <UpdateBanner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home />} />
              <Route path="/people/:id" element={<Person />} />
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
