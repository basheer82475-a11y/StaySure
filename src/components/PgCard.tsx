import { Link } from 'react-router-dom'
import { MapPin, BadgeCheck, Images, Users } from 'lucide-react'
import { PgWithExtras } from '@/types'

export default function PgCard({ pg }: { pg: PgWithExtras }) {
  const image = pg.pg_images?.[0]?.url

  return (
    <div className="card flex flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(28,63,56,0.12)]">
      <div className="h-44 overflow-hidden bg-ink-100 sm:h-48">
        {image ? (
          <img src={image} alt={pg.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-300 text-xs">No image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-ink-900 leading-tight">{pg.name}</h3>
          <span className="badge-green shrink-0">
            <BadgeCheck size={12} /> Verified
          </span>
        </div>

        <p className="text-sm text-ink-500 flex items-center gap-1">
          <MapPin size={14} /> {pg.area}
          {pg.distance_from_college ? ` · ${pg.distance_from_college} from college` : ''}
        </p>

        <p className="text-sm text-ink-500 flex items-center gap-1">
          <Users size={14} />
          {typeof pg.available_beds_count === 'number'
            ? `${pg.available_beds_count} beds available`
            : 'Checking availability...'}
        </p>

        <div className="mt-auto space-y-2 pt-3">
          <Link to={`/pg/${pg.id}`} className="btn-primary btn-sm w-full">
            View Details
          </Link>
          {pg.pg_images.length > 1 && (
            <Link to={`/pg/${pg.id}#gallery`} className="btn-secondary btn-sm w-full">
              <Images size={14} /> Show more photos ({pg.pg_images.length})
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
