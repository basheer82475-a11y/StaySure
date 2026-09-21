import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BedDouble, Bell, Building2, Clock, Plus, Users } from 'lucide-react'
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
    <div className="min-h-full bg-[#fcfdfb]">
      <Navbar />
      <main className="container-page py-8 sm:py-10">
        <div className="relative overflow-hidden rounded-2xl bg-brand-900 px-6 py-7 shadow-[0_16px_38px_rgba(23,51,46,0.18)] sm:px-8 sm:py-9">
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-brand-300/20 blur-2xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-brand-200">Partner workspace</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.</h1>
              <p className="mt-2 max-w-xl text-sm text-brand-50/80">Keep your listings current, monitor beds, and respond to students from one place.</p>
            </div>
            <Link to="/partner/pgs/new" className="btn shrink-0 rounded-xl bg-white text-brand-800 hover:bg-brand-50"><Plus size={16} /> Add a PG</Link>
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-sm text-ink-400">Loading your workspace...</p>
        ) : (
          <div className="grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<Building2 size={18} />} label="Total PGs" value={stats.totalPgs} />
            <StatCard icon={<BedDouble size={18} />} label="Available Beds" value={stats.available} />
            <StatCard icon={<Users size={18} />} label="Occupied Beds" value={stats.occupied} />
            <StatCard icon={<Clock size={18} />} label="Pending Requests" value={stats.pending} link="/partner/requests" />
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-5">
          <section className="card border-brand-100 p-6 lg:col-span-3">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Bell size={18} /></span><div><h2 className="font-semibold text-ink-900">Booking requests</h2><p className="text-xs text-ink-500">Stay on top of student enquiries.</p></div></div>
              <Link to="/partner/requests" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-900">View all <ArrowRight size={15} /></Link>
            </div>
            {stats.pending > 0 ? <p className="text-sm text-ink-600">You have <strong>{stats.pending}</strong> pending booking request{stats.pending === 1 ? '' : 's'} waiting for your response.</p> : <p className="text-sm text-ink-500">No pending booking requests.</p>}
          {notifications.length > 0 && <div className="mt-4 space-y-2">{notifications.map((notification) => <div key={notification.id} className={`rounded-xl px-3.5 py-3 text-sm ${notification.read ? 'bg-ink-50 text-ink-600' : 'bg-brand-50 text-ink-800'}`}><p>{notification.message}</p><span className="mt-1 block text-xs text-ink-400">{new Date(notification.created_at).toLocaleString()}</span></div>)}</div>}
          </section>

          <aside className="rounded-2xl border border-brand-100 bg-brand-50/70 p-6 lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Quick action</p>
            <h2 className="mt-2 text-lg font-semibold text-ink-900">Keep availability accurate</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">Update rooms and beds whenever occupancy changes so students always see the latest options.</p>
            <Link to="/partner/pgs" className="btn-primary mt-5 rounded-xl">Manage my PGs <ArrowRight size={16} /></Link>
          </aside>
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value, link }: { icon: React.ReactNode; label: string; value: number; link?: string }) {
  const content = (
    <div className="card border-ink-100 p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(28,63,56,0.11)]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{icon}</div>
      <p className="text-3xl font-semibold tracking-tight text-ink-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-ink-600">{label}</p>
    </div>
  )
  return link ? <Link to={link}>{content}</Link> : content
}
