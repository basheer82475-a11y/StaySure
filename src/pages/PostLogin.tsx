import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function PostLogin() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!profile) {
      navigate('/login', { replace: true })
      return
    }
    if (profile.role === 'admin') navigate('/admin/dashboard', { replace: true })
    else if (profile.role === 'partner') navigate('/partner/dashboard', { replace: true })
    else navigate('/find-pg', { replace: true })
  }, [profile, loading, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-ink-400 text-sm">Taking you to your dashboard...</p>
    </div>
  )
}
