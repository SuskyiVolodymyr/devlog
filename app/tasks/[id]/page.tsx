'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  useTask,
  useSubtasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useUpdateTaskStatus,
} from '@/lib/hooks/useTasks'
import type { Task, TaskStatus, CreateTaskInput, UpdateTaskInput } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import PriorityBadge from '@/components/PriorityBadge'
import TaskCard from '@/components/TaskCard'
import TaskForm from '@/components/TaskForm'
import AIPanel from '@/components/AIPanel'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { task, loading, error: fetchError, notFound, refetch: fetchTask } = useTask(id)
  const { subtasks, refetch: fetchSubtasks } = useSubtasks(id)

  const createTaskMutation = useCreateTask()
  const updateTaskMutation = useUpdateTask()
  const deleteTaskMutation = useDeleteTask()
  const updateStatusMutation = useUpdateTaskStatus()

  const [notesValue, setNotesValue] = useState('')
  const [showSubtaskForm, setShowSubtaskForm] = useState(false)
  const [editingSubtask, setEditingSubtask] = useState<Task | undefined>(undefined)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  // Only initialize notes once on first load — don't reset while user is editing
  const notesInitialized = useRef(false)
  useEffect(() => {
    if (task && !notesInitialized.current) {
      setNotesValue(task.notes ?? '')
      notesInitialized.current = true
    }
  }, [task])

  // Redirect on not found
  useEffect(() => {
    if (notFound) router.push('/')
  }, [notFound, router])

  // Escape key dismisses mobile AI panel
  useEffect(() => {
    if (!aiPanelOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAiPanelOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aiPanelOpen])

  const handleNotesBlur = useCallback(() => {
    if (!task || notesValue === task.notes) return
    updateTaskMutation.mutate({ id, input: { notes: notesValue } }, {
      onError: () => setMutationError('Failed to save notes'),
    })
  }, [id, task, notesValue, updateTaskMutation])

  const handleStatusChange = useCallback((taskId: string, status: TaskStatus) => {
    updateStatusMutation.mutate({ taskId, status }, {
      onError: () => setMutationError('Failed to update status'),
    })
  }, [updateStatusMutation])

  const handleCreateSubtask = useCallback((input: CreateTaskInput | UpdateTaskInput) => {
    setMutationError(null)
    createTaskMutation.mutate({ ...(input as CreateTaskInput), parentId: id }, {
      onSuccess: () => setShowSubtaskForm(false),
      onError: (err) => setMutationError(err instanceof Error ? err.message : 'Failed to create subtask'),
    })
  }, [id, createTaskMutation])

  const handleUpdateSubtask = useCallback((input: CreateTaskInput | UpdateTaskInput) => {
    if (!editingSubtask) return
    setMutationError(null)
    updateTaskMutation.mutate({ id: editingSubtask.id, input: input as UpdateTaskInput }, {
      onSuccess: () => { setEditingSubtask(undefined); setShowSubtaskForm(false) },
      onError: (err) => setMutationError(err instanceof Error ? err.message : 'Failed to update subtask'),
    })
  }, [editingSubtask, updateTaskMutation])

  const handleDeleteSubtask = useCallback((subtaskId: string) => {
    setMutationError(null)
    deleteTaskMutation.mutate(subtaskId, {
      onError: (err) => setMutationError(err instanceof Error ? err.message : 'Failed to delete subtask'),
    })
  }, [deleteTaskMutation])

  const openEditSubtask = useCallback((t: Task) => {
    setEditingSubtask(t)
    setShowSubtaskForm(true)
  }, [])

  const closeSubtaskForm = useCallback(() => {
    setShowSubtaskForm(false)
    setEditingSubtask(undefined)
  }, [])

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center bg-zinc-950">
        <svg className="h-6 w-6 animate-spin text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (!loading && fetchError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950">
        <p className="text-zinc-500">{fetchError}</p>
        <button onClick={() => fetchTask()} className="text-sm text-blue-400 underline-offset-2 hover:underline">
          Retry
        </button>
      </div>
    )
  }

  if (!task) return null

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-3 sm:px-6">
          <div className="flex flex-1 items-center">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back
            </button>
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-100">DevLog</span>
          {/* Mobile AI toggle */}
          <div className="flex flex-1 justify-end">
            <button
              onClick={() => setAiPanelOpen(!aiPanelOpen)}
              aria-label="Toggle AI panel"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100 lg:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
              </svg>
              AI
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        {/* Main content */}
        <main className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Task header */}
          <section className="flex flex-col gap-3 rounded-xl border border-zinc-700/60 bg-zinc-800/40 p-5">
            <h1 className="text-2xl font-semibold leading-snug text-zinc-100">
              {task.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
            </div>

            {task.description && (
              <p className="text-sm leading-relaxed text-zinc-400">{task.description}</p>
            )}
          </section>

          {mutationError && (
            <div role="alert" className="rounded-lg border border-red-800/50 bg-red-900/20 px-3 py-2 text-sm text-red-400">
              {mutationError}
              <button className="ml-2 underline text-xs" onClick={() => setMutationError(null)}>Dismiss</button>
            </div>
          )}

          {/* Notes */}
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Notes</h2>
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add execution notes, links, or context..."
              rows={5}
              className="resize-none rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-zinc-600">Auto-saves on blur</p>
          </section>

          {/* Subtasks */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Subtasks {subtasks.length > 0 && <span className="ml-1 text-zinc-600">({subtasks.length})</span>}
              </h2>
              <button
                onClick={() => { setEditingSubtask(undefined); setShowSubtaskForm(true) }}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
              >
                + Add Subtask
              </button>
            </div>

            {subtasks.length === 0 ? (
              <p className="py-4 text-sm text-zinc-600">No subtasks yet. Break this task down.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {subtasks.map((sub) => (
                  <TaskCard
                    key={sub.id}
                    task={sub}
                    onEdit={openEditSubtask}
                    onDelete={handleDeleteSubtask}
                    onStatusChange={handleStatusChange}
                    compact
                  />
                ))}
              </div>
            )}
          </section>
        </main>

        {/* Desktop AI sidebar */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-20">
            <AIPanel taskId={id} onRefresh={fetchSubtasks} />
          </div>
        </aside>
      </div>

      {/* Mobile AI panel slide-over */}
      {aiPanelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setAiPanelOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-full overflow-y-auto bg-zinc-900 p-4 shadow-2xl sm:w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => setAiPanelOpen(false)}
                className="rounded p-1 text-zinc-500 hover:text-zinc-300"
                aria-label="Close AI panel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <AIPanel taskId={id} onRefresh={fetchSubtasks} />
          </div>
        </div>
      )}

      {/* Subtask form modal */}
      {showSubtaskForm && (
        <TaskForm
          task={editingSubtask}
          onSubmit={editingSubtask ? handleUpdateSubtask : handleCreateSubtask}
          onClose={closeSubtaskForm}
          parentId={id}
        />
      )}
    </div>
  )
}
