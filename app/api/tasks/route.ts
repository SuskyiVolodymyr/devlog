import { type NextRequest } from 'next/server'
import { getTasks, createTask } from '@/lib/db'
import type { TaskFilters, TaskStatus } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status') as TaskStatus | null
    const sort = searchParams.get('sort') as TaskFilters['sort'] | null
    const parentId = searchParams.has('parentId')
      ? (searchParams.get('parentId') ?? null)
      : undefined

    const filters: TaskFilters = {}
    if (status) filters.status = status
    if (sort) filters.sort = sort
    if (parentId !== undefined) filters.parentId = parentId

    const tasks = getTasks(filters)
    return Response.json(tasks)
  } catch {
    return Response.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      return Response.json({ error: 'title is required' }, { status: 400 })
    }

    const task = createTask(body)
    return Response.json(task, { status: 201 })
  } catch {
    return Response.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
