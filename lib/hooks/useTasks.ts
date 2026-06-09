'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Task, TaskFilters } from '@/lib/types'

export function useTaskList(filters: TaskFilters) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { status, sort, parentId } = filters

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (sort) params.set('sort', sort)
    if (parentId !== undefined) params.set('parentId', parentId === null ? 'null' : parentId)
    try {
      const res = await fetch(`/api/tasks?${params}`)
      if (!res.ok) throw new Error('Failed to fetch tasks')
      setTasks(await res.json() as Task[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [status, sort, parentId])

  useEffect(() => { refetch() }, [refetch])

  return { tasks, setTasks, loading, error, refetch }
}

export function useTask(id: string) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${id}`)
      if (res.status === 404) { setNotFound(true); return }
      if (!res.ok) throw new Error('Failed to fetch task')
      setTask(await res.json() as Task)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch task')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { refetch() }, [refetch])

  return { task, setTask, loading, error, notFound, refetch }
}

export function useSubtasks(parentId: string) {
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks?parentId=${parentId}`)
      if (!res.ok) throw new Error('Failed to fetch subtasks')
      setSubtasks(await res.json() as Task[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subtasks')
    } finally {
      setLoading(false)
    }
  }, [parentId])

  useEffect(() => { refetch() }, [refetch])

  return { subtasks, loading, error, refetch }
}
