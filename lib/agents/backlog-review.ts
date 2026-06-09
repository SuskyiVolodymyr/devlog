import { runAgentLoop } from '@/lib/agents/loop'
import { getTasksTool, getSubtasksTool, executeDbTool } from '@/lib/agents/tools'
import { CLAUDE_MODEL_CAPABLE } from '@/lib/constants'

const SYSTEM_PROMPT = `You are a senior engineering lead doing backlog grooming.

Call tools silently — produce no text until you have all the data.

Steps:
1. Call get_all_tasks.
2. Call get_subtasks for any task that is in-progress or looks complex.
3. Output your final report — nothing before it.

Evaluate each non-done task:
- Clarity: description under 10 words with no detail is non-actionable.
- Decomposition: high-priority or multi-step task with no subtasks is risky; in-progress with no subtasks and no notes is stuck.
- Priority alignment: does priority match actual urgency?
- Staleness: in todo 14+ days with no subtasks may be forgotten.

For each flagged task write exactly one line:
  • [title] — [problem in ≤10 words]. [fix in ≤10 words].

Skip clean tasks. Skip done tasks.
Last line only: "N of M open tasks need attention."
No separators, no headers, no extra lines.`

export async function runBacklogReviewAgent(onToken?: (delta: string) => void): Promise<string> {
  return runAgentLoop(
    SYSTEM_PROMPT,
    [{ role: 'user', content: 'Review the backlog and flag tasks that need attention before sprint planning.' }],
    [getTasksTool, getSubtasksTool],
    executeDbTool,
    { model: CLAUDE_MODEL_CAPABLE, maxTokens: 1024, onToken }
  )
}
