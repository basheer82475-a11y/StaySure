export type Role = 'student' | 'partner' | 'admin'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: Role
  status: 'active' | 'suspended'
  created_at: string
}

export interface PgPartner {
  id: string
  profile_id: string
  business_name: string | null
  verified: boolean
  created_at: string
}

export type PgStatus = 'pending' | 'approved' | 'rejected'

export interface Pg {
  id: string
  partner_id: string
  name: string
  area: string
  location: string
  full_address: string | null
  pincode: string | null
  transport_available: boolean
  nearby_college: string | null
  distance_from_college: string | null
  description: string | null
  contact_number: string | null
  owner_name: string | null
  status: PgStatus
  created_at: string
  updated_at: string
}

export interface PgImage {
  id: string
  pg_id: string
  url: string
  sort_order: number
}

export interface Amenity {
  id: string
  name: string
  icon: string | null
}

export interface Floor {
  id: string
  pg_id: string
  floor_number: number
  label: string | null
  available_seats: number | null
}

export type SharingType = 1 | 2 | 3 | 4 | 5

export interface Room {
  id: string
  floor_id: string
  pg_id: string
  room_number: string
  sharing_type: SharingType
  ac: boolean
}

export type BedStatus = 'available' | 'taken'

export interface Bed {
  id: string
  room_id: string
  bed_label: string
  status: BedStatus
}

export type RequestStatus = 'pending' | 'accepted' | 'rejected'

export interface BedRequest {
  id: string
  student_id: string
  pg_id: string
  room_id: string
  bed_id: string
  status: RequestStatus
  created_at: string
  updated_at: string
}

export interface PgReview {
  id: string
  pg_id: string
  student_id: string
  rating: number
  comment: string
  created_at: string
  updated_at: string
}

// Convenience joined shapes used by the UI
export interface PgWithExtras extends Pg {
  pg_images: PgImage[]
  pg_amenities: { amenity: Amenity }[]
  available_beds_count?: number
}

export interface BedRequestWithDetails extends BedRequest {
  pg: Pick<Pg, 'id' | 'name' | 'area'>
  room: Pick<Room, 'id' | 'room_number' | 'sharing_type' | 'ac'>
  bed: Pick<Bed, 'id' | 'bed_label'>
  student?: Pick<Profile, 'id' | 'full_name' | 'phone'>
}
