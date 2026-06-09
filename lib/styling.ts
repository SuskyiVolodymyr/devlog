import type { TaskStatus, TaskPriority } from '@/lib/types'

export const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  'todo':        { label: 'Todo',        className: 'bg-zinc-700 text-zinc-300' },
  'in-progress': { label: 'In Progress', className: 'bg-blue-900 text-blue-300' },
  'done':        { label: 'Done',        className: 'bg-green-900 text-green-300' },
}

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; dotClass: string; textClass: string }> = {
  'high':   { label: 'High',   dotClass: 'bg-red-500',   textClass: 'text-red-400'   },
  'medium': { label: 'Medium', dotClass: 'bg-amber-500', textClass: 'text-amber-400' },
  'low':    { label: 'Low',    dotClass: 'bg-green-500', textClass: 'text-green-400' },
}

export const STATUS_OPTIONS: ReadonlyArray<{ label: string; value: TaskStatus }> = [
  { label: 'Todo',        value: 'todo'        },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Done',        value: 'done'        },
]

export const PRIORITY_OPTIONS: ReadonlyArray<{ label: string; value: TaskPriority }> = [
  { label: 'Low',    value: 'low'    },
  { label: 'Medium', value: 'medium' },
  { label: 'High',   value: 'high'   },
]
