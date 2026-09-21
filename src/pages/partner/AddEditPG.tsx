import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Amenity, PgImage } from '@/types'

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
  const [nearbyCollege, setNearbyCollege] = useState('')
  const [distance, setDistance] = useState('')
  const [description, setDescription] = useState('')
  const [contact, setContact] = useState('')

  const [allAmenities, setAllAmenities] = useState<Amenity[]>([])
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set())
  const [images, setImages] = useState<PgImage[]>([])
  const [newImage, setNewImage] = useState<File | null>(null)
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
      setNearbyCollege(pg.nearby_college ?? ''); setDistance(pg.distance_from_college ?? '')
      setDescription(pg.description ?? ''); setContact(pg.contact_number ?? '')
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

  async function handleImageUpload(file: File, pgId: string) {
    setUploading(true)
    const path = `${pgId}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('pg-images').upload(path, file)
    if (uploadError) {
      setError('Image upload failed. Make sure the "pg-images" storage bucket exists (see README).')
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from('pg-images').getPublicUrl(path)
    const { data: imgRow } = await supabase
      .from('pg_images')
      .insert({ pg_id: pgId, url: urlData.publicUrl, sort_order: images.length })
      .select()
      .single()
    if (imgRow) setImages((prev) => [...prev, imgRow as PgImage])
    setUploading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name || !area || !location) {
      setError('PG name, area, and location are required.')
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
      nearby_college: nearbyCollege || null,
      distance_from_college: distance || null,
      description: description || null,
      contact_number: contact || null,
    }

    let pgId = id
    if (isEdit && id) {
      const { error: updateError } = await supabase.from('pgs').update(payload).eq('id', id)
      if (updateError) { setError('Could not save changes.'); setSaving(false); return }
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
      if (newImage) await handleImageUpload(newImage, newPg.id)
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
            <label className="label">PG photo</label>
            <div className="flex flex-wrap gap-3 mb-3">
              {images.map((img) => <img key={img.id} src={img.url} className="w-20 h-20 object-cover rounded-card border border-ink-100" />)}
              {newImage && <img src={URL.createObjectURL(newImage)} className="w-20 h-20 object-cover rounded-card border border-ink-100" />}
            </div>
            <input type="file" accept="image/*" disabled={uploading} onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (isEdit && id) handleImageUpload(file, id)
              else setNewImage(file)
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
