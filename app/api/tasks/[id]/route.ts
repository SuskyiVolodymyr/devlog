import { type NextRequest } from 'next/server'
import { getTask, updateTask, deleteTask } from '@/lib/db'
import { TASK_STATUSES, TASK_PRIORITIES } from '@/lib/constants'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const task = getTask(id)
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 })
    return Response.json(task)
  } catch {
    return Response.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }
    if (body.status !== undefined && !TASK_STATUSES.includes(body.status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 })
    }
    if (body.priority !== undefined && !TASK_PRIORITIES.includes(body.priority)) {
      return Response.json({ error: 'Invalid priority' }, { status: 400 })
    }
    const task = updateTask(id, body)
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 })
    return Response.json(task)
  } catch {
    return Response.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const deleted = deleteTask(id)
    if (!deleted) return Response.json({ error: 'Task not found' }, { status: 404 })
    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
