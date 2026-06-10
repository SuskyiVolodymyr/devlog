'use client'

import { useState, useEffect, useRef } from 'react'
import type { Task, TaskStatus, TaskPriority, CreateTaskInput, UpdateTaskInput } from '@/lib/types'
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '@/lib/styling'
import { apiImproveTask } from '@/lib/api-client'

interface TaskFormProps {
  task?: Task
  onSubmit: (input: CreateTaskInput | UpdateTaskInput) => void
  onClose: () => void
  parentId?: string
}

export default function TaskForm({ task, onSubmit, onClose, parentId }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [improving, setImproving] = useState(false)
  const [improveError, setImproveError] = useState<string | null>(null)
  const [original, setOriginal] = useState<{ title: string; description: string } | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const isEdit = Boolean(task)

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Focus trap
  useEffect(() => {
    const modal = modalRef.current
    if (!modal) return
    const focusable = Array.from(
      modal.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
    )
    focusable[0]?.focus()

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
    modal.addEventListener('keydown', handleTab)
    return () => modal.removeEventListener('keydown', handleTab)
  }, [])

  async function handleImprove() {
    if (!title.trim() || improving) return
    setImproving(true)
    setImproveError(null)
    try {
      const improved = await apiImproveTask({ title: title.trim(), description })
      setOriginal({ title, description })
      setTitle(improved.title)
      setDescription(improved.description)
    } catch (err) {
      setImproveError(err instanceof Error ? err.message : 'Failed to improve task')
    } finally {
      setImproving(false)
    }
  }

  function handleUndoImprove() {
    if (!original) return
    setTitle(original.title)
    setDescription(original.description)
    setOriginal(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    if (isEdit) {
      const update: UpdateTaskInput = { title: title.trim(), description, status, priority }
      onSubmit(update)
    } else {
      const create: CreateTaskInput = {
        title: title.trim(),
        description: description || undefined,
        status,
        priority,
        parentId: parentId ?? undefined,
      }
      onSubmit(create)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div ref={modalRef} className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-700 px-5 py-4">
          <h2 className="text-base font-semibold text-zinc-100">
            {isEdit ? 'Edit Task' : parentId ? 'Add Subtask' : 'New Task'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-title" className="text-sm font-medium text-zinc-300">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="task-description" className="text-sm font-medium text-zinc-300">
                Description
              </label>
              <div className="flex items-center gap-2">
                {original && !improving && (
                  <button
                    type="button"
                    onClick={handleUndoImprove}
                    className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                  >
                    Undo
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleImprove}
                  disabled={!title.trim() || improving}
                  className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-blue-600/60 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {improving ? (
                    <svg className="h-3 w-3 animate-spin text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                    </svg>
                  )}
                  {improving ? 'Improving…' : 'Improve with AI'}
                </button>
              </div>
            </div>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more context..."
              rows={3}
              className="resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {improveError && <p className="text-xs text-red-400">{improveError}</p>}
          </div>

          {/* Status + Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="task-status" className="text-sm font-medium text-zinc-300">
                Status
              </label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="task-priority" className="text-sm font-medium text-zinc-300">
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
