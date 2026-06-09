import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL } from '@/lib/constants'

const client = new Anthropic()

export async function runAgentLoop(
  systemPrompt: string,
  initialMessages: Anthropic.MessageParam[],
  tools: Anthropic.Tool[],
  executeTool: (name: string, input: Record<string, unknown>) => Promise<unknown>,
  maxIterations = 10
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [...initialMessages]

  for (let i = 0; i < maxIterations; i++) {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    })

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
      if (!textBlock) {
        throw new Error('Agent returned end_turn but no text block found')
      }
      return textBlock.text
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )

      // Append assistant turn with all content blocks
      messages.push({ role: 'assistant', content: response.content })

      // Execute all tool calls and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block) => {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Tool ${block.name} timed out after 30s`)), 30_000)
          )
          const result = await Promise.race([
            executeTool(block.name, block.input as Record<string, unknown>),
            timeoutPromise,
          ])
          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: JSON.stringify(result),
          }
        })
      )

      messages.push({ role: 'user', content: toolResults })
      continue
    }

    // Unexpected stop reason — treat any remaining text as final answer
    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
    if (textBlock) return textBlock.text

    throw new Error(`Unexpected stop_reason: ${response.stop_reason}`)
  }

  throw new Error(`Agent loop exceeded ${maxIterations} iterations without completing`)
}
