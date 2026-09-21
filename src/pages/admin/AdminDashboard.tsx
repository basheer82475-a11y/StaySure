import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Building2, CheckCircle2, Clock, Home, ListChecks, Users, XCircle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import StatusBadge from '@/components/StatusBadge'
import { supabase } from '@/lib/supabase'
import { Pg, Profile } from '@/types'

type PgRequest = Pg & { pg_images: { id: string; url: string }[]; partner: { profile: Pick<Profile, 'full_name' | 'email' | 'phone'> } }

type DashboardStats = { students: number; partners: number; pgs: number; approvedPgs: number; pendingPgs: number; rejectedPgs: number; requests: number }
const emptyStats: DashboardStats = { students: 0, partners: 0, pgs: 0, approvedPgs: 0, pendingPgs: 0, rejectedPgs: 0, requests: 0 }

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats)
  const [recentUsers, setRecentUsers] = useState<Profile[]>([])
  const [recentPgs, setRecentPgs] = useState<Pg[]>([])
  const [requests, setRequests] = useState<PgRequest[]>([])
  const [actingId, setActingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [students, partners, pgs, approvedPgs, pendingPgs, rejectedPgs, requestCount, usersResult, pgsResult, requestsResult] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'partner'),
      supabase.from('pgs').select('id', { count: 'exact', head: true }),
      supabase.from('pgs').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('pgs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('pgs').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
      supabase.from('bed_requests').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('pgs').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('pgs').select('*, pg_images(id, url), partner:pg_partners(profile:profiles(full_name, email, phone))').eq('status', 'pending').order('created_at', { ascending: false }),
    ])
    setStats({ students: students.count ?? 0, partners: partners.count ?? 0, pgs: pgs.count ?? 0, approvedPgs: approvedPgs.count ?? 0, pendingPgs: pendingPgs.count ?? 0, rejectedPgs: rejectedPgs.count ?? 0, requests: requestCount.count ?? 0 })
    setRecentUsers((usersResult.data ?? []) as Profile[])
    setRecentPgs((pgsResult.data ?? []) as Pg[])
    setRequests((requestsResult.data ?? []) as unknown as PgRequest[])
    setLoading(false)
  }

  async function reviewRequest(pgId: string, status: 'approved' | 'rejected') {
    setActingId(pgId)
    const { error } = await supabase.from('pgs').update({ status }).eq('id', pgId)
    if (error) alert('Could not update this PG request. Please try again.')
    setActingId(null)
    load()
  }

  return <div>
    <Navbar />
    <main className="container-page py-8 sm:py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div><p className="text-sm font-medium text-brand-600">Administration</p><h1 className="text-3xl font-semibold tracking-tight text-ink-900">Dashboard overview</h1><p className="text-sm text-ink-500 mt-1">Accounts, PG listings, and booking activity at a glance.</p></div>
        <Link to="/admin/users" className="btn-secondary btn-sm w-fit">Manage users <ArrowRight size={15} /></Link>
      </div>

      {loading ? <p className="text-sm text-ink-400">Loading dashboard data...</p> : <>
        <section className="grid gap-4 sm:grid-cols-3 mb-8" aria-label="Account and listing totals">
          <SummaryCard icon={<Users size={20} />} label="Registered students" value={stats.students} detail="Student accounts" tone="brand" />
          <SummaryCard icon={<Building2 size={20} />} label="PG partners" value={stats.partners} detail="Partner accounts" tone="violet" />
          <SummaryCard icon={<Home size={20} />} label="PG listings" value={stats.pgs} detail={`${stats.approvedPgs} visible to students`} tone="emerald" />
        </section>

        <section className="card overflow-hidden mb-8">
          <div className="p-5 border-b border-ink-100"><h2 className="font-semibold text-ink-900">PG requests awaiting review</h2><p className="text-xs text-ink-500 mt-1">Approve to publish a PG for students, or reject it.</p></div>
          {requests.length ? <div className="divide-y divide-ink-100">{requests.map((pg) => <div key={pg.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"><div className="flex gap-4 min-w-0">{pg.pg_images?.[0] ? <img src={pg.pg_images[0].url} alt={pg.name} className="w-20 h-20 rounded-card object-cover shrink-0" /> : <div className="w-20 h-20 rounded-card bg-ink-50 text-xs text-ink-400 flex items-center justify-center shrink-0">No photo</div>}<div className="min-w-0"><p className="font-medium text-ink-900">{pg.name}</p><p className="text-sm text-ink-500 mt-1">{pg.full_address || pg.location}{pg.pincode ? ` - ${pg.pincode}` : ''}</p><p className="text-xs text-ink-500 mt-1">Owner: {pg.partner?.profile?.full_name ?? 'Unknown'}{pg.partner?.profile?.phone ? ` · ${pg.partner.profile.phone}` : ''}</p><p className="text-xs text-ink-400">{pg.partner?.profile?.email}</p></div></div><div className="flex gap-2 shrink-0"><button onClick={() => reviewRequest(pg.id, 'approved')} disabled={actingId === pg.id} className="btn-primary btn-sm">Approve</button><button onClick={() => reviewRequest(pg.id, 'rejected')} disabled={actingId === pg.id} className="btn-danger btn-sm">Reject</button></div></div>)}</div> : <p className="p-5 text-sm text-ink-400">No PG requests are waiting for approval.</p>}
        </section>

        <section className="grid gap-5 lg:grid-cols-5 mb-8">
          <div className="card p-5 lg:col-span-2"><div className="flex items-center justify-between mb-5"><div><h2 className="font-semibold text-ink-900">Listing status</h2><p className="text-xs text-ink-500 mt-1">All PGs in the system</p></div><Link to="/admin/pgs" className="text-sm text-brand-600 hover:underline">View PGs</Link></div><div className="space-y-3"><BreakdownRow icon={<CheckCircle2 size={16} />} label="Published" value={stats.approvedPgs} className="text-emerald-600" /><BreakdownRow icon={<Clock size={16} />} label="Pending" value={stats.pendingPgs} className="text-amber-600" /><BreakdownRow icon={<XCircle size={16} />} label="Rejected" value={stats.rejectedPgs} className="text-red-600" /></div></div>
          <div className="card p-5 lg:col-span-3"><div className="flex items-center justify-between mb-5"><div><h2 className="font-semibold text-ink-900">Recent PG listings</h2><p className="text-xs text-ink-500 mt-1">Latest five listings added by partners</p></div><ListChecks size={20} className="text-brand-500" /></div>{recentPgs.length ? <div className="divide-y divide-ink-100">{recentPgs.map((pg) => <div key={pg.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-medium text-sm text-ink-900 truncate">{pg.name}</p><p className="text-xs text-ink-500 truncate">{pg.location}</p></div><StatusBadge status={pg.status} /></div>)}</div> : <EmptyState label="No PG listings yet." />}</div>
        </section>

        <section className="card overflow-hidden"><div className="p-5 flex items-center justify-between border-b border-ink-100"><div><h2 className="font-semibold text-ink-900">Recent registrations</h2><p className="text-xs text-ink-500 mt-1">Students and partners who most recently created accounts</p></div><Link to="/admin/users" className="text-sm text-brand-600 hover:underline">See all users</Link></div>{recentUsers.length ? <div className="divide-y divide-ink-100">{recentUsers.map((user) => <div key={user.id} className="px-5 py-3 flex items-center justify-between gap-4"><div className="min-w-0"><p className="font-medium text-sm text-ink-900 truncate">{user.full_name}</p><p className="text-xs text-ink-500 truncate">{user.email}</p></div><div className="flex items-center gap-2 shrink-0"><span className="badge-gray capitalize">{user.role}</span><span className={user.status === 'active' ? 'badge-green' : 'badge-red'}>{user.status}</span></div></div>)}</div> : <div className="p-5"><EmptyState label="No registered users yet." /></div>}</section>
      </>}
    </main>
  </div>
}

function SummaryCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: number; detail: string; tone: 'brand' | 'violet' | 'emerald' }) {
  const tones = { brand: 'bg-brand-50 text-brand-600', violet: 'bg-violet-50 text-violet-600', emerald: 'bg-emerald-50 text-emerald-600' }
  return <div className="card p-5"><div className={`w-10 h-10 rounded-card flex items-center justify-center mb-5 ${tones[tone]}`}>{icon}</div><p className="text-3xl font-semibold text-ink-900">{value}</p><p className="font-medium text-sm text-ink-800 mt-1">{label}</p><p className="text-xs text-ink-500 mt-1">{detail}</p></div>
}

function BreakdownRow({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: number; className: string }) {
  return <div className="flex items-center justify-between rounded-card bg-ink-50 px-3 py-2.5"><span className={`flex items-center gap-2 text-sm font-medium ${className}`}>{icon}{label}</span><span className="font-semibold text-ink-900">{value}</span></div>
}

function EmptyState({ label }: { label: string }) { return <p className="text-sm text-ink-400 text-center py-4">{label}</p> }
