'use client'

import { useRouter } from 'next/navigation'
import type { Task, TaskStatus } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import PriorityBadge from '@/components/PriorityBadge'

interface TaskCardProps {
  task: Task
  subtaskCount?: number
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  compact?: boolean
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

export default function TaskCard({
  task,
  subtaskCount = 0,
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
    const cycle: TaskStatus[] = ['todo', 'in-progress', 'done']
    const next = cycle[(cycle.indexOf(task.status) + 1) % cycle.length]
    onStatusChange(task.id, next)
  }

  return (
    <div
      onClick={handleCardClick}
      className="group relative cursor-pointer rounded-lg border border-zinc-700/60 bg-zinc-800/50 p-4 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
    >
      {/* Action buttons — visible on hover */}
      <div
        data-action
        className="absolute right-3 top-3 hidden items-center gap-1 group-hover:flex"
      >
        <button
          data-action
          onClick={(e) => { e.stopPropagation(); onEdit(task) }}
          className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
          aria-label="Edit task"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
        <button
          data-action
          onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
          className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-900/50 hover:text-red-400"
          aria-label="Delete task"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className={`font-medium text-zinc-100 leading-snug pr-16 ${compact ? 'text-sm' : ''}`}>
          {task.title}
        </h3>

        {!compact && task.description && (
          <p className="line-clamp-2 text-sm text-zinc-400">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            data-action
            onClick={handleStatusCycle}
            className="shrink-0"
            aria-label="Cycle status"
          >
            <StatusBadge status={task.status} />
          </button>
          <PriorityBadge priority={task.priority} />
          {subtaskCount > 0 && (
            <span className="text-xs text-zinc-500">
              {subtaskCount} subtask{subtaskCount === 1 ? '' : 's'}
            </span>
          )}
          <span className="ml-auto text-xs text-zinc-500">
            {relativeTime(task.createdAt)}
          </span>
        </div>
      </div>
    </div>
  )
}
