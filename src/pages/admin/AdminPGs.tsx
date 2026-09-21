import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import StatusBadge from '@/components/StatusBadge'
import { supabase } from '@/lib/supabase'
import { Pg, PgPartner, Profile } from '@/types'

type PgRow = Pg & { partner: { business_name: string | null; profile: Pick<Profile, 'full_name'> } }
type PartnerRow = PgPartner & { profile: Pick<Profile, 'full_name' | 'email' | 'status'> }

export default function AdminPGs() {
  const [tab, setTab] = useState<'listings' | 'partners'>('listings')
  const [pgs, setPgs] = useState<PgRow[]>([])
  const [partners, setPartners] = useState<PartnerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function load() {
    setLoading(true)
    if (tab === 'listings') {
      const { data } = await supabase
        .from('pgs')
        .select('*, partner:pg_partners(business_name, profile:profiles(full_name))')
        .order('created_at', { ascending: false })
      setPgs((data ?? []) as unknown as PgRow[])
    } else {
      const { data } = await supabase
        .from('pg_partners')
        .select('*, profile:profiles(full_name, email, status)')
        .order('created_at', { ascending: false })
      setPartners((data ?? []) as unknown as PartnerRow[])
    }
    setLoading(false)
  }

  async function setPgStatus(pgId: string, status: 'approved' | 'rejected') {
    setActingId(pgId)
    await supabase.from('pgs').update({ status }).eq('id', pgId)
    setActingId(null)
    load()
  }

  async function toggleVerified(partner: PartnerRow) {
    setActingId(partner.id)
    await supabase.from('pg_partners').update({ verified: !partner.verified }).eq('id', partner.id)
    setActingId(null)
    load()
  }

  return (
    <div>
      <Navbar />
      <div className="container-page py-8">
        <h1 className="text-2xl font-semibold text-ink-900 mb-6">PGs</h1>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('listings')} className={`btn-sm ${tab === 'listings' ? 'btn-primary' : 'btn-secondary'}`}>PG Listings</button>
          <button onClick={() => setTab('partners')} className={`btn-sm ${tab === 'partners' ? 'btn-primary' : 'btn-secondary'}`}>PG Partners</button>
        </div>

        {loading && <p className="text-sm text-ink-400">Loading...</p>}

        {tab === 'listings' && !loading && (
          <div className="space-y-3">
            {pgs.map((pg) => (
              <div key={pg.id} className="card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink-900">{pg.name}</p>
                  <p className="text-sm text-ink-500">{pg.location} · Partner: {pg.partner?.profile?.full_name ?? pg.partner?.business_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={pg.status} />
                  {pg.status !== 'approved' && (
                    <button onClick={() => setPgStatus(pg.id, 'approved')} disabled={actingId === pg.id} className="btn-primary btn-sm">Approve</button>
                  )}
                  {pg.status !== 'rejected' && (
                    <button onClick={() => setPgStatus(pg.id, 'rejected')} disabled={actingId === pg.id} className="btn-danger btn-sm">Reject</button>
                  )}
                </div>
              </div>
            ))}
            {pgs.length === 0 && <p className="text-sm text-ink-400">No PG listings yet.</p>}
          </div>
        )}

        {tab === 'partners' && !loading && (
          <div className="space-y-3">
            {partners.map((p) => (
              <div key={p.id} className="card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink-900">{p.profile?.full_name}</p>
                  <p className="text-sm text-ink-500">{p.profile?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={p.verified ? 'badge-green' : 'badge-amber'}>{p.verified ? 'Verified' : 'Unverified'}</span>
                  <button onClick={() => toggleVerified(p)} disabled={actingId === p.id} className="btn-secondary btn-sm">
                    {p.verified ? 'Unverify' : 'Verify'}
                  </button>
                </div>
              </div>
            ))}
            {partners.length === 0 && <p className="text-sm text-ink-400">No partners yet.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
