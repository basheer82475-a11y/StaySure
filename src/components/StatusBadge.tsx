import { RequestStatus, PgStatus } from '@/types'

export default function StatusBadge({ status }: { status: RequestStatus | PgStatus | string }) {
  const map: Record<string, string> = {
    pending: 'badge-amber',
    accepted: 'badge-green',
    approved: 'badge-green',
    rejected: 'badge-red',
  }
  const cls = map[status] ?? 'badge-gray'
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return <span className={cls}>{label}</span>
}
