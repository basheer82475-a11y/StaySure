import { useEffect, useState } from 'react'
import { Users, Building2, Home, Clock, ListChecks } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, partners: 0, pgs: 0, pendingPgs: 0, requests: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ count: students }, { count: partners }, { count: pgs }, { count: pendingPgs }, { count: requests }] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'partner'),
      supabase.from('pgs').select('id', { count: 'exact', head: true }),
      supabase.from('pgs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bed_requests').select('id', { count: 'exact', head: true }),
    ])
    setStats({
      students: students ?? 0,
      partners: partners ?? 0,
      pgs: pgs ?? 0,
      pendingPgs: pendingPgs ?? 0,
      requests: requests ?? 0,
    })
    setLoading(false)
  }

  return (
    <div>
      <Navbar />
      <div className="container-page py-8">
        <h1 className="text-2xl font-semibold text-ink-900 mb-6">Admin Dashboard</h1>

        {loading ? (
          <p className="text-sm text-ink-400">Loading stats...</p>
        ) : (
          <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard icon={<Users size={18} />} label="Total Students" value={stats.students} />
            <StatCard icon={<Building2 size={18} />} label="Total PG Partners" value={stats.partners} />
            <StatCard icon={<Home size={18} />} label="Total PGs" value={stats.pgs} />
            <StatCard icon={<Clock size={18} />} label="Pending Approvals" value={stats.pendingPgs} />
            <StatCard icon={<ListChecks size={18} />} label="Total Requests" value={stats.requests} />
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="w-9 h-9 rounded-card bg-brand-50 text-brand-600 flex items-center justify-center mb-3">{icon}</div>
      <p className="text-2xl font-semibold text-ink-900">{value}</p>
      <p className="text-sm text-ink-500">{label}</p>
    </div>
  )
}
