import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types'

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers((data ?? []) as Profile[])
    setLoading(false)
  }

  async function toggleStatus(user: Profile) {
    setActingId(user.id)
    const nextStatus = user.status === 'active' ? 'suspended' : 'active'
    await supabase.from('profiles').update({ status: nextStatus }).eq('id', user.id)
    setActingId(null)
    load()
  }

  return (
    <div>
      <Navbar />
      <div className="container-page py-8">
        <h1 className="text-2xl font-semibold text-ink-900 mb-6">Users</h1>

        {loading && <p className="text-sm text-ink-400">Loading users...</p>}

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-ink-100">
                  <td className="px-4 py-3 text-ink-800">{u.full_name}</td>
                  <td className="px-4 py-3 text-ink-500">{u.email}</td>
                  <td className="px-4 py-3 text-ink-500 capitalize">{u.role}</td>
                  <td className="px-4 py-3">
                    <span className={u.status === 'active' ? 'badge-green' : 'badge-red'}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => toggleStatus(u)}
                        disabled={actingId === u.id}
                        className="btn-secondary btn-sm"
                      >
                        {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
