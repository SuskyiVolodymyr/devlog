import { type NextRequest } from 'next/server'
import { getTasksPage, createTask } from '@/lib/db'
import { TASK_STATUSES } from '@/lib/constants'
import type { TaskFilters, TaskStatus } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status') as TaskStatus | null
    const sort = searchParams.get('sort') as TaskFilters['sort'] | null
    // Query params are always strings; "null" is the sentinel for top-level tasks
    const parentIdRaw = searchParams.has('parentId') ? searchParams.get('parentId') : undefined
    const parentId = parentIdRaw === 'null' ? null : parentIdRaw

    if (status && !TASK_STATUSES.includes(status as TaskStatus)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 })
    }
    if (sort && !['priority', 'date'].includes(sort)) {
      return Response.json({ error: 'Invalid sort' }, { status: 400 })
    }

    const pageParam = searchParams.get('page')
    const limitParam = searchParams.get('limit')
    const page = pageParam ? Math.max(0, parseInt(pageParam, 10)) : 0
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 50

    const filters: TaskFilters = {}
    if (status) filters.status = status as TaskStatus
    if (sort) filters.sort = sort as TaskFilters['sort']
    if (parentId !== undefined) filters.parentId = parentId

    return Response.json(getTasksPage(filters, page, limit))
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
    if (body.title.length > 200) {
      return Response.json({ error: 'Title must be 200 characters or less' }, { status: 400 })
    }
    if (body.description && typeof body.description === 'string' && body.description.length > 5000) {
      return Response.json({ error: 'Description must be 5000 characters or less' }, { status: 400 })
    }

    const task = createTask(body)
    return Response.json(task, { status: 201 })
  } catch {
    return Response.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
