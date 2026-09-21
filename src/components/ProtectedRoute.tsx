import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Role } from '@/types'

export default function ProtectedRoute({
  children,
  allow,
}: {
  children: ReactNode
  allow: Role[]
}) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink-400 text-sm">Loading...</p>
      </div>
    )
  }

  if (!session || !profile) return <Navigate to="/login" replace />

  if (profile.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-ink-500 text-sm text-center">
          Your account has been suspended. Contact StaySure support for help.
        </p>
      </div>
    )
  }

  if (!allow.includes(profile.role)) {
    const home =
      profile.role === 'admin' ? '/admin/dashboard' : profile.role === 'partner' ? '/partner/dashboard' : '/find-pg'
    return <Navigate to={home} replace />
  }

  return <>{children}</>
}
