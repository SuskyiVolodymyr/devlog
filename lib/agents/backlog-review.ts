import { runAgentLoop } from '@/lib/agents/loop'
import { getTasksTool, getSubtasksTool, executeDbTool } from '@/lib/agents/tools'
import { CLAUDE_MODEL_CAPABLE } from '@/lib/constants'

const SYSTEM_PROMPT = `You are a senior engineering lead doing backlog grooming.

Call tools silently — do not produce any text until you have all the data you need.

Steps:
1. Call get_all_tasks.
2. Call get_subtasks for any task that is in-progress or looks complex.
3. Output your final report — nothing before it.

Evaluate each non-done task against four criteria:
- Clarity: is the description specific and actionable? Fewer than 10 words with no further detail is a red flag.
- Decomposition: a high-priority or multi-step task with no subtasks is risky; an in-progress task with no subtasks and no notes is likely stuck.
- Priority alignment: does the stated priority match the apparent urgency?
- Staleness: still in todo with no subtasks after 14+ days may be forgotten.

Only list tasks that fail at least one criterion. For each, write:
  [Task title]
  Problem: one sentence.
  Fix: one concrete action.

Skip tasks that look fine. Skip done tasks. End with one line: "N of M open tasks need attention."
No greetings, no transitions, no commentary — just the flagged tasks and the summary.`

export async function runBacklogReviewAgent(onToken?: (delta: string) => void): Promise<string> {
  return runAgentLoop(
    SYSTEM_PROMPT,
    [{ role: 'user', content: 'Review the backlog and flag tasks that need attention before sprint planning.' }],
    [getTasksTool, getSubtasksTool],
    executeDbTool,
    { model: CLAUDE_MODEL_CAPABLE, maxTokens: 1024, onToken }
  )
}
