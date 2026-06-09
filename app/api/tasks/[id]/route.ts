import { type NextRequest } from 'next/server'
import { getTask, updateTask, deleteTask } from '@/lib/db'

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
