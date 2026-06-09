'use client'

import Badge from '@/components/Badge'
import type { TaskStatus } from '@/lib/types'

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  'todo': { label: 'Todo', className: 'bg-zinc-700 text-zinc-300' },
  'in-progress': { label: 'In Progress', className: 'bg-blue-900 text-blue-300' },
  'done': { label: 'Done', className: 'bg-green-900 text-green-300' },
}

export default function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, className } = statusConfig[status]
  return <Badge label={label} className={className} />
}
