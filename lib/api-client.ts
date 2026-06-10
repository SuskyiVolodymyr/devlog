import type { Task, TaskPage, CreateTaskInput, UpdateTaskInput } from '@/lib/types'

/** Extracts the error message from a non-ok Response, falling back to a default. */
export async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json() as { error?: unknown }
    if (typeof body.error === 'string' && body.error) return body.error
  } catch {
    // body wasn't JSON
  }
  return fallback
}

export async function apiGetTasks(params: URLSearchParams): Promise<TaskPage> {
  const res = await fetch(`/api/tasks?${params}`)
  if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch tasks'))
  return res.json() as Promise<TaskPage>
}

export async function apiGetTask(id: string): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`)
  if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch task'))
  return res.json() as Promise<Task>
}

export async function apiCreateTask(input: CreateTaskInput): Promise<Task> {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await parseApiError(res, 'Failed to create task'))
  return res.json() as Promise<Task>
}

export async function apiUpdateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await parseApiError(res, 'Failed to update task'))
  return res.json() as Promise<Task>
}

export async function apiDeleteTask(id: string): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await parseApiError(res, 'Failed to delete task'))
}

export type ImprovedTask = { title: string; description: string }

export async function apiImproveTask(input: ImprovedTask): Promise<ImprovedTask> {
  const res = await fetch('/api/ai/improve-task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await parseApiError(res, 'Failed to improve task'))
  return res.json() as Promise<ImprovedTask>
}
