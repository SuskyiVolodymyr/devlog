'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Task, TaskStatus, TaskFilters, CreateTaskInput, UpdateTaskInput } from '@/lib/types'
import TaskCard from '@/components/TaskCard'
import FilterBar from '@/components/FilterBar'
import TaskForm from '@/components/TaskForm'
import AIPanel from '@/components/AIPanel'

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [subtaskCounts, setSubtaskCounts] = useState<Record<string, number>>({})
  const [filters, setFilters] = useState<TaskFilters>({ parentId: null, sort: 'date' })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.sort) params.set('sort', filters.sort)
    // Fetch top-level tasks only on the main page
    params.set('parentId', 'null')

    try {
      const res = await fetch(`/api/tasks?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch tasks')
      const data = await res.json() as Task[]
      setTasks(data)
    } catch {
      // silently handle; could add toast here
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Fetch subtask counts for each top-level task
  const fetchSubtaskCounts = useCallback(async (taskList: Task[]) => {
    const counts: Record<string, number> = {}
    await Promise.all(
      taskList.map(async (task) => {
        try {
          const res = await fetch(`/api/tasks?parentId=${task.id}`)
          if (res.ok) {
            const subs = await res.json() as Task[]
            counts[task.id] = subs.length
          }
        } catch {
          // ignore individual failures
        }
      })
    )
    setSubtaskCounts(counts)
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  useEffect(() => {
    if (tasks.length > 0) fetchSubtaskCounts(tasks)
  }, [tasks, fetchSubtaskCounts])

  async function handleCreate(input: CreateTaskInput | UpdateTaskInput) {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      setShowForm(false)
      fetchTasks()
    } catch {
      // ignore
    }
  }

  async function handleUpdate(input: CreateTaskInput | UpdateTaskInput) {
    if (!editingTask) return
    try {
      await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      setEditingTask(undefined)
      setShowForm(false)
      fetchTasks()
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      fetchTasks()
    } catch {
      // ignore
    }
  }

  async function handleStatusChange(id: string, status: TaskStatus) {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      fetchTasks()
    } catch {
      // ignore
    }
  }

  function openEdit(task: Task) {
    setEditingTask(task)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingTask(undefined)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-zinc-100">DevLog</span>
            <span className="hidden rounded-full bg-blue-900/60 px-2 py-0.5 text-xs font-medium text-blue-300 sm:inline">
              AI-powered
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile AI toggle */}
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
            <button
              onClick={() => { setEditingTask(undefined); setShowForm(true) }}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              + New Task
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        {/* Main task list */}
        <main className="flex min-w-0 flex-1 flex-col gap-5">
          <FilterBar filters={filters} onChange={setFilters} />

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="h-6 w-6 animate-spin text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <p className="text-zinc-500">No tasks yet.</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-sm text-blue-400 underline-offset-2 hover:underline"
              >
                Create your first task
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  subtaskCount={subtaskCounts[task.id] ?? 0}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </main>

        {/* Desktop AI sidebar */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-20">
            <AIPanel />
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
            className="absolute right-0 top-0 h-full w-80 overflow-y-auto bg-zinc-900 p-4 shadow-2xl"
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
            <AIPanel />
          </div>
        </div>
      )}

      {/* Task create/edit modal */}
      {showForm && (
        <TaskForm
          task={editingTask}
          onSubmit={editingTask ? handleUpdate : handleCreate}
          onClose={closeForm}
        />
      )}
    </div>
  )
}
