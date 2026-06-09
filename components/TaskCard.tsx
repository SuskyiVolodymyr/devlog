'use client'

import { memo } from 'react'
import { useRouter } from 'next/navigation'
import type { Task, TaskStatus } from '@/lib/types'
import { TASK_STATUSES } from '@/lib/constants'
import StatusBadge from '@/components/StatusBadge'
import PriorityBadge from '@/components/PriorityBadge'

interface SubtaskStats {
  total: number
  done: number
}

interface TaskCardProps {
  task: Task
  subtaskStats?: SubtaskStats
  index?: number
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  compact?: boolean
}

const PRIORITY_BORDER: Record<string, string> = {
  high:   'border-l-red-500',
  medium: 'border-l-amber-500',
  low:    'border-l-zinc-600',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  return `${months} month${months === 1 ? '' : 's'} ago`
}

function TaskCard({
  task,
  subtaskStats,
  index,
  onEdit,
  onDelete,
  onStatusChange,
  compact = false,
}: TaskCardProps) {
  const router = useRouter()

  function handleCardClick(e: React.MouseEvent) {
    // Don't navigate if clicking action buttons
    if ((e.target as HTMLElement).closest('[data-action]')) return
    router.push(`/tasks/${task.id}`)
  }

  function handleStatusCycle(e: React.MouseEvent) {
    e.stopPropagation()
    const next = TASK_STATUSES[(TASK_STATUSES.indexOf(task.status) + 1) % TASK_STATUSES.length]
    onStatusChange(task.id, next)
  }

  const hasSubtasks = !compact && subtaskStats && subtaskStats.total > 0
  const allDone = hasSubtasks && subtaskStats!.done === subtaskStats!.total
  const progressPct = hasSubtasks ? (subtaskStats!.done / subtaskStats!.total) * 100 : 0

  return (
    <div
      onClick={handleCardClick}
      className={[
        'group relative flex h-full cursor-pointer flex-col rounded-lg border border-l-2 border-zinc-700/60 bg-zinc-800/50 p-4 transition-colors hover:border-zinc-600 hover:bg-zinc-800',
        PRIORITY_BORDER[task.priority] ?? 'border-l-zinc-600',
        task.status === 'done' ? 'opacity-60' : '',
        !compact ? 'animate-[taskCardIn_0.4s_ease_both]' : '',
      ].join(' ')}
      style={!compact && index !== undefined ? { animationDelay: `${Math.min(index * 40, 400)}ms` } : undefined}
    >
      {/* Action buttons — visible on hover */}
      <div
        data-action
        className="absolute right-3 top-3 hidden items-center gap-1 group-hover:flex"
      >
        <button
          data-action
          onClick={(e) => { e.stopPropagation(); onEdit(task) }}
          className="rounded p-2 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
          aria-label="Edit task"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
        <button
          data-action
          onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
          className="rounded p-2 text-zinc-400 transition-colors hover:bg-red-900/50 hover:text-red-400"
          aria-label="Delete task"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <h3 className={`pr-16 font-medium leading-snug text-zinc-100 ${compact ? 'text-sm' : ''}`}>
          {task.title}
        </h3>

        {!compact && task.description && (
          <p className="line-clamp-2 flex-1 text-sm text-zinc-400">
            {task.description}
          </p>
        )}

        {/* Subtask progress bar */}
        {hasSubtasks && (
          <div className="flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="shrink-0 tabular-nums text-xs text-zinc-500">
              {subtaskStats!.done}/{subtaskStats!.total}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              data-action
              onClick={handleStatusCycle}
              className="shrink-0"
              aria-label="Cycle status"
            >
              <StatusBadge status={task.status} />
            </button>
            <PriorityBadge priority={task.priority} />
          </div>
          <span className="shrink-0 text-xs text-zinc-500">
            {relativeTime(task.createdAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default memo(TaskCard)
