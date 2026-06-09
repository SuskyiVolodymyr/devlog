import { type NextRequest } from 'next/server'
import { getTasksPage, createTask } from '@/lib/db'
import { createTaskSchema } from '@/lib/schemas'
import type { TaskFilters, TaskStatus } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const statusRaw = searchParams.get('status')
    const sortRaw = searchParams.get('sort')
    const parentIdRaw = searchParams.has('parentId') ? searchParams.get('parentId') : undefined
    const parentId = parentIdRaw === 'null' ? null : parentIdRaw

    const status = statusRaw
      ? (['todo', 'in-progress', 'done'] as const).find((s) => s === statusRaw)
      : undefined
    if (statusRaw && !status) return Response.json({ error: 'Invalid status' }, { status: 400 })

    const sort = sortRaw
      ? (['priority', 'date'] as const).find((s) => s === sortRaw)
      : undefined
    if (sortRaw && !sort) return Response.json({ error: 'Invalid sort' }, { status: 400 })

    const pageRaw = searchParams.get('page')
    const limitRaw = searchParams.get('limit')
    const page = pageRaw ? Math.max(0, parseInt(pageRaw, 10)) : 0
    const limit = limitRaw ? Math.min(100, Math.max(1, parseInt(limitRaw, 10))) : 50

    const filters: TaskFilters = {}
    if (status) filters.status = status as TaskStatus
    if (sort) filters.sort = sort
    if (parentId !== undefined) filters.parentId = parentId

    return Response.json(getTasksPage(filters, page, limit))
  } catch {
    return Response.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = createTaskSchema.safeParse(body)
    if (!result.success) {
      return Response.json({ error: result.error.issues[0].message }, { status: 400 })
    }
    const task = createTask(result.data)
    return Response.json(task, { status: 201 })
  } catch {
    return Response.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
