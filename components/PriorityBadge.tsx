import { PRIORITY_CONFIG } from '@/lib/styling'
import type { TaskPriority } from '@/lib/types'

export default function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { label, dotClass, textClass } = PRIORITY_CONFIG[priority]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textClass}`}>
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      {label}
    </span>
  )
}
