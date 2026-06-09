import Badge from '@/components/Badge'
import { STATUS_CONFIG } from '@/lib/styling'
import type { TaskStatus } from '@/lib/types'

export default function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, className } = STATUS_CONFIG[status]
  return <Badge label={label} className={className} />
}
