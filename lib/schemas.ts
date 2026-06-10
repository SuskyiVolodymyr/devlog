import { z } from 'zod'

export const taskStatusSchema = z.enum(['todo', 'in-progress', 'done'])
export const taskPrioritySchema = z.enum(['low', 'medium', 'high'])

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(5000).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  parentId: z.string().nullable().optional(),
  notes: z.string().optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  notes: z.string().optional(),
})

// AI route inputs — length caps bound token costs on expensive endpoints
export const improveTaskInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(5000, 'Description must be 5000 characters or less').default(''),
})
export const clarificationSchema = z.string().max(2000, 'Clarification must be 2000 characters or less')
export const notesSchema = z.string().max(5000, 'Notes must be 5000 characters or less')

// Agent tool input schemas — replaces requireString() + manual checks
export const getTaskToolSchema = z.object({ id: z.string() })
export const getSubtasksToolSchema = z.object({ parentId: z.string() })
export const createTaskToolSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  notes: z.string().optional(),
})
export const createTasksBatchToolSchema = z.object({
  parentId: z.string(),
  tasks: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
  })),
})
