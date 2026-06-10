import Database from 'better-sqlite3'
import { nanoid } from 'nanoid'
import type { Task, TaskFilters, TaskPage, CreateTaskInput, UpdateTaskInput } from '@/lib/types'
import { DB_PATH } from '@/lib/constants'

const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in-progress', 'done')),
    priority    TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
    parent_id   TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    notes       TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL
  )
`)

// Subtask lookups and the embedded count subqueries depend on this index
db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id)')

type TaskRow = {
  id: string
  title: string
  description: string
  status: string
  priority: string
  parent_id: string | null
  notes: string
  created_at: string
  subtask_total?: number
  subtask_done?: number
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    parentId: row.parent_id,
    notes: row.notes,
    createdAt: row.created_at,
    ...(row.subtask_total !== undefined && {
      subtaskStats: { total: row.subtask_total, done: row.subtask_done ?? 0 },
    }),
  }
}

const PRIORITY_ORDER = `CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 END`

export function getTasks(filters?: TaskFilters): Task[] {
  const conditions: string[] = []
  const params: (string | null)[] = []

  if (filters?.status) {
    conditions.push('status = ?')
    params.push(filters.status)
  }

  if (filters?.parentId !== undefined) {
    if (filters.parentId === null) {
      conditions.push('parent_id IS NULL')
    } else {
      conditions.push('parent_id = ?')
      params.push(filters.parentId)
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const order =
    filters?.sort === 'priority'
      ? `ORDER BY ${PRIORITY_ORDER}, created_at DESC`
      : 'ORDER BY created_at DESC'

  const rows = db.prepare(`SELECT * FROM tasks ${where} ${order}`).all(...params) as TaskRow[]
  return rows.map(rowToTask)
}

export function getTasksPage(filters: TaskFilters, page: number, limit: number): TaskPage {
  const conditions: string[] = []
  const params: (string | null)[] = []

  if (filters?.status) {
    conditions.push('status = ?')
    params.push(filters.status)
  }

  if (filters?.parentId !== undefined) {
    if (filters.parentId === null) {
      conditions.push('parent_id IS NULL')
    } else {
      conditions.push('parent_id = ?')
      params.push(filters.parentId)
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const order =
    filters?.sort === 'priority'
      ? `ORDER BY ${PRIORITY_ORDER}, created_at DESC`
      : 'ORDER BY created_at DESC'

  const { total } = db.prepare(`SELECT COUNT(*) as total FROM tasks ${where}`).get(...params) as { total: number }
  const rows = db
    .prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM tasks s WHERE s.parent_id = t.id) AS subtask_total,
        (SELECT COUNT(*) FROM tasks s WHERE s.parent_id = t.id AND s.status = 'done') AS subtask_done
      FROM tasks t ${where} ${order} LIMIT ? OFFSET ?
    `)
    .all(...params, limit, page * limit) as TaskRow[]

  return { tasks: rows.map(rowToTask), total, page, limit }
}

export function getTask(id: string): Task | null {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined
  return row ? rowToTask(row) : null
}

export function createTask(input: CreateTaskInput): Task {
  const id = nanoid()
  const createdAt = new Date().toISOString()

  db.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, parent_id, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.title,
    input.description ?? '',
    input.status ?? 'todo',
    input.priority ?? 'medium',
    input.parentId ?? null,
    input.notes ?? '',
    createdAt,
  )

  return getTask(id) as Task
}

const UPDATABLE_COLUMNS = new Set<keyof UpdateTaskInput>(['title', 'description', 'status', 'priority', 'notes'])

export function updateTask(id: string, input: UpdateTaskInput): Task | null {
  const existing = getTask(id)
  if (!existing) return null

  const fields = (Object.keys(input) as (keyof UpdateTaskInput)[]).filter((f) => UPDATABLE_COLUMNS.has(f))
  if (fields.length === 0) return existing

  const setClauses = fields.map((f) => `${f} = ?`)
  const values = fields.map((f) => input[f] ?? null)

  db.prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`).run(...values, id)

  return getTask(id)
}

export function deleteTask(id: string): boolean {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  return result.changes > 0
}

export function getSubtasks(parentId: string): Task[] {
  const rows = db
    .prepare('SELECT * FROM tasks WHERE parent_id = ? ORDER BY created_at DESC')
    .all(parentId) as TaskRow[]
  return rows.map(rowToTask)
}
