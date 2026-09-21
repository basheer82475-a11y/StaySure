import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const { signIn, session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    // Role-based redirect happens via ProtectedRoute; send to a neutral landing
    // point that then routes based on the freshly loaded profile.
    const dest = (location.state as { from?: string })?.from
    navigate(dest || '/post-login', { replace: true })
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email above first, then click "Forgot password".')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (!error) setResetSent(true)
  }

  useEffect(() => {
    if (session) navigate('/post-login', { replace: true })
  }, [session, navigate])

  return (
    <div>
      <Navbar />
      <div className="container-page max-w-sm mx-auto py-16">
        <h1 className="text-2xl font-semibold text-ink-900 mb-1">Log in</h1>
        <p className="text-sm text-ink-500 mb-6">Welcome back to StaySure.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {resetSent && <p className="text-sm text-brand-600">Password reset email sent, check your inbox.</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="flex items-center justify-between mt-4 text-sm">
          <button onClick={handleForgotPassword} className="text-brand-600 hover:underline">
            Forgot password
          </button>
          <Link to="/register" className="text-ink-500 hover:text-ink-900">
            Create account
          </Link>
        </div>
      </div>
    </div>
  )
}
