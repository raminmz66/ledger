import { Navigate, Outlet, useLocation } from 'react-router'
import copy from '../copy'
import { useAuth } from './AuthContext'

export default function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <p className="page-loading">{copy.loading}</p>
  if (status === 'anon') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}
