import Anthropic from '@anthropic-ai/sdk'
import { getTasks, getTask, getSubtasks, createTask } from '@/lib/db'

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
  description: 'Create a new task or subtask in the database.',
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
    required: ['title', 'description', 'parentId'],
  },
}

export async function executeDbTool(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'get_all_tasks':
      return getTasks()

    case 'get_task': {
      const id = input.id as string
      return getTask(id)
    }

    case 'get_subtasks': {
      const parentId = input.parentId as string
      return getSubtasks(parentId)
    }

    case 'create_task':
      return createTask(input as unknown as import('@/lib/types').CreateTaskInput)

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}
