import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import StatusBadge from '@/components/StatusBadge'
import { supabase } from '@/lib/supabase'
import { Pg, PgPartner, Profile } from '@/types'

type PgRow = Pg & { pg_images: { id: string; url: string; sort_order: number }[]; partner: { business_name: string | null; profile: Pick<Profile, 'full_name' | 'email' | 'phone'> } }
type PartnerRow = PgPartner & { profile: Pick<Profile, 'full_name' | 'email' | 'status'> }

export default function AdminPGs() {
  const [tab, setTab] = useState<'requests' | 'listings' | 'partners'>('requests')
  const [pgs, setPgs] = useState<PgRow[]>([])
  const [partners, setPartners] = useState<PartnerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  useEffect(() => { load() }, [tab])

  async function load() {
    setLoading(true)
    if (tab === 'partners') {
      const { data } = await supabase.from('pg_partners').select('*, profile:profiles(full_name, email, status)').order('created_at', { ascending: false })
      setPartners((data ?? []) as unknown as PartnerRow[])
    } else {
      const { data } = await supabase.from('pgs').select('*, pg_images(id, url, sort_order), partner:pg_partners(business_name, profile:profiles(full_name, email, phone))').eq('status', tab === 'requests' ? 'pending' : 'approved').order('created_at', { ascending: false })
      setPgs((data ?? []) as unknown as PgRow[])
    }
    setLoading(false)
  }

  async function setPgStatus(pgId: string, status: 'approved' | 'rejected') {
    setActingId(pgId)
    const { error } = await supabase.from('pgs').update({ status }).eq('id', pgId)
    if (error) alert('Could not update this PG request. Please try again.')
    setActingId(null)
    load()
  }

  async function toggleVerified(partner: PartnerRow) {
    setActingId(partner.id)
    await supabase.from('pg_partners').update({ verified: !partner.verified }).eq('id', partner.id)
    setActingId(null)
    load()
  }

  return <div><Navbar /><main className="container-page py-8"><h1 className="text-2xl font-semibold text-ink-900 mb-1">PG management</h1><p className="text-sm text-ink-500 mb-6">Review partner submissions and manage published PGs.</p>
    <div className="flex flex-wrap gap-2 mb-6"><button onClick={() => setTab('requests')} className={`btn-sm ${tab === 'requests' ? 'btn-primary' : 'btn-secondary'}`}>PG Requests</button><button onClick={() => setTab('listings')} className={`btn-sm ${tab === 'listings' ? 'btn-primary' : 'btn-secondary'}`}>Published PGs</button><button onClick={() => setTab('partners')} className={`btn-sm ${tab === 'partners' ? 'btn-primary' : 'btn-secondary'}`}>PG Partners</button></div>
    {loading && <p className="text-sm text-ink-400">Loading...</p>}
    {(tab === 'requests' || tab === 'listings') && !loading && <div className="space-y-3">{pgs.map((pg) => <article key={pg.id} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div className="flex gap-4 min-w-0">{pg.pg_images?.[0] ? <img src={pg.pg_images[0].url} alt={pg.name} className="w-20 h-20 rounded-card object-cover border border-ink-100 shrink-0" /> : <div className="w-20 h-20 rounded-card bg-ink-50 text-ink-400 text-xs flex items-center justify-center text-center shrink-0">No photo</div>}<div className="min-w-0"><p className="font-medium text-ink-900">{pg.name}</p><p className="text-sm text-ink-500 mt-1">{pg.full_address || pg.location}{pg.pincode ? ` - ${pg.pincode}` : ''}</p><p className="text-xs text-ink-500 mt-1">Owner: {pg.partner?.profile?.full_name ?? pg.partner?.business_name ?? 'Unknown'}{pg.partner?.profile?.phone ? ` · ${pg.partner.profile.phone}` : ''}</p><p className="text-xs text-ink-400 truncate">{pg.partner?.profile?.email}</p></div></div><div className="flex items-center gap-2 shrink-0"><StatusBadge status={pg.status} />{tab === 'requests' && <><button onClick={() => setPgStatus(pg.id, 'approved')} disabled={actingId === pg.id} className="btn-primary btn-sm">Approve</button><button onClick={() => setPgStatus(pg.id, 'rejected')} disabled={actingId === pg.id} className="btn-danger btn-sm">Reject</button></>}</div></article>)}{pgs.length === 0 && <p className="text-sm text-ink-400">{tab === 'requests' ? 'No PG requests waiting for review.' : 'No published PG listings yet.'}</p>}</div>}
    {tab === 'partners' && !loading && <div className="space-y-3">{partners.map((p) => <div key={p.id} className="card p-4 flex items-center justify-between gap-3"><div><p className="font-medium text-ink-900">{p.profile?.full_name}</p><p className="text-sm text-ink-500">{p.profile?.email}</p></div><div className="flex items-center gap-2"><span className={p.verified ? 'badge-green' : 'badge-amber'}>{p.verified ? 'Verified' : 'Unverified'}</span><button onClick={() => toggleVerified(p)} disabled={actingId === p.id} className="btn-secondary btn-sm">{p.verified ? 'Unverify' : 'Verify'}</button></div></div>)}{partners.length === 0 && <p className="text-sm text-ink-400">No partners yet.</p>}</div>}
  </main></div>
}
