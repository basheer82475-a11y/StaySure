import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, DoorOpen } from 'lucide-react'
import Navbar from '@/components/Navbar'
import StatusBadge from '@/components/StatusBadge'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Pg } from '@/types'

export default function PartnerPGs() {
  const { profile } = useAuth()
  const [pgs, setPgs] = useState<Pg[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function load() {
    setLoading(true)
    const { data: partner } = await supabase.from('pg_partners').select('id').eq('profile_id', profile!.id).single()
    if (!partner) { setLoading(false); return }
    const { data } = await supabase.from('pgs').select('*').eq('partner_id', partner.id).order('created_at', { ascending: false })
    setPgs((data ?? []) as Pg[])
    setLoading(false)
  }

  async function removePg(pg: Pg) {
    if (!window.confirm(`Remove ${pg.name}? This permanently removes its floors, rooms, beds, and booking requests.`)) return
    setRemovingId(pg.id)
    setError(null)
    const { data, error: deleteError } = await supabase.from('pgs').delete().eq('id', pg.id).select('id')
    setRemovingId(null)
    if (deleteError || !data?.length) {
      setError(deleteError?.message || 'This PG could not be removed because your database does not yet allow partner deletes. Run the latest supabase/schema.sql in Supabase SQL Editor, then try again.')
      return
    }
    load()
  }

  return (
    <div>
      <Navbar />
      <div className="container-page py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-ink-900">My PGs</h1>
          <Link to="/partner/pgs/new" className="btn-primary btn-sm"><Plus size={16} /> Add PG</Link>
        </div>

        {loading && <p className="text-sm text-ink-400">Loading...</p>}
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {!loading && pgs.length === 0 && (
          <div className="card p-10 text-center">
            <p className="text-ink-500 text-sm mb-3">You haven't added a PG yet.</p>
            <Link to="/partner/pgs/new" className="btn-primary btn-sm">Add Your First PG</Link>
          </div>
        )}

        <div className="space-y-3">
          {pgs.map((pg) => (
            <div key={pg.id} className="card p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink-900">{pg.name}</p>
                <p className="text-sm text-ink-500">{pg.area}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={pg.status} />
                <Link to={`/partner/pgs/${pg.id}/rooms`} className="btn-secondary btn-sm"><DoorOpen size={14} /> Rooms</Link>
                <Link to={`/partner/pgs/${pg.id}/edit`} className="btn-secondary btn-sm">Edit</Link>
                <button onClick={() => removePg(pg)} disabled={removingId === pg.id} className="btn-danger btn-sm">{removingId === pg.id ? 'Removing...' : 'Remove'}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
