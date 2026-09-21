import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Amenity, PgImage } from '@/types'

type FloorSeatEntry = { floorNumber: string; seats: string }

export default function AddEditPG() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [area, setArea] = useState('')
  const [location, setLocation] = useState('')
  const [fullAddress, setFullAddress] = useState('')
  const [pincode, setPincode] = useState('')
  const [transportAvailable, setTransportAvailable] = useState(false)
  const [nearbyCollege, setNearbyCollege] = useState('')
  const [distance, setDistance] = useState('')
  const [description, setDescription] = useState('')
  const [contact, setContact] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [floorSeats, setFloorSeats] = useState<FloorSeatEntry[]>([])

  const [allAmenities, setAllAmenities] = useState<Amenity[]>([])
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set())
  const [images, setImages] = useState<PgImage[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    loadAmenities()
    if (isEdit && id) loadPg(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadAmenities() {
    const { data } = await supabase.from('amenities').select('*').order('name')
    setAllAmenities((data ?? []) as Amenity[])
  }

  async function loadPg(pgId: string) {
    const { data: pg } = await supabase.from('pgs').select('*').eq('id', pgId).single()
    if (pg) {
      setName(pg.name); setArea(pg.area); setLocation(pg.location)
      setFullAddress(pg.full_address ?? ''); setPincode(pg.pincode ?? '')
      setTransportAvailable(pg.transport_available ?? false)
      setNearbyCollege(pg.nearby_college ?? ''); setDistance(pg.distance_from_college ?? '')
      setDescription(pg.description ?? ''); setContact(pg.contact_number ?? ''); setOwnerName(pg.owner_name ?? '')
    }
    const { data: amenityRows } = await supabase.from('pg_amenities').select('amenity_id').eq('pg_id', pgId)
    setSelectedAmenities(new Set((amenityRows ?? []).map((r) => r.amenity_id)))
    const { data: imgRows } = await supabase.from('pg_images').select('*').eq('pg_id', pgId).order('sort_order')
    setImages((imgRows ?? []) as PgImage[])
    setLoading(false)
  }

  function toggleAmenity(amenityId: string) {
    setSelectedAmenities((prev) => {
      const next = new Set(prev)
      if (next.has(amenityId)) next.delete(amenityId)
      else next.add(amenityId)
      return next
    })
  }

  function updateFloorSeat(index: number, field: keyof FloorSeatEntry, value: string) {
    setFloorSeats((entries) => entries.map((entry, entryIndex) => entryIndex === index ? { ...entry, [field]: value } : entry))
  }

  async function handleImageUpload(file: File, pgId: string, sortOrder = images.length): Promise<boolean> {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPG, PNG, or WebP image.')
      return false
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5 MB or smaller.')
      return false
    }
    setUploading(true)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const path = `${pgId}/${Date.now()}-${safeName}`
    const { error: uploadError } = await supabase.storage.from('pg-images').upload(path, file)
    if (uploadError) {
      setError(`Image upload failed: ${uploadError.message}. Run the latest supabase/schema.sql in the Supabase SQL Editor to create the pg-images bucket and its upload policy.`)
      setUploading(false)
      return false
    }
    const { data: urlData } = supabase.storage.from('pg-images').getPublicUrl(path)
    const { data: imgRow, error: imageRowError } = await supabase
      .from('pg_images')
      .insert({ pg_id: pgId, url: urlData.publicUrl, sort_order: sortOrder })
      .select()
      .single()
    if (imageRowError || !imgRow) {
      setError(imageRowError?.message || 'Image uploaded, but it could not be linked to this PG.')
      setUploading(false)
      return false
    }
    setImages((prev) => [...prev, imgRow as PgImage])
    setUploading(false)
    return true
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const validFloorSeats = isEdit ? [] : floorSeats.filter(({ floorNumber, seats }) => floorNumber !== '' || seats !== '')
    const floorNumbers = validFloorSeats.map(({ floorNumber }) => Number(floorNumber))
    if (!name || !area || !location || !ownerName) {
      setError('PG name, owner name, area, and location are required.')
      return
    }
    if (validFloorSeats.some(({ floorNumber, seats }) => !floorNumber || seats === '' || !Number.isInteger(Number(floorNumber)) || Number(floorNumber) < 1 || !Number.isInteger(Number(seats)) || Number(seats) < 0) || new Set(floorNumbers).size !== floorNumbers.length) {
      setError('Enter a unique floor number and a zero or greater seat count for every floor.')
      return
    }
    setSaving(true)

    const { data: partner } = await supabase.from('pg_partners').select('id').eq('profile_id', profile!.id).single()
    if (!partner) {
      setError('Partner profile not found.')
      setSaving(false)
      return
    }

    const payload = {
      name, area, location,
      full_address: fullAddress || null,
      pincode: pincode || null,
      transport_available: transportAvailable,
      nearby_college: nearbyCollege || null,
      distance_from_college: distance || null,
      description: description || null,
      contact_number: contact || null,
      owner_name: ownerName,
    }

    let pgId = id
    if (isEdit && id) {
      const { error: updateError } = await supabase.from('pgs').update(payload).eq('id', id)
      if (updateError) {
        const schemaFields = ['full_address', 'pincode', 'transport_available', 'owner_name']
        const needsSchemaUpdate = schemaFields.some((field) => updateError.message.toLowerCase().includes(field))
        setError(needsSchemaUpdate
          ? 'Your database needs the latest PG fields. Run supabase/schema.sql once in the Supabase SQL Editor, then save again.'
          : updateError.message || 'Could not save changes. Please try again.')
        setSaving(false)
        return
      }
    } else {
      const { data: newPg, error: insertError } = await supabase
        .from('pgs')
        .insert({ ...payload, partner_id: partner.id, status: 'pending' })
        .select()
        .single()
      if (insertError || !newPg) {
        const detail = insertError?.message?.toLowerCase().includes('full_address') || insertError?.message?.toLowerCase().includes('pincode')
          ? 'Your database needs the latest PG address fields. Run supabase/schema.sql once in the Supabase SQL Editor, then try again.'
          : insertError?.message || 'Could not create PG. Please try again.'
        setError(detail)
        setSaving(false)
        return
      }
      pgId = newPg.id
      if (validFloorSeats.length > 0) {
        const { error: floorError } = await supabase.from('floors').insert(validFloorSeats.map(({ floorNumber, seats }) => ({
          pg_id: newPg.id,
          floor_number: Number(floorNumber),
          label: `Floor ${floorNumber}`,
          available_seats: Number(seats),
        })))
        if (floorError) {
          setError(floorError.message.includes('available_seats')
            ? 'Your database needs the latest floor availability field. Run supabase/schema.sql once in the Supabase SQL Editor, then save again.'
            : floorError.message || 'PG was created, but the floor seat details could not be saved.')
          setSaving(false)
          return
        }
      }
      for (const [index, image] of newImages.entries()) {
        const uploaded = await handleImageUpload(image, newPg.id, images.length + index)
        if (!uploaded) {
          setSaving(false)
          return
        }
      }
    }

    // Sync amenities: clear then re-insert selected set (simple + reliable for a small list)
    await supabase.from('pg_amenities').delete().eq('pg_id', pgId!)
    if (selectedAmenities.size > 0) {
      await supabase.from('pg_amenities').insert(
        Array.from(selectedAmenities).map((amenityId) => ({ pg_id: pgId!, amenity_id: amenityId }))
      )
    }

    setSaving(false)
    navigate('/partner/pgs')
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
      <div className="container-page py-8 max-w-2xl">
        <h1 className="text-2xl font-semibold text-ink-900 mb-1">{isEdit ? 'Edit PG' : 'Add PG'}</h1>
        <p className="text-sm text-ink-500 mb-6">
          {isEdit ? 'Update your PG details.' : 'Submit your PG details for admin review. It will appear to students once approved.'}
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">PG name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Area</label>
              <input className="input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Brodipet" required />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Brodipet, Guntur" required />
            </div>
          </div>
          <div>
            <label className="label">PG owner name</label>
            <input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g. Lakshmi Devi" required />
          </div>
          <div>
            <label className="label">Full address</label>
            <textarea className="input" rows={2} value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} placeholder="Building / street, landmark, city" required />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">PIN code</label>
              <input className="input" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 522002" required />
            </div>
            <div>
              <label className="label">Owner / contact number</label>
              <input className="input" type="tel" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="10-digit mobile number" required />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nearby college</label>
              <input className="input" value={nearbyCollege} onChange={(e) => setNearbyCollege(e.target.value)} />
            </div>
            <div>
              <label className="label">Distance from college</label>
              <input className="input" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="e.g. 1.2 km" />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <label className="flex items-center gap-3 text-sm text-ink-700 cursor-pointer">
            <input type="checkbox" checked={transportAvailable} onChange={(e) => setTransportAvailable(e.target.checked)} className="w-4 h-4 accent-brand-500" />
            Transport available for students
          </label>

          {!isEdit && <div>
            <label className="label">Seats available by floor <span className="font-normal text-ink-400">(optional)</span></label>
            <p className="text-xs text-ink-500 mb-3">Add floor-wise availability only if you have those details now. You can manage rooms and beds later.</p>
            <div className="space-y-2">
              {floorSeats.map((entry, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <div>
                    <label className="label text-xs">Floor</label>
                    <input className="input" type="number" min={1} value={entry.floorNumber} onChange={(e) => updateFloorSeat(index, 'floorNumber', e.target.value)} placeholder="1" />
                  </div>
                  <div>
                    <label className="label text-xs">Available seats</label>
                    <input className="input" type="number" min={0} value={entry.seats} onChange={(e) => updateFloorSeat(index, 'seats', e.target.value)} placeholder="e.g. 12" />
                  </div>
                  <button type="button" className="btn-secondary btn-sm mb-0.5" onClick={() => setFloorSeats((entries) => entries.filter((_, entryIndex) => entryIndex !== index))} disabled={floorSeats.length === 1}>Remove</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => setFloorSeats((entries) => [...entries, { floorNumber: String(entries.length + 1), seats: '' }])}>Add floor availability</button>
          </div>}

          <div>
            <label className="label">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {allAmenities.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => toggleAmenity(a.id)}
                  className={`btn-sm ${selectedAmenities.has(a.id) ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">PG photos</label>
            <p className="mb-2 text-xs text-ink-500">You can choose multiple JPG, PNG, or WebP photos (up to 5 MB each).</p>
            <div className="flex flex-wrap gap-3 mb-3">
              {images.map((img) => <img key={img.id} src={img.url} className="w-20 h-20 object-cover rounded-card border border-ink-100" />)}
              {newImages.map((image) => <img key={`${image.name}-${image.lastModified}`} src={URL.createObjectURL(image)} className="w-20 h-20 object-cover rounded-card border border-ink-100" />)}
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={async (e) => {
              const files = Array.from(e.target.files ?? [])
              if (!files.length) return
              if (isEdit && id) {
                for (const [index, file] of files.entries()) {
                  const uploaded = await handleImageUpload(file, id, images.length + index)
                  if (!uploaded) break
                }
              } else {
                setNewImages((current) => [...current, ...files])
              }
              e.target.value = ''
            }} className="text-sm" />
            {uploading && <p className="text-xs text-ink-400 mt-1">Uploading...</p>}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add PG'}
          </button>
        </form>
      </div>
    </div>
  )
}
