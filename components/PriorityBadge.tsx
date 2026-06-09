'use client'

import type { TaskPriority } from '@/lib/types'

interface PriorityBadgeProps {
  priority: TaskPriority
}

const priorityConfig: Record<TaskPriority, { label: string; dotClass: string; textClass: string }> = {
  'high': { label: 'High', dotClass: 'bg-red-500', textClass: 'text-red-400' },
  'medium': { label: 'Medium', dotClass: 'bg-amber-500', textClass: 'text-amber-400' },
  'low': { label: 'Low', dotClass: 'bg-green-500', textClass: 'text-green-400' },
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const { label, dotClass, textClass } = priorityConfig[priority]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textClass}`}>
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      {label}
    </span>
  )
}
