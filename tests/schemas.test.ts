import { describe, it, expect } from 'vitest'
import {
  createTaskSchema,
  updateTaskSchema,
  improveTaskInputSchema,
  clarificationSchema,
  notesSchema,
} from '@/lib/schemas'

describe('createTaskSchema', () => {
  it('accepts a minimal valid task', () => {
    expect(createTaskSchema.safeParse({ title: 'Fix bug' }).success).toBe(true)
  })

  it('rejects an empty title and an over-long title', () => {
    expect(createTaskSchema.safeParse({ title: '' }).success).toBe(false)
    expect(createTaskSchema.safeParse({ title: 'x'.repeat(201) }).success).toBe(false)
  })

  it('rejects invalid status and priority values', () => {
    expect(createTaskSchema.safeParse({ title: 'ok', status: 'archived' }).success).toBe(false)
    expect(createTaskSchema.safeParse({ title: 'ok', priority: 'urgent' }).success).toBe(false)
  })
})

describe('updateTaskSchema', () => {
  it('accepts a partial update', () => {
    expect(updateTaskSchema.safeParse({ status: 'done' }).success).toBe(true)
  })

  it('rejects invalid enum values', () => {
    expect(updateTaskSchema.safeParse({ status: 'paused' }).success).toBe(false)
  })
})

describe('AI input length caps', () => {
  it('improve-task: trims, requires a title, caps both fields', () => {
    const ok = improveTaskInputSchema.safeParse({ title: '  fix bug  ', description: 'desc' })
    expect(ok.success).toBe(true)
    if (ok.success) expect(ok.data.title).toBe('fix bug')

    expect(improveTaskInputSchema.safeParse({ title: '   ' }).success).toBe(false)
    expect(improveTaskInputSchema.safeParse({ title: 'x'.repeat(201) }).success).toBe(false)
    expect(improveTaskInputSchema.safeParse({ title: 'ok', description: 'x'.repeat(5001) }).success).toBe(false)
  })

  it('improve-task: description defaults to empty string', () => {
    const parsed = improveTaskInputSchema.safeParse({ title: 'ok' })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.description).toBe('')
  })

  it('clarification and notes are capped', () => {
    expect(clarificationSchema.safeParse('x'.repeat(2000)).success).toBe(true)
    expect(clarificationSchema.safeParse('x'.repeat(2001)).success).toBe(false)
    expect(notesSchema.safeParse('x'.repeat(5000)).success).toBe(true)
    expect(notesSchema.safeParse('x'.repeat(5001)).success).toBe(false)
  })
})
