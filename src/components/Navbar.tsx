import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Home, Menu, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

type NavItem = { label: string; to: string }

const publicLinks: NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Find PG', to: '/find-pg' },
  { label: 'How it works', to: '/#how-it-works' },
]

const adminLinks: NavItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard' },
  { label: 'PG Management', to: '/admin/pgs' },
  { label: 'Bed Requests', to: '/admin/requests' },
  { label: 'Users', to: '/admin/users' },
]

export default function Navbar() {
  const { session, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const links = profile?.role === 'admin' ? adminLinks : publicLinks
  const dashboardPath = profile?.role === 'admin' ? '/admin/dashboard' : profile?.role === 'partner' ? '/partner/dashboard' : '/student/dashboard'
  const closeMenu = () => setIsOpen(false)

  async function handleLogout() {
    await signOut()
    closeMenu()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-brand-100/80 bg-white/95 shadow-[0_1px_0_rgba(23,51,46,0.03)] backdrop-blur-xl">
      <div className="container-page flex h-[76px] items-center justify-between gap-4">
        <Link to="/" onClick={closeMenu} className="group flex shrink-0 items-center gap-2.5 text-lg font-semibold tracking-tight text-ink-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-[0_6px_16px_rgba(41,100,87,0.28)] transition-transform duration-200 group-hover:-rotate-3 group-hover:scale-105">
            <Home size={19} strokeWidth={2.3} />
          </span>
          <span>Stay<span className="text-brand-600">Sure</span></span>
        </Link>

        <nav className="hidden items-center rounded-full border border-brand-100 bg-brand-50/55 p-1 text-sm font-medium md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={closeMenu}
              className={({ isActive }) => `rounded-full px-3.5 py-2 transition-colors ${isActive && link.to !== '/#how-it-works' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-600 hover:bg-white/80 hover:text-brand-700'}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2.5 md:flex">
          {session && profile ? (
            <>
              <Link to={dashboardPath} className="max-w-28 truncate text-sm font-semibold text-ink-700 transition-colors hover:text-brand-700">
                Hi, {profile.full_name.split(' ')[0]}
              </Link>
              <button onClick={handleLogout} className="btn-secondary btn-sm rounded-lg">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary btn-sm rounded-lg">Login</Link>
              <Link to="/register" className="btn-primary btn-sm rounded-lg shadow-sm">Get started</Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-100 text-brand-800 transition-colors hover:bg-brand-50 md:hidden"
          onClick={() => setIsOpen((open) => !open)}
          aria-label="Toggle navigation"
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={20} /> : <Menu size={21} />}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-brand-100 bg-white px-4 py-4 shadow-lg md:hidden">
          <nav className="container-page flex flex-col gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={closeMenu}
                className={({ isActive }) => `rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${isActive && link.to !== '/#how-it-works' ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-brand-50 hover:text-brand-700'}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="container-page mt-4 flex gap-2 border-t border-ink-100 pt-4">
            {session && profile ? (
              <>
                <Link to={dashboardPath} onClick={closeMenu} className="btn-secondary flex-1 rounded-lg">Dashboard</Link>
                <button onClick={handleLogout} className="btn-primary flex-1 rounded-lg">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={closeMenu} className="btn-secondary flex-1 rounded-lg">Login</Link>
                <Link to="/register" onClick={closeMenu} className="btn-primary flex-1 rounded-lg">Get started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
