import Anthropic from '@anthropic-ai/sdk'
import { getTasks, getTask, getSubtasks, createTask } from '@/lib/db'
import {
  getTaskToolSchema,
  getSubtasksToolSchema,
  createTaskToolSchema,
  createTasksBatchToolSchema,
} from '@/lib/schemas'

export const getTasksTool: Anthropic.Tool = {
  name: 'get_all_tasks',
  description: 'Retrieve all top-level tasks from the database.',
  input_schema: {
    type: 'object',
    properties: {},
    required: [],
  },
}

export const getTaskTool: Anthropic.Tool = {
  name: 'get_task',
  description: 'Retrieve a single task by its ID.',
  input_schema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The task ID to look up.',
      },
    },
    required: ['id'],
  },
}

export const getSubtasksTool: Anthropic.Tool = {
  name: 'get_subtasks',
  description: 'Retrieve all subtasks belonging to a parent task.',
  input_schema: {
    type: 'object',
    properties: {
      parentId: {
        type: 'string',
        description: 'The parent task ID whose subtasks should be fetched.',
      },
    },
    required: ['parentId'],
  },
}

export const createTaskTool: Anthropic.Tool = {
  name: 'create_task',
  description: 'Create a single task or subtask in the database.',
  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Short, actionable title for the task.',
      },
      description: {
        type: 'string',
        description: 'Detailed description of what needs to be done.',
      },
      parentId: {
        type: 'string',
        description: 'Parent task ID — set this to make the new task a subtask.',
      },
    },
    required: ['title', 'description'],
  },
}

// Prefer this over create_task when creating multiple subtasks — one call instead of N
export const createTasksBatchTool: Anthropic.Tool = {
  name: 'create_tasks_batch',
  description: 'Create multiple subtasks at once for a parent task. Use this instead of calling create_task repeatedly.',
  input_schema: {
    type: 'object',
    properties: {
      parentId: {
        type: 'string',
        description: 'The parent task ID all subtasks belong to.',
      },
      tasks: {
        type: 'array',
        description: 'All subtasks to create in one shot.',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short, actionable title.' },
            description: { type: 'string', description: 'What needs to be done.' },
          },
          required: ['title', 'description'],
        },
      },
    },
    required: ['parentId', 'tasks'],
  },
}

export async function executeDbTool(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'get_all_tasks':
      return getTasks()

    case 'get_task':
      return getTask(getTaskToolSchema.parse(input).id)

    case 'get_subtasks':
      return getSubtasks(getSubtasksToolSchema.parse(input).parentId)

    case 'create_task':
      return createTask(createTaskToolSchema.parse(input))

    case 'create_tasks_batch': {
      const { parentId, tasks } = createTasksBatchToolSchema.parse(input)
      return tasks.map((t) => createTask({ ...t, parentId }))
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}
