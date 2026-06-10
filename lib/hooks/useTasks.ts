'use client'

import { useMemo } from 'react'
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import type { Task, TaskPage, TaskFilters, TaskStatus, CreateTaskInput, UpdateTaskInput } from '@/lib/types'
import { apiGetTasks, apiGetTask, apiCreateTask, apiUpdateTask, apiDeleteTask } from '@/lib/api-client'

const PAGE_SIZE = 50

class NotFoundError extends Error {
  constructor() { super('Not found') }
}

// --- Query hooks ---

export function useTaskList(filters: TaskFilters) {
  const query = useInfiniteQuery({
    queryKey: ['tasks', filters] as const,
    queryFn: ({ pageParam }: { pageParam: number }) => {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.sort) params.set('sort', filters.sort)
      if (filters.parentId !== undefined) {
        params.set('parentId', filters.parentId === null ? 'null' : filters.parentId)
      }
      params.set('page', String(pageParam))
      params.set('limit', String(PAGE_SIZE))
      return apiGetTasks(params)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: TaskPage) => {
      const fetched = (lastPage.page + 1) * lastPage.limit
      return fetched < lastPage.total ? lastPage.page + 1 : undefined
    },
  })

  // Stable array reference per data version — downstream memoization depends on it
  const tasks = useMemo(
    () => query.data?.pages.flatMap((p) => p.tasks) ?? [],
    [query.data]
  )
  const total = query.data?.pages[0]?.total ?? 0

  return {
    tasks,
    total,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    isFetchingMore: query.isFetchingNextPage,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}

// Subtask stats are embedded in the task list response — no extra requests needed.
// Shared constant keeps the fallback reference-stable so memoized cards don't re-render.
const EMPTY_STATS = { total: 0, done: 0 }

export function useSubtaskStats(tasks: Task[]) {
  return useMemo(
    () => Object.fromEntries(tasks.map((task) => [task.id, task.subtaskStats ?? EMPTY_STATS])),
    [tasks]
  )
}

export function useTask(id: string) {
  const query = useQuery({
    queryKey: ['task', id] as const,
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${id}`)
      if (res.status === 404) throw new NotFoundError()
      if (!res.ok) throw new Error('Failed to fetch task')
      return res.json() as Promise<Task>
    },
    retry: (_, error) => !(error instanceof NotFoundError),
  })
  return {
    task: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof NotFoundError ? null : (query.error?.message ?? null),
    notFound: query.error instanceof NotFoundError,
    refetch: query.refetch,
  }
}

export function useSubtasks(parentId: string) {
  const query = useQuery({
    queryKey: ['subtasks', parentId] as const,
    queryFn: async () => {
      const data = await apiGetTasks(new URLSearchParams({ parentId, limit: '100' }))
      return data.tasks
    },
  })
  return {
    subtasks: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  }
}

// --- Mutation hooks ---

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTaskInput) => apiCreateTask(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['subtasks'] })
      // subtask stats are embedded in the tasks response — invalidating ['tasks'] is enough
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) => apiUpdateTask(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['task', id] })
      qc.invalidateQueries({ queryKey: ['subtasks'] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDeleteTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['subtasks'] })
      // subtask stats are embedded in the tasks response — invalidating ['tasks'] is enough
    },
  })
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      apiUpdateTask(taskId, { status }),
    onMutate: async ({ taskId, status }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      await qc.cancelQueries({ queryKey: ['task', taskId] })
      await qc.cancelQueries({ queryKey: ['subtasks'] })

      const prevLists = qc.getQueriesData<InfiniteData<TaskPage>>({ queryKey: ['tasks'] })
      const prevTask = qc.getQueryData<Task>(['task', taskId])
      const prevSubtasks = qc.getQueriesData<Task[]>({ queryKey: ['subtasks'] })

      qc.setQueriesData<InfiniteData<TaskPage>>({ queryKey: ['tasks'] }, (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            tasks: page.tasks.map((t) => t.id === taskId ? { ...t, status } : t),
          })),
        }
      })

      if (prevTask) qc.setQueryData<Task>(['task', taskId], { ...prevTask, status })

      qc.setQueriesData<Task[]>({ queryKey: ['subtasks'] }, (old) =>
        old?.map((t) => t.id === taskId ? { ...t, status } : t)
      )

      return { prevLists, prevTask, prevSubtasks }
    },
    onError: (_, __, ctx) => {
      if (!ctx) return
      ctx.prevLists.forEach(([key, data]) => qc.setQueryData(key, data))
      if (ctx.prevTask) qc.setQueryData(['task', ctx.prevTask.id], ctx.prevTask)
      ctx.prevSubtasks.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: (_, __, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['task', taskId] })
      qc.invalidateQueries({ queryKey: ['subtasks'] })
    },
  })
}
