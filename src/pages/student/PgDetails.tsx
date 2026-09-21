import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, BadgeCheck, Phone, MessageCircle, Wifi, Utensils, Shirt, Car, Camera, Zap, Droplet, Sparkles } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Amenity, Bed, Floor, Pg, PgImage, Room } from '@/types'

const amenityIcons: Record<string, React.ReactNode> = {
  wifi: <Wifi size={16} />,
  utensils: <Utensils size={16} />,
  shirt: <Shirt size={16} />,
  car: <Car size={16} />,
  camera: <Camera size={16} />,
  zap: <Zap size={16} />,
  droplet: <Droplet size={16} />,
  sparkles: <Sparkles size={16} />,
}

type FloorWithRooms = Floor & { rooms: (Room & { beds: Bed[] })[] }

export default function PgDetails() {
  const { id } = useParams<{ id: string }>()
  const { session, profile } = useAuth()
  const navigate = useNavigate()

  const [pg, setPg] = useState<Pg | null>(null)
  const [images, setImages] = useState<PgImage[]>([])
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [floors, setFloors] = useState<FloorWithRooms[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sharing, setSharing] = useState<number | null>(null)
  const [acFilter, setAcFilter] = useState<'ac' | 'nonac' | null>(null)
  const [selectedBed, setSelectedBed] = useState<{ bed: Bed; room: Room; floor: FloorWithRooms } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (id) loadPg(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadPg(pgId: string) {
    setLoading(true)
    setError(null)

    const { data: pgData, error: pgError } = await supabase.from('pgs').select('*').eq('id', pgId).single()
    if (pgError || !pgData) {
      setError('This PG could not be found.')
      setLoading(false)
      return
    }
    setPg(pgData as Pg)

    const [{ data: imgData }, { data: amenityData }, { data: floorData }] = await Promise.all([
      supabase.from('pg_images').select('*').eq('pg_id', pgId).order('sort_order'),
      supabase.from('pg_amenities').select('amenity:amenities(*)').eq('pg_id', pgId),
      supabase.from('floors').select('*, rooms(*, beds(*))').eq('pg_id', pgId).order('floor_number'),
    ])

    setImages((imgData ?? []) as PgImage[])
    setAmenities(((amenityData ?? []) as unknown as { amenity: Amenity }[]).map((a) => a.amenity))
    setFloors((floorData ?? []) as unknown as FloorWithRooms[])
    setLoading(false)
  }

  const availableSharingOptions = useMemo(() => {
    const set = new Set<number>()
    floors.forEach((f) => f.rooms.forEach((r) => set.add(r.sharing_type)))
    return Array.from(set).sort()
  }, [floors])

  const filteredFloors = useMemo(() => {
    if (!sharing) return []
    return floors
      .map((f) => ({
        ...f,
        rooms: f.rooms.filter((r) => r.sharing_type === sharing && (acFilter === null || (acFilter === 'ac') === r.ac)),
      }))
      .filter((f) => f.rooms.length > 0)
  }, [floors, sharing, acFilter])

  async function handleRequestBed() {
    if (!session || !profile) {
      navigate('/login', { state: { from: `/pg/${id}` } })
      return
    }
    if (profile.role !== 'student') {
      setSubmitError('Only student accounts can request a bed.')
      return
    }
    if (!selectedBed) return

    setSubmitting(true)
    setSubmitError(null)
    const { error } = await supabase.rpc('create_bed_request', { p_bed_id: selectedBed.bed.id })
    setSubmitting(false)

    if (error) {
      setSubmitError(
        error.message.includes('no longer available')
          ? 'Sorry, someone just booked this bed. Please pick another.'
          : 'Could not send your request. Please try again.'
      )
      if (id) loadPg(id)
      return
    }
    setSubmitted(true)
  }

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container-page py-16 text-center text-ink-400 text-sm">Loading PG details...</div>
      </div>
    )
  }

  if (error || !pg) {
    return (
      <div>
        <Navbar />
        <div className="container-page py-16 text-center text-ink-500 text-sm">{error ?? 'PG not found.'}</div>
      </div>
    )
  }

  return (
    <div>
      <Navbar />
      <div className="container-page py-8 max-w-4xl">
        {/* Gallery */}
        <div className="grid grid-cols-3 gap-2 mb-6 rounded-card overflow-hidden">
          {images.length > 0 ? (
            images.slice(0, 3).map((img, i) => (
              <img key={img.id} src={img.url} className={`w-full h-48 object-cover ${i === 0 ? 'col-span-3 sm:col-span-1' : ''}`} />
            ))
          ) : (
            <div className="col-span-3 h-48 bg-ink-100 flex items-center justify-center text-ink-300 text-sm">No images</div>
          )}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink-900">{pg.name}</h1>
            <p className="text-sm text-ink-500 flex items-center gap-1 mt-1">
              <MapPin size={14} /> {pg.location}
              {pg.distance_from_college ? ` · ${pg.distance_from_college} from ${pg.nearby_college ?? 'college'}` : ''}
            </p>
          </div>
          <span className="badge-green shrink-0"><BadgeCheck size={12} /> Verified</span>
        </div>

        <div className="flex gap-3 mt-4">
          {pg.contact_number && (
            <>
              <a href={`tel:${pg.contact_number}`} className="btn-secondary btn-sm">
                <Phone size={14} /> Call PG
              </a>
              <a
                href={`https://wa.me/91${pg.contact_number.replace(/\D/g, '').slice(-10)}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary btn-sm"
              >
                <MessageCircle size={14} /> WhatsApp
              </a>
            </>
          )}
        </div>

        {pg.description && <p className="text-sm text-ink-600 mt-6 leading-relaxed">{pg.description}</p>}

        {amenities.length > 0 && (
          <div className="mt-6">
            <h2 className="font-medium text-ink-900 mb-3">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {amenities.map((a) => (
                <span key={a.id} className="badge-gray">
                  {a.icon && amenityIcons[a.icon]} {a.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Choose your stay */}
        <div className="mt-10 border-t border-ink-100 pt-8">
          <h2 className="font-medium text-ink-900 mb-4">Choose Your Stay</h2>

          <p className="text-sm text-ink-500 mb-2">Sharing</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {availableSharingOptions.map((n) => (
              <button
                key={n}
                onClick={() => { setSharing(n); setSelectedBed(null); setSubmitted(false) }}
                className={`btn-sm ${sharing === n ? 'btn-primary' : 'btn-secondary'}`}
              >
                {n} Sharing
              </button>
            ))}
          </div>

          <p className="text-sm text-ink-500 mb-2">Room type</p>
          <div className="flex gap-2 mb-6">
            <button onClick={() => setAcFilter('ac')} className={`btn-sm ${acFilter === 'ac' ? 'btn-primary' : 'btn-secondary'}`}>AC</button>
            <button onClick={() => setAcFilter('nonac')} className={`btn-sm ${acFilter === 'nonac' ? 'btn-primary' : 'btn-secondary'}`}>Non-AC</button>
          </div>

          {sharing && acFilter && (
            <div className="space-y-6">
              {filteredFloors.length === 0 && (
                <p className="text-sm text-ink-500">No {sharing} sharing {acFilter === 'ac' ? 'AC' : 'Non-AC'} rooms in this PG.</p>
              )}
              {filteredFloors.map((floor) => (
                <div key={floor.id}>
                  <h3 className="text-sm font-semibold text-ink-800 mb-2">{floor.label ?? `Floor ${floor.floor_number}`}</h3>
                  <div className="space-y-3">
                    {floor.rooms.map((room) => (
                      <div key={room.id} className="card p-4">
                        <p className="text-sm font-medium text-ink-800 mb-2">
                          Room {room.room_number} · {room.sharing_type} Sharing · {room.ac ? 'AC' : 'Non-AC'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {room.beds.map((bed) => {
                            const isSelected = selectedBed?.bed.id === bed.id
                            const available = bed.status === 'available'
                            return (
                              <button
                                key={bed.id}
                                disabled={!available}
                                onClick={() => { setSelectedBed({ bed, room, floor }); setSubmitted(false); setSubmitError(null) }}
                                className={`btn-sm ${
                                  isSelected
                                    ? 'btn-primary'
                                    : available
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-red-50 text-red-600 cursor-not-allowed'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: available ? '#059669' : '#dc2626' }} />
                                {bed.bed_label} — {available ? 'Available' : 'Taken'}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bed request summary */}
        {selectedBed && !submitted && (
          <div className="card p-5 mt-8">
            <h3 className="font-medium text-ink-900 mb-3">Confirm your request</h3>
            <dl className="text-sm text-ink-600 grid grid-cols-2 gap-y-1.5 mb-4">
              <dt className="text-ink-400">PG</dt><dd>{pg.name}</dd>
              <dt className="text-ink-400">Floor</dt><dd>{selectedBed.floor.label ?? `Floor ${selectedBed.floor.floor_number}`}</dd>
              <dt className="text-ink-400">Room</dt><dd>{selectedBed.room.room_number}</dd>
              <dt className="text-ink-400">Sharing</dt><dd>{selectedBed.room.sharing_type} Sharing</dd>
              <dt className="text-ink-400">Type</dt><dd>{selectedBed.room.ac ? 'AC' : 'Non-AC'}</dd>
              <dt className="text-ink-400">Bed</dt><dd>{selectedBed.bed.bed_label}</dd>
            </dl>
            {submitError && <p className="text-sm text-red-600 mb-3">{submitError}</p>}
            <button onClick={handleRequestBed} disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Sending request...' : 'Request This Bed'}
            </button>
          </div>
        )}

        {submitted && (
          <div className="card p-5 mt-8 text-center">
            <p className="font-medium text-ink-900">Request Sent Successfully</p>
            <p className="text-sm text-ink-500 mt-1">
              Your request has been sent to the PG partner. You will be notified after confirmation.
            </p>
            <button onClick={() => navigate('/student/dashboard')} className="btn-secondary btn-sm mt-4">
              View My Requests
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
