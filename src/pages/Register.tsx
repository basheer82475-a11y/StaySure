import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Building2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/context/AuthContext'
import { Role } from '@/types'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState<Role>('student')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function validate(): string | null {
    if (!fullName.trim()) return 'Please enter your full name.'
    if (!email.trim()) return 'Please enter your email.'
    if (!phone.trim()) return 'Please enter your phone number.'
    if (password.length < 6) return 'Password must be at least 6 characters.'
    if (password !== confirmPassword) return 'Passwords do not match.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setLoading(true)
    const { error } = await signUp({ fullName, email, phone, password, role })
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    setSuccess(true)
    setTimeout(() => navigate('/login'), 1500)
  }

  return (
    <div>
      <Navbar />
      <div className="container-page max-w-sm mx-auto py-16">
        <h1 className="text-2xl font-semibold text-ink-900 mb-1">Create account</h1>
        <p className="text-sm text-ink-500 mb-6">Join StaySure as a student or PG partner.</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <RoleButton
            active={role === 'student'}
            onClick={() => setRole('student')}
            icon={<GraduationCap size={18} />}
            label="Student"
          />
          <RoleButton
            active={role === 'partner'}
            onClick={() => setRole('partner')}
            icon={<Building2 size={18} />}
            label="PG Partner"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Phone number</label>
            <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-brand-600">Account created. Redirecting to login...</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-ink-500 mt-4 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}

function RoleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-card border py-4 text-sm font-medium transition-colors ${
        active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
