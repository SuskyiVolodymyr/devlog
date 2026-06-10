# AI Agents — Implementation Guide

Load this file when implementing or modifying any AI agent in `lib/agents/`.

## Core pattern: tool-use loop

All agents share `runAgentLoop()` from `lib/agents/loop.ts` — read that file for the source of truth rather than relying on a snippet here. What it does:

1. Calls Claude (streaming) with a system prompt, messages, and tool definitions
2. `stop_reason === 'tool_use'` → executes all tool calls **in parallel** (30s timeout each), appends results, loops
3. `stop_reason === 'end_turn'` → returns the text
4. `stop_reason === 'max_tokens'` → returns partial text with a console warning (raise `maxTokens` if recurring)
5. Optional `onToken` callback streams text deltas — agent routes wrap this in SSE via `createAgentSSEResponse()` (`lib/sse.ts`)

Models come from `lib/constants.ts`: `CLAUDE_MODEL_CAPABLE` (Sonnet — reasoning agents) and `CLAUDE_MODEL_FAST` (Haiku — simple generation). Pick the cheapest tier that does the job.

## Output contract conventions

- **Prose for the human, JSON for the UI.** Agents whose output drives UI components (navigation cards, chips) end their response with a sentinel followed by a JSON block containing exact task IDs/titles from tool results. Prioritize uses `\n---\n`; backlog review uses `[FLAGGED_JSON]` (a bare `---` collides with markdown horizontal rules the model emits mid-prose — prefer a unique bracketed marker for new agents).
- **No IDs in prose.** Task IDs belong only in the JSON block; prompts must say so explicitly or the model leaks `[title](id)` links into the text.
- **Tight format rules beat post-processing.** Word caps per bullet, "each label appears at most once", "call tools silently — produce no text until you have all the data". These rules exist because their absence produced real bugs; keep them when editing prompts.
- The modal renderer (`renderMarkdown` in `AIPanel.tsx`) supports `**bold**` and `•`/`-` bullets only — don't prompt for headers, tables, or nested lists.

## The agents

| Agent | File | Model | Tools | Output |
|-------|------|-------|-------|--------|
| Prioritize | `prioritize.ts` | capable | `get_all_tasks` | Short reasoned pick + `---` + `{id,title}` JSON |
| Backlog Review | `backlog-review.ts` | capable | `get_all_tasks`, `get_subtasks` | Flagged-task bullets + `[FLAGGED_JSON]` + `[{id,title}]` |
| Decompose | `decompose.ts` | capable | `get_task`, `create_task` | Creates 3–6 subtasks, or asks a clarifying question (route passes `{ clarification? }` on retry) |
| Status Update | `status-update.ts` | fast | none — task+subtasks injected into the prompt | Context line + Done/In progress/Next/Blocked bullets (each label at most once) |
| Improve Task | `improve-task.ts` | fast | none | Strict JSON `{title,description}`, parsed and validated server-side. Never invents details. |

Note the token optimization on Status Update and Improve Task: when the route already has all the data, inject it into the user message instead of giving the agent a read tool — saves a full round-trip.

## Adding a new agent

1. `lib/agents/[name].ts` — system prompt + `runAgentLoop` call
2. `app/api/ai/[name]/route.ts` — rate limit check, then `createAgentSSEResponse` (or plain JSON if the output fills a form)
3. One entry in `AI_ACTIONS` (`lib/constants.ts`) — the panel button appears automatically; `taskOnly`/`boardOnly` control placement
4. If it needs a modal: follow the prioritize/backlog pattern in `AIPanel.tsx` (instant open, streamed text, typewriter state pair, sentinel parsing after animation completes)
5. Verify live in the browser before committing — prompt-format bugs (sentinel collisions, repeated bullets, leaked IDs) only surface end-to-end
