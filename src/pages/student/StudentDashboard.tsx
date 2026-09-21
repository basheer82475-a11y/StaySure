import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import StatusBadge from '@/components/StatusBadge'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { BedRequestWithDetails } from '@/types'

export default function StudentDashboard() {
  const { profile, refreshProfile } = useAuth()
  const [requests, setRequests] = useState<BedRequestWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'requests' | 'profile'>('requests')

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    setLoading(true)
    const { data } = await supabase
      .from('bed_requests')
      .select('*, pg:pgs(id, name, area), room:rooms(id, room_number, sharing_type, ac), bed:beds(id, bed_label)')
      .order('created_at', { ascending: false })
    setRequests((data ?? []) as unknown as BedRequestWithDetails[])
    setLoading(false)
  }

  return (
    <div>
      <Navbar />
      <div className="container-page py-8 max-w-3xl">
        <h1 className="text-2xl font-semibold text-ink-900 mb-6">My Dashboard</h1>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('requests')} className={`btn-sm ${tab === 'requests' ? 'btn-primary' : 'btn-secondary'}`}>My Requests</button>
          <button onClick={() => setTab('profile')} className={`btn-sm ${tab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}>My Profile</button>
        </div>

        {tab === 'requests' && (
          <div>
            {loading && <p className="text-sm text-ink-400">Loading requests...</p>}
            {!loading && requests.length === 0 && (
              <div className="card p-10 text-center">
                <p className="text-ink-500 text-sm mb-3">You haven't requested a bed yet.</p>
                <Link to="/find-pg" className="btn-primary btn-sm">Find a PG</Link>
              </div>
            )}
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="card p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink-900">{r.pg.name}</p>
                    <p className="text-sm text-ink-500">
                      {r.pg.area} · Room {r.room.room_number} · {r.room.sharing_type} Sharing · {r.room.ac ? 'AC' : 'Non-AC'} · {r.bed.bed_label}
                    </p>
                    <p className="text-xs text-ink-400 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'profile' && profile && <ProfileForm profile={profile} onSaved={refreshProfile} />}
      </div>
    </div>
  )
}

function ProfileForm({ profile, onSaved }: { profile: { id: string; full_name: string; email: string; phone: string | null }; onSaved: () => void }) {
  const [fullName, setFullName] = useState(profile.full_name)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    const { error } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', profile.id)
    setSaving(false)
    if (error) {
      setError('Could not update your profile. Please try again.')
      return
    }
    setSaved(true)
    onSaved()
  }

  return (
    <form onSubmit={handleSave} className="card p-5 max-w-md space-y-4">
      <div>
        <label className="label">Name</label>
        <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input bg-ink-50" value={profile.email} disabled />
      </div>
      <div>
        <label className="label">Phone</label>
        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-brand-600">Profile updated.</p>}
      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? 'Saving...' : 'Save changes'}
      </button>
    </form>
  )
}
