export type TaskStatus = 'todo' | 'in-progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  parentId: string | null
  notes: string
  createdAt: string // ISO 8601
}

export interface CreateTaskInput {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  parentId?: string | null
  notes?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  notes?: string
}

export interface TaskFilters {
  status?: TaskStatus
  parentId?: string | null // null = top-level only, string = subtasks of that id
  sort?: 'priority' | 'date'
}

export interface TaskPage {
  tasks: Task[]
  total: number
  page: number
  limit: number
}
