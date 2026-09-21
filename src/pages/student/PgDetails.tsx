import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, BadgeCheck, Phone, MessageCircle, Wifi, Utensils, Shirt, Car, Camera, Zap, Droplet, Sparkles, Bus, BedDouble, Star, User } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Amenity, Bed, Floor, Pg, PgImage, PgReview, Room } from '@/types'

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
  const [showAllImages, setShowAllImages] = useState(false)
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
  const [reviews, setReviews] = useState<PgReview[]>([])
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [savingReview, setSavingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

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

    const [{ data: imgData }, { data: amenityData }, { data: floorData }, { data: reviewData }] = await Promise.all([
      supabase.from('pg_images').select('*').eq('pg_id', pgId).order('sort_order'),
      supabase.from('pg_amenities').select('amenity:amenities(*)').eq('pg_id', pgId),
      supabase.from('floors').select('*, rooms(*, beds(*))').eq('pg_id', pgId).order('floor_number'),
      supabase.from('pg_reviews').select('*').eq('pg_id', pgId).order('created_at', { ascending: false }),
    ])

    setImages((imgData ?? []) as PgImage[])
    if (window.location.hash === '#gallery') setShowAllImages(true)
    setAmenities(((amenityData ?? []) as unknown as { amenity: Amenity }[]).map((a) => a.amenity))
    setFloors((floorData ?? []) as unknown as FloorWithRooms[])
    const loadedReviews = (reviewData ?? []) as PgReview[]
    setReviews(loadedReviews)
    const ownReview = loadedReviews.find((review) => review.student_id === profile?.id)
    if (ownReview) {
      setReviewRating(ownReview.rating)
      setReviewComment(ownReview.comment)
    }
    setLoading(false)
  }

  const availableSharingOptions = useMemo(() => {
    const set = new Set<number>()
    floors.forEach((f) => f.rooms.forEach((r) => set.add(r.sharing_type)))
    return Array.from(set).sort()
  }, [floors])

  const availableBeds = useMemo(
    () => floors.reduce((total, floor) => total + (floor.rooms.length > 0
      ? floor.rooms.reduce((roomTotal, room) => roomTotal + room.beds.filter((bed) => bed.status === 'available').length, 0)
      : (floor.available_seats ?? 0)), 0),
    [floors]
  )

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

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session || !profile) {
      navigate('/login', { state: { from: `/pg/${id}` } })
      return
    }
    if (profile.role !== 'student') {
      setReviewError('Only student accounts can write reviews.')
      return
    }
    if (!id || reviewRating === 0 || !reviewComment.trim()) {
      setReviewError('Choose a star rating and write a short comment.')
      return
    }
    setSavingReview(true)
    setReviewError(null)
    const { error: saveError } = await supabase.from('pg_reviews').upsert(
      { pg_id: id, student_id: profile.id, rating: reviewRating, comment: reviewComment.trim() },
      { onConflict: 'pg_id,student_id' }
    )
    setSavingReview(false)
    if (saveError) {
      setReviewError('Could not save your review. Please try again.')
      return
    }
    loadPg(id)
  }

  const averageRating = reviews.length ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : 0

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
        <div id="gallery" className="grid grid-cols-3 gap-2 mb-6 rounded-card overflow-hidden">
          {images.length > 0 ? (
            (showAllImages ? images : images.slice(0, 3)).map((img, i) => (
              <img key={img.id} src={img.url} className={`w-full h-48 object-cover ${i === 0 ? 'col-span-3 sm:col-span-1' : ''}`} />
            ))
          ) : (
            <div className="col-span-3 h-48 bg-ink-100 flex items-center justify-center text-ink-300 text-sm">No images</div>
          )}
        </div>
        {images.length > 3 && (
          <button type="button" onClick={() => setShowAllImages((shown) => !shown)} className="btn-secondary btn-sm mb-6">
            {showAllImages ? 'Show fewer photos' : `Show all ${images.length} photos`}
          </button>
        )}

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

        <div className={`mt-5 rounded-card p-5 flex items-center gap-4 ${availableBeds > 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
          <div className={`w-11 h-11 rounded-card flex items-center justify-center ${availableBeds > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}><BedDouble size={22} /></div>
          <div><p className={`text-2xl font-semibold ${availableBeds > 0 ? 'text-emerald-800' : 'text-red-700'}`}>{availableBeds > 0 ? `${availableBeds} seat${availableBeds === 1 ? '' : 's'} available` : 'No seats available'}</p><p className="text-sm text-ink-600 mt-0.5">Live availability across all rooms in this PG.</p></div>
        </div>

        {floors.some((floor) => floor.rooms.length === 0 && floor.available_seats !== null) && (
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {floors.filter((floor) => floor.rooms.length === 0 && floor.available_seats !== null).map((floor) => (
              <span key={floor.id} className="badge-green">{floor.label ?? `Floor ${floor.floor_number}`}: {floor.available_seats} seats</span>
            ))}
          </div>
        )}

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

        <section className="grid sm:grid-cols-2 gap-3 mt-6">
          <DetailItem icon={<User size={17} />} label="PG owner" value={pg.owner_name || 'Contact the PG for owner details'} />
          <DetailItem icon={<Phone size={17} />} label="Contact number" value={pg.contact_number || 'Not provided'} />
          <DetailItem icon={<MapPin size={17} />} label="Full location" value={`${pg.full_address || pg.location}${pg.pincode ? `, ${pg.pincode}` : ''}`} />
          <DetailItem icon={<Bus size={17} />} label="Transport" value={pg.transport_available ? 'Available' : 'Not available'} />
          <DetailItem icon={<MapPin size={17} />} label="Distance from college" value={pg.distance_from_college ? `${pg.distance_from_college}${pg.nearby_college ? ` from ${pg.nearby_college}` : ''}` : 'Not provided'} />
          <DetailItem icon={<BedDouble size={17} />} label="Sharing options" value={availableSharingOptions.length ? availableSharingOptions.map((option) => `${option} sharing`).join(', ') : 'Not added yet'} />
        </section>

        <section className="mt-6">
          <h2 className="font-medium text-ink-900 mb-2">About this PG</h2>
          {pg.description && <p className="text-sm text-ink-600 leading-relaxed">{pg.description}</p>}
          <p className="text-sm text-ink-600 mt-2">Managed by {pg.owner_name || 'the PG owner'}.</p>
          {floors.length > 0 && <p className="text-sm text-ink-600 mt-1">Floor availability: {floors.map((floor) => `${floor.label ?? `Floor ${floor.floor_number}`} — ${floor.rooms.length > 0 ? floor.rooms.reduce((total, room) => total + room.beds.filter((bed) => bed.status === 'available').length, 0) : (floor.available_seats ?? 0)} seats`).join(', ')}.</p>}
        </section>

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

        <section className="mt-8 border-t border-ink-100 pt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Student reviews</h2>
              <p className="mt-1 text-sm text-ink-500">Honest feedback from students who explored this PG.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-brand-800">
              <Star size={18} className="fill-amber-400 text-amber-400" />
              <span className="font-semibold">{averageRating ? averageRating.toFixed(1) : 'New'}</span>
              <span className="text-xs text-brand-700">{reviews.length ? `(${reviews.length} review${reviews.length === 1 ? '' : 's'})` : 'No reviews yet'}</span>
            </div>
          </div>

          {session && profile?.role === 'student' ? (
            <form onSubmit={handleReviewSubmit} className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/50 p-4 sm:p-5">
              <p className="text-sm font-semibold text-ink-800">Share your experience</p>
              <div className="mt-3 flex items-center gap-1" aria-label="Choose a star rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setReviewRating(star)} className="rounded p-1 text-ink-300 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand-400" aria-label={`${star} star${star === 1 ? '' : 's'}`}>
                    <Star size={24} className={star <= reviewRating ? 'fill-amber-400 text-amber-400' : ''} />
                  </button>
                ))}
                <span className="ml-2 text-xs text-ink-500">{reviewRating ? `${reviewRating} out of 5` : 'Select rating'}</span>
              </div>
              <textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} maxLength={1000} rows={3} className="input mt-3 resize-y" placeholder="What did you like about this PG?" />
              {reviewError && <p className="mt-2 text-sm text-red-600">{reviewError}</p>}
              <button type="submit" disabled={savingReview} className="btn-primary mt-3 rounded-lg">{savingReview ? 'Saving...' : reviews.some((review) => review.student_id === profile.id) ? 'Update review' : 'Post review'}</button>
            </form>
          ) : (
            <p className="mt-5 rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-600">Sign in with a student account to leave a rating and review.</p>
          )}

          <div className="mt-6 space-y-3">
            {reviews.length ? reviews.map((review) => (
              <article key={review.id} className="rounded-xl border border-ink-100 bg-white p-4">
                <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-1 text-amber-500">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={15} className={star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-200'} />)}</div><time className="text-xs text-ink-400">{new Date(review.created_at).toLocaleDateString()}</time></div>
                <p className="mt-3 text-sm leading-6 text-ink-700">{review.comment}</p>
                <p className="mt-2 text-xs font-medium text-ink-400">Student review</p>
              </article>
            )) : <p className="py-4 text-sm text-ink-500">No reviews yet. Be the first to share your experience.</p>}
          </div>
        </section>

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

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="card p-4 flex gap-3"><span className="text-brand-600 mt-0.5">{icon}</span><div><p className="text-xs text-ink-400">{label}</p><p className="text-sm font-medium text-ink-800 mt-0.5">{value}</p></div></div>
}
