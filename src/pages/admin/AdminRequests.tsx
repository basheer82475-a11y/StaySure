import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import StatusBadge from '@/components/StatusBadge'
import { supabase } from '@/lib/supabase'
import { BedRequestWithDetails } from '@/types'

export default function AdminRequests() {
  const [requests, setRequests] = useState<BedRequestWithDetails[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div>
      <Navbar />
      <div className="container-page py-8">
        <h1 className="text-2xl font-semibold text-ink-900 mb-6">All Bed Requests</h1>

        {loading && <p className="text-sm text-ink-400">Loading...</p>}

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">PG</th>
                <th className="px-4 py-3 font-medium">Room / Bed</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-ink-100">
                  <td className="px-4 py-3 text-ink-800">{r.student?.full_name}</td>
                  <td className="px-4 py-3 text-ink-500">{r.pg.name}</td>
                  <td className="px-4 py-3 text-ink-500">Room {r.room.room_number} · {r.bed.bed_label}</td>
                  <td className="px-4 py-3 text-ink-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
