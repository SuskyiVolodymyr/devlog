'use client'

import type { TaskStatus } from '@/lib/types'

interface StatusBadgeProps {
  status: TaskStatus
}

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  'todo': { label: 'Todo', className: 'bg-zinc-700 text-zinc-300' },
  'in-progress': { label: 'In Progress', className: 'bg-blue-900 text-blue-300' },
  'done': { label: 'Done', className: 'bg-green-900 text-green-300' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = statusConfig[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
