import { Navigate, Outlet } from 'react-router'
import copy from '../copy'
import { useAuth } from './AuthContext'

export default function ProtectedRoute() {
  const { status } = useAuth()
  if (status === 'loading') return <p className="page-loading">{copy.loading}</p>
  if (status === 'anon') return <Navigate to="/login" replace />
  return <Outlet />
}
