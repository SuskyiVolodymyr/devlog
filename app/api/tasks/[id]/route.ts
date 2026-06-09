import { type NextRequest } from 'next/server'
import { getTask, updateTask, deleteTask } from '@/lib/db'
import { updateTaskSchema } from '@/lib/schemas'

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
    const result = updateTaskSchema.safeParse(body)
    if (!result.success) {
      return Response.json({ error: result.error.issues[0].message }, { status: 400 })
    }
    const task = updateTask(id, result.data)
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
