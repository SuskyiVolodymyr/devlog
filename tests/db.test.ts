import { describe, it, expect, beforeEach } from 'vitest'
import {
  getTasks,
  getTasksPage,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getSubtasks,
} from '@/lib/db'
import type { UpdateTaskInput } from '@/lib/types'

beforeEach(() => {
  // Deleting top-level tasks cascades to all subtasks
  for (const task of getTasks({ parentId: null })) deleteTask(task.id)
})

describe('createTask / getTask', () => {
  it('round-trips a task with defaults applied', () => {
    const created = createTask({ title: 'Test task' })
    const fetched = getTask(created.id)
    expect(fetched).not.toBeNull()
    expect(fetched).toMatchObject({
      title: 'Test task',
      description: '',
      status: 'todo',
      priority: 'medium',
      parentId: null,
      notes: '',
    })
    expect(fetched!.createdAt).toBeTruthy()
  })

  it('returns null for an unknown id', () => {
    expect(getTask('nope')).toBeNull()
  })
})

describe('updateTask', () => {
  it('updates allowed fields', () => {
    const task = createTask({ title: 'Before' })
    const updated = updateTask(task.id, { title: 'After', status: 'done', priority: 'high' })
    expect(updated).toMatchObject({ title: 'After', status: 'done', priority: 'high' })
  })

  it('returns null for an unknown id', () => {
    expect(updateTask('nope', { title: 'x' })).toBeNull()
  })

  it('ignores fields outside the allowlist', () => {
    const parent = createTask({ title: 'Parent' })
    const child = createTask({ title: 'Child', parentId: parent.id })
    // Simulate a malicious payload that slipped past the API boundary
    const sneaky = { title: 'Renamed', id: 'hijacked', parent_id: null } as unknown as UpdateTaskInput
    const updated = updateTask(child.id, sneaky)
    expect(updated).toMatchObject({ id: child.id, title: 'Renamed', parentId: parent.id })
  })
})

describe('deleteTask', () => {
  it('deletes and reports whether anything was removed', () => {
    const task = createTask({ title: 'Doomed' })
    expect(deleteTask(task.id)).toBe(true)
    expect(getTask(task.id)).toBeNull()
    expect(deleteTask(task.id)).toBe(false)
  })

  it('cascades to subtasks', () => {
    const parent = createTask({ title: 'Parent' })
    const child = createTask({ title: 'Child', parentId: parent.id })
    deleteTask(parent.id)
    expect(getTask(child.id)).toBeNull()
  })
})

describe('filters and sorting', () => {
  it('filters by status', () => {
    createTask({ title: 'A', status: 'todo' })
    createTask({ title: 'B', status: 'done' })
    const done = getTasks({ status: 'done' })
    expect(done).toHaveLength(1)
    expect(done[0].title).toBe('B')
  })

  it('parentId: null returns only top-level tasks', () => {
    const parent = createTask({ title: 'Parent' })
    createTask({ title: 'Child', parentId: parent.id })
    const topLevel = getTasks({ parentId: null })
    expect(topLevel).toHaveLength(1)
    expect(topLevel[0].id).toBe(parent.id)
  })

  it('sorts by priority high → medium → low', () => {
    createTask({ title: 'low', priority: 'low' })
    createTask({ title: 'high', priority: 'high' })
    createTask({ title: 'medium', priority: 'medium' })
    const sorted = getTasks({ sort: 'priority' })
    expect(sorted.map((t) => t.priority)).toEqual(['high', 'medium', 'low'])
  })
})

describe('getTasksPage', () => {
  it('paginates with a correct total', () => {
    for (let i = 0; i < 5; i++) createTask({ title: `Task ${i}` })
    const page0 = getTasksPage({ parentId: null }, 0, 2)
    const page2 = getTasksPage({ parentId: null }, 2, 2)
    expect(page0.total).toBe(5)
    expect(page0.tasks).toHaveLength(2)
    expect(page2.tasks).toHaveLength(1)
  })

  it('embeds subtask stats so the board needs no extra requests', () => {
    const parent = createTask({ title: 'Parent' })
    createTask({ title: 'Sub 1', parentId: parent.id, status: 'done' })
    createTask({ title: 'Sub 2', parentId: parent.id, status: 'todo' })
    const page = getTasksPage({ parentId: null }, 0, 50)
    const row = page.tasks.find((t) => t.id === parent.id)
    expect(row?.subtaskStats).toEqual({ total: 2, done: 1 })
  })
})

describe('getSubtasks', () => {
  it('returns only children of the given parent', () => {
    const parentA = createTask({ title: 'A' })
    const parentB = createTask({ title: 'B' })
    createTask({ title: 'A child', parentId: parentA.id })
    createTask({ title: 'B child', parentId: parentB.id })
    const subtasks = getSubtasks(parentA.id)
    expect(subtasks).toHaveLength(1)
    expect(subtasks[0].title).toBe('A child')
  })
})
