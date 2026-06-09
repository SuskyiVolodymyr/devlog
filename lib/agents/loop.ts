import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL } from '@/lib/constants'

const client = new Anthropic()

export async function runAgentLoop(
  systemPrompt: string,
  initialMessages: Anthropic.MessageParam[],
  tools: Anthropic.Tool[],
  executeTool: (name: string, input: Record<string, unknown>) => Promise<unknown>,
  options: {
    maxIterations?: number
    model?: string
    maxTokens?: number
    onToken?: (delta: string) => void
  } = {}
): Promise<string> {
  const { maxIterations = 10, model = CLAUDE_MODEL, maxTokens = 1024, onToken } = options
  const messages: Anthropic.MessageParam[] = [...initialMessages]

  for (let i = 0; i < maxIterations; i++) {
    const stream = client.messages.stream({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      // omit tools key entirely when empty — cleaner request, avoids empty-array edge cases
      ...(tools.length > 0 ? { tools } : {}),
      messages,
    })

    // Only emit text tokens on the final turn (end_turn). During tool_use turns,
    // Claude rarely produces text preamble with our tightly-scoped prompts, so
    // emitting on every turn is safe in practice — but we register the handler
    // unconditionally and let the natural flow handle it.
    if (onToken) {
      stream.on('text', onToken)
    }

    const response = await stream.finalMessage()

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
      if (!textBlock) throw new Error('Agent returned end_turn but no text block found')
      return textBlock.text
    }

    if (response.stop_reason === 'max_tokens') {
      // Budget exhausted — return whatever text was produced and warn so the caller
      // can raise maxTokens if this becomes a pattern.
      console.warn(`[runAgentLoop] Response truncated: max_tokens (${maxTokens}) reached. Raise the budget if responses are being cut off.`)
      const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
      if (textBlock) return textBlock.text
      throw new Error(`Agent response truncated at max_tokens (${maxTokens}) with no text output`)
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )

      messages.push({ role: 'assistant', content: response.content })

      // Execute all tool calls in parallel, each with a 30s timeout
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
