import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import StatusBadge from '@/components/StatusBadge'
import { supabase } from '@/lib/supabase'
import { BedRequestWithDetails } from '@/types'

export default function PartnerRequests() {
  const [requests, setRequests] = useState<BedRequestWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('bed_requests')
      .select('*, pg:pgs(id, name, area), room:rooms(id, room_number, sharing_type, ac), bed:beds(id, bed_label), student:profiles(id, full_name, phone)')
      .order('created_at', { ascending: false })
    setRequests((data ?? []) as unknown as BedRequestWithDetails[])
    setLoading(false)
  }

  async function respond(requestId: string, action: 'accept' | 'reject') {
    setActingId(requestId)
    setError(null)
    const { error } = await supabase.rpc('respond_to_request', { p_request_id: requestId, p_action: action })
    setActingId(null)
    if (error) {
      setError('Could not update this request. It may have already been handled.')
      load()
      return
    }
    load()
  }

  return (
    <div>
      <Navbar />
      <div className="container-page py-8 max-w-3xl">
        <h1 className="text-2xl font-semibold text-ink-900 mb-6">Bed Requests</h1>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {loading && <p className="text-sm text-ink-400">Loading requests...</p>}

        {!loading && requests.length === 0 && (
          <div className="card p-10 text-center">
            <p className="text-ink-500 text-sm">No bed requests yet.</p>
          </div>
        )}

        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink-900">{r.student?.full_name}</p>
                  <p className="text-sm text-ink-500">{r.student?.phone}</p>
                  <p className="text-sm text-ink-600 mt-1">
                    {r.pg.name} · Room {r.room.room_number} · {r.room.sharing_type} Sharing · {r.room.ac ? 'AC' : 'Non-AC'} · {r.bed.bed_label}
                  </p>
                  <p className="text-xs text-ink-400 mt-1">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>

              {r.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => respond(r.id, 'accept')}
                    disabled={actingId === r.id}
                    className="btn-primary btn-sm"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respond(r.id, 'reject')}
                    disabled={actingId === r.id}
                    className="btn-danger btn-sm"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
