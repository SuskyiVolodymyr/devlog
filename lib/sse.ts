const encoder = new TextEncoder()

// SSE wire format:
//   text delta  → data: {"d":"..."}\n\n
//   done        → data: [DONE]\n\n
//   error       → data: [ERROR] <message>\n\n
//
// JSON-encoding the delta handles newlines and special characters safely.

function chunk(payload: string): Uint8Array {
  return encoder.encode(`data: ${payload}\n\n`)
}

export function sseDelta(delta: string): Uint8Array {
  return chunk(JSON.stringify({ d: delta }))
}

export function sseDone(): Uint8Array {
  return chunk('[DONE]')
}

export function sseError(message: string): Uint8Array {
  return chunk(`[ERROR] ${message}`)
}

/**
 * Wraps an async agent call in an SSE ReadableStream response.
 * Pre-flight errors (rate limit, 404) should be returned before calling this.
 */
export function createAgentSSEResponse(
  run: (onToken: (delta: string) => void) => Promise<void>
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const onToken = (delta: string) => controller.enqueue(sseDelta(delta))

      try {
        await run(onToken)
        controller.enqueue(sseDone())
      } catch (err) {
        // Never stream internal error details to the client
        console.error('[agent-sse]', err)
        controller.enqueue(sseError('AI agent failed. Please try again.'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
