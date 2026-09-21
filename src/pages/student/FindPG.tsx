import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import Navbar from '@/components/Navbar'
import PgCard from '@/components/PgCard'
import { supabase } from '@/lib/supabase'
import { PgWithExtras } from '@/types'

export default function FindPG() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [pgs, setPgs] = useState<PgWithExtras[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [area, setArea] = useState(searchParams.get('area') ?? '')
  const [college, setCollege] = useState(searchParams.get('college') ?? '')
  const [sharing, setSharing] = useState(searchParams.get('sharing') ?? '')
  const [ac, setAc] = useState(searchParams.get('ac') ?? '')

  useEffect(() => {
    loadPgs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadPgs() {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('pgs')
      .select('*, pg_images(*), pg_amenities(amenity:amenities(*))')
      .eq('status', 'approved')

    // A user usually searches a city (for example, "Guntur"), which may be
    // saved in the full location rather than the smaller area field.
    if (area) query = query.or(`area.ilike.%${area}%,location.ilike.%${area}%`)
    if (college) query = query.ilike('nearby_college', `%${college}%`)

    const { data, error } = await query
    if (error) {
      setError('Could not load PGs right now. Please try again.')
      setLoading(false)
      return
    }

    let results = (data ?? []) as unknown as PgWithExtras[]

    // Sharing / AC filters need the rooms table — fetch matching pg_ids first.
    if (sharing || ac) {
      let roomQuery = supabase.from('rooms').select('pg_id, sharing_type, ac')
      if (sharing) roomQuery = roomQuery.eq('sharing_type', Number(sharing))
      if (ac) roomQuery = roomQuery.eq('ac', ac === 'ac')
      const { data: roomRows } = await roomQuery
      const matchingIds = new Set((roomRows ?? []).map((r) => r.pg_id))
      results = results.filter((pg) => matchingIds.has(pg.id))
    }

    const ids = results.map((pg) => pg.id)
    const { data: counts } = ids.length
      ? await supabase.from('pg_available_beds').select('*').in('pg_id', ids)
      : { data: [] as { pg_id: string; available_beds_count: number }[] }
    const countMap = new Map((counts ?? []).map((c) => [c.pg_id, c.available_beds_count]))

    setPgs(results.map((pg) => ({ ...pg, available_beds_count: countMap.get(pg.id) ?? 0 })))
    setLoading(false)
  }

  function handleFilter(e: React.FormEvent) {
    e.preventDefault()
    const params: Record<string, string> = {}
    if (area) params.area = area
    if (college) params.college = college
    if (sharing) params.sharing = sharing
    if (ac) params.ac = ac
    setSearchParams(params)
    loadPgs()
  }

  return (
    <div>
      <Navbar />
      <div className="container-page py-8">
        <h1 className="text-2xl font-semibold text-ink-900 mb-1">Find a PG</h1>
        <p className="text-sm text-ink-500 mb-6">Browse verified PGs in Guntur.</p>

        <form onSubmit={handleFilter} className="card p-4 mb-8 grid sm:grid-cols-5 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="label">Area</label>
            <input className="input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Brodipet" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Near college</label>
            <input className="input" value={college} onChange={(e) => setCollege(e.target.value)} placeholder="e.g. JKC College" />
          </div>
          <div>
            <label className="label">Sharing</label>
            <select className="input" value={sharing} onChange={(e) => setSharing(e.target.value)}>
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n} Sharing</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-5 flex items-end gap-3">
            <div className="w-40">
              <label className="label">AC / Non-AC</label>
              <select className="input" value={ac} onChange={(e) => setAc(e.target.value)}>
                <option value="">Any</option>
                <option value="ac">AC</option>
                <option value="nonac">Non-AC</option>
              </select>
            </div>
            <button type="submit" className="btn-primary">
              <SlidersHorizontal size={16} /> Apply filters
            </button>
          </div>
        </form>

        {loading && <p className="text-sm text-ink-400">Loading PGs...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && pgs.length === 0 && (
          <div className="card p-10 text-center">
            <p className="text-ink-500 text-sm">No PGs match your search. Try a different area or filter.</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pgs.map((pg) => (
            <PgCard key={pg.id} pg={pg} />
          ))}
        </div>
      </div>
    </div>
  )
}
