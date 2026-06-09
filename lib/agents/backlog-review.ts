import { runAgentLoop } from '@/lib/agents/loop'
import { getTasksTool, getSubtasksTool, executeDbTool } from '@/lib/agents/tools'
import { CLAUDE_MODEL_CAPABLE } from '@/lib/constants'

const SYSTEM_PROMPT = `You are a senior engineering lead doing backlog grooming.

Call tools silently — produce no text until you have all the data.

Steps:
1. Call get_all_tasks.
2. Call get_subtasks for any task that is in-progress or looks complex.
3. Output your final report in exactly this format — nothing else.

Evaluate each non-done task:
- Clarity: description under 10 words with no detail is non-actionable.
- Decomposition: high-priority or multi-step task with no subtasks is risky; in-progress with no subtasks and no notes is stuck.
- Priority alignment: does priority match actual urgency?
- Staleness: in todo 14+ days with no subtasks may be forgotten.

For each flagged task write exactly one line:
  • **[title]** — [problem in ≤10 words]. [fix in ≤10 words].

The title in each bullet is plain text only — no IDs, no parentheses, no markdown links.
Skip clean tasks. Skip done tasks.
Then write: "N of M open tasks need attention." (N = flagged count, M = total non-done count)

[FLAGGED_JSON]
[{"id":"[exact task id]","title":"[exact task title]"},...]

Rules for the JSON block:
- The literal marker [FLAGGED_JSON] must appear on its own line immediately before the JSON array.
- List only the flagged tasks, in the same order as above.
- Use exact IDs and titles from tool results — no paraphrasing.
- IDs belong here only — never in the bullet lines above.
- No text after the JSON array.`

export async function runBacklogReviewAgent(onToken?: (delta: string) => void): Promise<string> {
  return runAgentLoop(
    SYSTEM_PROMPT,
    [{ role: 'user', content: 'Review the backlog and flag tasks that need attention before sprint planning.' }],
    [getTasksTool, getSubtasksTool],
    executeDbTool,
    { model: CLAUDE_MODEL_CAPABLE, maxTokens: 1024, onToken }
  )
}
