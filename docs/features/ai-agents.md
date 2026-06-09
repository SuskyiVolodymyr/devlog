# AI Agents — Implementation Guide

Load this file when implementing or modifying any AI agent in `lib/agents/`.

## Core pattern: tool-use loop

All three agents share the same loop from `lib/agents/loop.ts`. The loop:
1. Calls Claude with a system prompt, messages, and tool definitions
2. If Claude responds with a tool call → execute the tool → append result → go to 1
3. If Claude responds with text (stop_reason = "end_turn") → return the text

```typescript
// lib/agents/loop.ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function runAgentLoop(
  systemPrompt: string,
  initialMessages: Anthropic.MessageParam[],
  tools: Anthropic.Tool[],
  executeTool: (name: string, input: Record<string, unknown>) => Promise<unknown>,
  maxIterations = 10
): Promise<string> {
  const messages = [...initialMessages]
  
  for (let i = 0; i < maxIterations; i++) {
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      tools,
    })

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text')
      return textBlock?.text ?? ''
    }

    // Process tool calls
    const assistantMessage: Anthropic.MessageParam = {
      role: 'assistant',
      content: response.content,
    }
    messages.push(assistantMessage)

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const result = await executeTool(block.name, block.input as Record<string, unknown>)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        })
      }
    }

    messages.push({ role: 'user', content: toolResults })
  }

  throw new Error('Agent loop exceeded max iterations')
}
```

## Agent A: Prioritization (`lib/agents/prioritize.ts`)

**Tools available to Claude**: `get_all_tasks`
**What Claude does**: fetches all tasks, then reasons about priority + age + status to return a ranked recommendation with written explanation.

System prompt must instruct Claude to:
- Weight high-priority tasks that are old (days since createdAt) more than new ones
- Flag in-progress tasks that haven't moved
- Return a ranked list with a paragraph explaining the logic, not just the order

## Agent B: Decomposition (`lib/agents/decompose.ts`)

**Tools available to Claude**: `get_task`, `create_task`
**What Claude does**:
1. Calls `get_task` to read title + description
2. If description is vague (< 20 words or missing specifics) → returns a clarifying question as text (no tool calls)
3. If clear (or clarification provided via `body.clarification`) → calls `create_task` 3-6 times to create subtasks under `parent_id`

The API route passes `{ clarification?: string }` in the request body. If present, it's appended to the messages before the loop starts.

## Agent C: Status update (`lib/agents/status-update.ts`)

**Tools available to Claude**: `get_task`, `get_subtasks`
**What Claude does**: reads the task and all its subtasks, then writes a Slack-style async update.

System prompt tone guide:
- Short (3-6 sentences)
- No bullet points — flowing prose, like a real Slack message
- Mention what's done, what's in progress, what's blocked if applicable
- Casual but professional tone
- Start with the task name naturally (not "Update for task X:")
