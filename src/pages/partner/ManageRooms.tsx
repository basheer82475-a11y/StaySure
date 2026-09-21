import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { Bed, Floor, Room } from '@/types'

type FloorWithRooms = Floor & { rooms: (Room & { beds: Bed[] })[] }

export default function ManageRooms() {
  const { id: pgId } = useParams<{ id: string }>()
  const [pgName, setPgName] = useState('')
  const [floors, setFloors] = useState<FloorWithRooms[]>([])
  const [loading, setLoading] = useState(true)

  const [newFloorNumber, setNewFloorNumber] = useState('')
  const [addingFloor, setAddingFloor] = useState(false)

  useEffect(() => {
    if (pgId) load(pgId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pgId])

  async function load(id: string) {
    setLoading(true)
    const { data: pg } = await supabase.from('pgs').select('name').eq('id', id).single()
    if (pg) setPgName(pg.name)
    const { data } = await supabase.from('floors').select('*, rooms(*, beds(*))').eq('pg_id', id).order('floor_number')
    setFloors((data ?? []) as unknown as FloorWithRooms[])
    setLoading(false)
  }

  async function addFloor() {
    if (!pgId || !newFloorNumber) return
    setAddingFloor(true)
    await supabase.from('floors').insert({ pg_id: pgId, floor_number: Number(newFloorNumber), label: `Floor ${newFloorNumber}` })
    setNewFloorNumber('')
    setAddingFloor(false)
    load(pgId)
  }

  async function toggleBed(bed: Bed) {
    if (!pgId) return
    await supabase.from('beds').update({ status: bed.status === 'available' ? 'taken' : 'available' }).eq('id', bed.id)
    load(pgId)
  }

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container-page py-16 text-center text-ink-400 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <Navbar />
      <div className="container-page py-8 max-w-3xl">
        <h1 className="text-2xl font-semibold text-ink-900 mb-1">Manage Rooms</h1>
        <p className="text-sm text-ink-500 mb-6">{pgName}</p>

        <div className="card p-4 mb-6 flex items-end gap-3">
          <div className="w-32">
            <label className="label">New floor #</label>
            <input className="input" type="number" min={1} value={newFloorNumber} onChange={(e) => setNewFloorNumber(e.target.value)} />
          </div>
          <button onClick={addFloor} disabled={addingFloor || !newFloorNumber} className="btn-primary btn-sm">
            <Plus size={14} /> Add Floor
          </button>
        </div>

        <div className="space-y-6">
          {floors.map((floor) => (
            <div key={floor.id} className="card p-4">
              <h3 className="font-medium text-ink-900 mb-3">{floor.label ?? `Floor ${floor.floor_number}`}</h3>
              <AddRoomForm floorId={floor.id} pgId={pgId!} onAdded={() => load(pgId!)} />
              <div className="space-y-3 mt-4">
                {floor.rooms.map((room) => (
                  <div key={room.id} className="border border-ink-100 rounded-card p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-ink-800">
                        Room {room.room_number} · {room.sharing_type} Sharing · {room.ac ? 'AC' : 'Non-AC'}
                      </p>
                      <AddBedButton roomId={room.id} existingCount={room.beds.length} onAdded={() => load(pgId!)} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {room.beds.map((bed) => (
                        <button
                          key={bed.id}
                          onClick={() => toggleBed(bed)}
                          className={`btn-sm ${bed.status === 'available' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                          title="Click to toggle availability"
                        >
                          {bed.bed_label} — {bed.status === 'available' ? 'Available' : 'Taken'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {floor.rooms.length === 0 && <p className="text-xs text-ink-400">No rooms on this floor yet.</p>}
              </div>
            </div>
          ))}
          {floors.length === 0 && <p className="text-sm text-ink-400">Add a floor to get started.</p>}
        </div>
      </div>
    </div>
  )
}

function AddRoomForm({ floorId, pgId, onAdded }: { floorId: string; pgId: string; onAdded: () => void }) {
  const [roomNumber, setRoomNumber] = useState('')
  const [sharing, setSharing] = useState('2')
  const [ac, setAc] = useState('nonac')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!roomNumber) return
    setSaving(true)
    await supabase.from('rooms').insert({
      floor_id: floorId, pg_id: pgId, room_number: roomNumber,
      sharing_type: Number(sharing), ac: ac === 'ac',
    })
    setRoomNumber('')
    setSaving(false)
    onAdded()
  }

  return (
    <div className="flex flex-wrap items-end gap-2 bg-ink-50 rounded-card p-3">
      <div>
        <label className="label text-xs">Room #</label>
        <input className="input w-24" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
      </div>
      <div>
        <label className="label text-xs">Sharing</label>
        <select className="input w-28" value={sharing} onChange={(e) => setSharing(e.target.value)}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} Sharing</option>)}
        </select>
      </div>
      <div>
        <label className="label text-xs">Type</label>
        <select className="input w-28" value={ac} onChange={(e) => setAc(e.target.value)}>
          <option value="nonac">Non-AC</option>
          <option value="ac">AC</option>
        </select>
      </div>
      <button onClick={handleAdd} disabled={saving || !roomNumber} className="btn-secondary btn-sm">
        <Plus size={14} /> Add Room
      </button>
    </div>
  )
}

function AddBedButton({ roomId, existingCount, onAdded }: { roomId: string; existingCount: number; onAdded: () => void }) {
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    setSaving(true)
    await supabase.from('beds').insert({ room_id: roomId, bed_label: `Bed ${existingCount + 1}`, status: 'available' })
    setSaving(false)
    onAdded()
  }

  return (
    <button onClick={handleAdd} disabled={saving} className="btn-secondary btn-sm">
      <Plus size={12} /> Bed
    </button>
  )
}
