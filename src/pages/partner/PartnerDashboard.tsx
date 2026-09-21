import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, BedDouble, Users, Clock, Bell } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export default function PartnerDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ totalPgs: 0, available: 0, occupied: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<{ id: string; message: string; created_at: string; read: boolean }[]>([])

  useEffect(() => {
    if (profile) loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function loadStats() {
    setLoading(true)
    const { data: partner } = await supabase.from('pg_partners').select('id').eq('profile_id', profile!.id).single()
    if (!partner) { setLoading(false); return }

    const { data: notificationData } = await supabase
      .from('notifications')
      .select('id, message, created_at, read')
      .order('created_at', { ascending: false })
      .limit(5)
    setNotifications(notificationData ?? [])

    const { data: pgs } = await supabase.from('pgs').select('id').eq('partner_id', partner.id)
    const pgIds = (pgs ?? []).map((p) => p.id)

    let available = 0, occupied = 0, pending = 0
    if (pgIds.length > 0) {
      const { data: rooms } = await supabase.from('rooms').select('id').in('pg_id', pgIds)
      const roomIds = (rooms ?? []).map((r) => r.id)
      if (roomIds.length > 0) {
        const { count: availCount } = await supabase.from('beds').select('id', { count: 'exact', head: true }).in('room_id', roomIds).eq('status', 'available')
        const { count: occCount } = await supabase.from('beds').select('id', { count: 'exact', head: true }).in('room_id', roomIds).eq('status', 'taken')
        available = availCount ?? 0
        occupied = occCount ?? 0
      }
      const { count: reqCount } = await supabase.from('bed_requests').select('id', { count: 'exact', head: true }).in('pg_id', pgIds).eq('status', 'pending')
      pending = reqCount ?? 0
    }

    setStats({ totalPgs: pgIds.length, available, occupied, pending })
    setLoading(false)
  }

  return (
    <div>
      <Navbar />
      <div className="container-page py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-ink-900">Partner Dashboard</h1>
          <Link to="/partner/pgs" className="btn-primary btn-sm">Manage My PGs</Link>
        </div>

        {loading ? (
          <p className="text-sm text-ink-400">Loading stats...</p>
        ) : (
          <div className="grid sm:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<Building2 size={18} />} label="Total PGs" value={stats.totalPgs} />
            <StatCard icon={<BedDouble size={18} />} label="Available Beds" value={stats.available} />
            <StatCard icon={<Users size={18} />} label="Occupied Beds" value={stats.occupied} />
            <StatCard icon={<Clock size={18} />} label="Pending Requests" value={stats.pending} link="/partner/requests" />
          </div>
        )}

        <div className="card p-5 mb-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2"><Bell size={18} className="text-brand-600" /><h2 className="font-semibold text-ink-900">Booking Requests</h2></div>
            <Link to="/partner/requests" className="text-sm text-brand-600 hover:underline">View all</Link>
          </div>
          {stats.pending > 0 ? <p className="text-sm text-ink-600">You have <strong>{stats.pending}</strong> pending booking request{stats.pending === 1 ? '' : 's'} waiting for your response.</p> : <p className="text-sm text-ink-500">No pending booking requests.</p>}
          {notifications.length > 0 && <div className="mt-3 space-y-2">{notifications.map((notification) => <div key={notification.id} className={`text-sm rounded-card px-3 py-2 ${notification.read ? 'bg-ink-50 text-ink-600' : 'bg-brand-50 text-ink-800'}`}>{notification.message}<span className="text-xs text-ink-400 ml-2">{new Date(notification.created_at).toLocaleString()}</span></div>)}</div>}
        </div>

        <div className="card p-5">
          <p className="text-sm text-ink-600">
            Manage your PG listings, update room and bed availability, and respond to student requests from the links above.
          </p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, link }: { icon: React.ReactNode; label: string; value: number; link?: string }) {
  const content = (
    <div className="card p-4">
      <div className="w-9 h-9 rounded-card bg-brand-50 text-brand-600 flex items-center justify-center mb-3">{icon}</div>
      <p className="text-2xl font-semibold text-ink-900">{value}</p>
      <p className="text-sm text-ink-500">{label}</p>
    </div>
  )
  return link ? <Link to={link}>{content}</Link> : content
}
