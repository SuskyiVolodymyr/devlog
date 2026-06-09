'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Task, TaskFilters } from '@/lib/types'
import { apiGetTasks, apiGetTask } from '@/lib/api-client'

const PAGE_SIZE = 50

export function useTaskList(filters: TaskFilters) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { status, sort, parentId } = filters

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (sort) params.set('sort', sort)
    if (parentId !== undefined) params.set('parentId', parentId === null ? 'null' : parentId)
    params.set('page', String(pageNum))
    params.set('limit', String(PAGE_SIZE))
    try {
      const data = await apiGetTasks(params)
      setTasks((prev) => append ? [...prev, ...data.tasks] : data.tasks)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [status, sort, parentId])

  // When filters change, reset to page 0
  useEffect(() => {
    setPage(0)
    fetchPage(0, false)
  }, [fetchPage])

  const refetch = useCallback(() => {
    setPage(0)
    fetchPage(0, false)
  }, [fetchPage])

  const loadMore = useCallback(() => {
    const next = page + 1
    setPage(next)
    fetchPage(next, true)
  }, [page, fetchPage])

  const hasMore = tasks.length < total

  return { tasks, setTasks, total, hasMore, loadMore, loading, error, refetch }
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
      // Check 404 before using the typed wrapper
      const res = await fetch(`/api/tasks/${id}`)
      if (res.status === 404) { setNotFound(true); return }
      if (!res.ok) throw new Error('Failed to fetch task')
      setTask(await apiGetTask(id))
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
    const params = new URLSearchParams({ parentId, limit: '100' })
    try {
      // limit=100: a task won't realistically have >100 subtasks
      const data = await apiGetTasks(params)
      setSubtasks(data.tasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subtasks')
    } finally {
      setLoading(false)
    }
  }, [parentId])

  useEffect(() => { refetch() }, [refetch])

  return { subtasks, loading, error, refetch }
}
