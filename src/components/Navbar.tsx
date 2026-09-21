import { Link, useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
  const { session, profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/')
  }

  const dashboardPath =
    profile?.role === 'admin' ? '/admin/dashboard' : profile?.role === 'partner' ? '/partner/dashboard' : '/student/dashboard'

  return (
    <header className="border-b border-ink-100 bg-white sticky top-0 z-30">
      <div className="container-page h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold text-ink-900 text-lg">
          <span className="w-8 h-8 rounded-card bg-brand-500 text-white flex items-center justify-center">
            <Home size={18} />
          </span>
          StaySure
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-ink-600">
          {profile?.role === 'admin' ? (
            <Link to="/admin/dashboard" className="hover:text-ink-900">Dashboard</Link>
          ) : (
            <>
              <Link to="/" className="hover:text-ink-900">Home</Link>
              <Link to="/find-pg" className="hover:text-ink-900">Find PG</Link>
              <a href="/#how-it-works" className="hover:text-ink-900">How It Works</a>
              <a href="/#about" className="hover:text-ink-900">About</a>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {session && profile ? (
            <>
              <Link to={dashboardPath} className="text-sm text-ink-700 hover:text-ink-900 hidden sm:block">
                {profile.full_name.split(' ')[0]}
              </Link>
              <button onClick={handleLogout} className="btn-secondary btn-sm">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary btn-sm">Login</Link>
              <Link to="/register" className="btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
