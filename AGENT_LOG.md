# AGENT_LOG — AI-Assisted Development Journal

Honest account of how Claude Code was used to build DevLog. What the agent did, where it helped, where it fell short, and what needed manual intervention.

---

## Tool: Claude Code (claude-sonnet-4-6 in Claude Code desktop app)

All development done with Claude Code as the primary coding assistant. The session used:
- **Parallel sub-agents** (`Agent` tool with `isolation: "worktree"`) for simultaneous feature branches
- **GitHub MCP** for all git operations — repo creation, branches, commits, PRs, merges
- **Claude-in-Chrome MCP (browser)** for end-to-end verification — Claude drove the real app in Chrome (click, wait for stream, screenshot) before every UI commit; several prompt-format bugs were caught this way that code review would have missed
- **Custom `/review` and `/senior-review` slash commands** (`.claude/commands/`) for project-aware code review
- **Context files** loaded selectively: `CLAUDE.md`, `AGENTS.md`, `.claude/architecture.md`, `.claude/conventions.md`, `.claude/github.md`, `docs/features/ai-agents.md`
- **Memory** (`~/.claude/projects/`) for persistent preferences across sessions

---

## Phase 0: Project planning and Claude Code infrastructure

**What I asked Claude to do**: Design the full project architecture, decide on storage strategy, plan the AI agent approach, then set up all Claude Code context files.

**What Claude did**: Proposed the separation of CLAUDE.md into focused per-domain files (architecture, conventions, github rules) so context loads selectively rather than as one monolithic file. That was Claude's suggestion — I had expected one big file. It also flagged that Next.js 16 auto-generates both `CLAUDE.md` and `AGENTS.md` via `create-next-app`, which is a native signal that the ecosystem is catching up to agent-assisted development.

**What I changed**: Minor wording in `.claude/github.md` to match our exact branching flow.

**Honest assessment**: The infrastructure setup was nearly perfect out of the box. Claude understood the purpose of keeping context lean without being asked explicitly.

---

## Phase 1: Repository and branch setup

**What I asked Claude to do**: Create the GitHub repo, scaffold Next.js 16, set up `main` and `develop` branches, connect everything.

**What Claude did**: Used GitHub MCP to create the repo, ran `create-next-app@16` (which surfaced Next.js 16's native AGENTS.md support), renamed `master` → `main`, pushed, created `develop` via MCP.

**What I changed**: Nothing — Claude handled the full git workflow via MCP with no manual terminal work.

**Honest assessment**: The GitHub MCP workflow was smooth. One minor friction: the initial repo had `autoInit: true` which created an empty commit, causing a merge conflict with the local repo's initial commit. Claude caught this and handled it (pull with `--allow-unrelated-histories`).

---

## Phase 2: Shared setup — deps and types

**What I asked Claude to do**: Install `better-sqlite3`, `@anthropic-ai/sdk`, `nanoid`; define `lib/types.ts` with the shared `Task` type so all parallel agents start from a consistent base.

**What Claude did**: Installed packages, created the types file, committed on a `chore/setup-deps` branch, PR'd and merged.

**Why this came before the parallel agents**: Three agents working simultaneously would each define `Task` independently → type drift. Doing it once upfront meant every agent imported from `@/lib/types`.

---

## Phase 3: Parallel sub-agents

**What I asked Claude to do**: Spawn three simultaneous sub-agents to build the data layer, UI, and AI infrastructure in parallel using `Agent` tool with `isolation: "worktree"`.

**What the agents did**:

### Agent 1 — `feat/data-layer`
Built `lib/db.ts` (SQLite with WAL mode, foreign keys, all CRUD functions) and the API routes. The agent used Next.js 16's async params convention (`await params`) correctly. SQLite query construction with dynamic filters was clean.

### Agent 2 — `feat/task-ui`
Scaffolded all 6 components (`TaskCard`, `TaskForm`, `FilterBar`, `StatusBadge`, `PriorityBadge`, `AIPanel`) plus both pages. The agent made a good product decision independently: status cycling on badge click (no modal needed for the most common action). The dark zinc/slate palette was solid.

### Agent 3 — `feat/ai-agents`
Implemented the shared `runAgentLoop`, tool definitions, and three agents. Used `Promise.all` for concurrent tool calls within a single agent step. Created a minimal `lib/db.ts` stub since the data layer was being built in parallel.

**What needed manual intervention**:

1. **Stub conflict**: Agent 3 created `lib/db.ts` (stub) which conflicted with Agent 1's real implementation when merging to `develop`. Resolved by adding a cleanup commit on `feat/ai-agents` that deleted the stub — the squash-merge net diff then had no change to `lib/db.ts`. This was expected and handled cleanly.

2. **Two TypeScript errors post-merge**: `tools.ts` passed `Record<string, unknown>` to `createTask` (expects `CreateTaskInput`) — solved with a double-cast via `unknown`. `db.ts` had a dead `parentId` column remap (not in `UpdateTaskInput`) — removed. Both were boundary-mismatch gaps from agents working in isolation.

3. **parentId null coercion bug**: `page.tsx` sent `parentId=null` as a URL string. The API compared `filters.parentId === null` which failed on the string `"null"`. The main page never loaded top-level tasks. Fixed by coercing `"null"` → `null` at the API boundary — the kind of bug that only surfaces at integration time.

**What impressed me**: The agents read and followed the context files (`AGENTS.md`, `.claude/conventions.md`) without reminders. Every API route had the correct try/catch shape. Component naming was consistent across all three agents despite working in isolation.

---

## Phase 4: Code review and polish

**What I asked Claude to do**: Run the `/review` slash command (via the `code-review` skill), look at the full architecture, find everything worth fixing.

**What the review found** (7 confirmed issues across two parallel reviewer agents):

| Severity | Issue | Caught by |
|----------|-------|----------|
| Critical | `claude-opus-4-5` is a retired model — every AI call would 404 | Reviewer angle A |
| Security | SQL injection via unsanitized `Object.keys` in `updateTask` | Reviewer angle C |
| Bug | `res.json()` on error path throws on HTML/proxy error bodies | Reviewer angle A |
| Bug | `saveTimeout` not cleared on unmount → setState after unmount | Reviewer angle B |
| UX gap | Decompose clarification flow — agent asks question, user can't reply | Manual review |
| UI bug | `setActiveAction` never reset → button stays highlighted forever | Reviewer angle A |
| Polish | Layout metadata still said "Create Next App" | Manual review |

**What I added beyond the review**: The clarification flow wasn't caught by the automated reviewer (it's a product gap, not a code bug). I noticed it during manual inspection and implemented it in `AIPanel.tsx`: detect when the decompose response ends with `?`, show a clarification textarea, re-call the agent with `{ clarification }`.

**Honest assessment**: The model ID bug (using a retired model) is the most embarrassing catch — it would have made all AI features non-functional on first run for the reviewers. It was introduced by the AI agent and caught by a different AI agent. The SQL injection was a real security issue that the automated review correctly flagged.

---

## Phase 5: Own-idea agent — Backlog Review

**What I asked Claude to do**: Propose and implement a fourth agent beyond the three specified ones.

**The idea**: A Backlog Review agent that scans all open tasks and flags quality issues before sprint planning — vague descriptions, high-priority tasks with no decomposition, in-progress tasks with no subtasks or notes, forgotten to-dos older than two weeks. This is the "backlog grooming" job a senior engineer does manually every sprint.

**What Claude did**: Implemented `lib/agents/backlog-review.ts` using the `get_all_tasks` and `get_subtasks` tools (a real two-step agentic loop — fetch all, then selectively drill into complex tasks). Added the API route at `/api/ai/backlog-review`, registered it in `AI_ACTIONS` so it appears automatically on the main page panel between Prioritize and Decompose.

**Why this agent over other options**: Standup Generator was considered but overlaps with Status Update (single-task focused). Complexity Estimator was considered but requires per-task invocation. Backlog Review is board-level, proactive rather than reactive, and addresses a pain point every team has — the messy backlog before planning.

**What I changed**: Positioning in the `AI_ACTIONS` list — Backlog Review sits between Prioritize and Decompose in the UI, which groups the board-level agents (Prioritize, Backlog Review) above the task-specific ones (Decompose, Status Update).

---

## Phase 6: Senior review — five-agent panel

**What I asked Claude to do**: Run a deep multi-perspective review before calling the build done. I added a custom `/senior-review` command (`.claude/commands/senior-review.md`) that spawns five parallel reviewer agents — architecture, code quality/TypeScript, scalability, security/reliability, performance/UX — each with its own checklist, then synthesizes findings into one graded report.

**What it found**: 23 confirmed findings, fixed across three commits. Highlights: missing enum validation on PUT (any string accepted as status), AI error responses leaking internal messages, no rate limiting on expensive AI endpoints, fetch calls without AbortController (state updates after unmount), modal without focus trap, status/priority styling duplicated across components.

**Honest assessment**: The panel also produced false positives — findings that sounded plausible but were refuted by actually reading the code. Synthesizing meant dropping those, not fixing everything blindly. The value of the multi-agent setup was coverage breadth: security and accessibility issues came from different reviewers, and neither would have caught the other's list.

---

## Phase 7: Performance pass — streaming, pagination, token costs

**What I asked Claude to do**: Make agent responses stream instead of blocking for 10–30 seconds, paginate the task list, and cut AI token costs.

**What Claude did**: SSE streaming end-to-end (`lib/sse.ts` helper, `onToken` callback threaded through the agent loop, client-side SSE parser in `AIPanel`). Pagination at 50/page with load-more. Token optimization: inject task data directly into prompts where the input is already known (status update no longer burns a tool round-trip to fetch what the route already loaded), batch subtask creation, right-size models — Haiku for simple generation, Sonnet for reasoning.

---

## Phase 8: Reviewer experience — demo data and testing guide

**What I asked Claude to do**: Make the app testable in one click — reviewers shouldn't have to invent tasks before trying the AI features.

**What Claude did**: A "Demo data" button seeding tasks deliberately varied so every agent has material: a vague task ("Fix auth" / "broken") for the clarification flow, a stalled in-progress task for Backlog Review, a task with subtasks and notes for Status Update.

---

## Phase 9: TanStack Query + Zod migration

**What I asked Claude to do**: Replace the manual `useState`/`useEffect` fetch patterns with TanStack Query, and the hand-rolled API validation with Zod.

**What Claude did**: Two parallel worktree agents — one migrated all data hooks to TanStack Query (`useInfiniteQuery` for the list, mutations with cache invalidation, optimistic status updates with rollback), the other introduced `lib/schemas.ts` and replaced manual type checks at every API boundary. Merged via a feature branch.

**Honest assessment**: This is the migration I'd be most careful about reviewing by hand — cache invalidation bugs are subtle. The optimistic-update rollback logic was verified by clicking through status changes with the network tab open, not just by reading the diff.

---

## Phase 10: AI output UX — the feedback-driven phase

This phase was the clearest example of "AI as amplifier, not replacement": every iteration was driven by me using the product and reacting, with Claude implementing and verifying.

**The problem**: agents returned walls of plain text into a small panel. As a developer I didn't want to read paragraphs to learn "start with task X".

**The iterations** (each one my feedback, Claude's implementation):
1. *"Too much text, add formatting, add a navigation card when the response finishes"* → shortened prompts (bullets, word caps), a lightweight markdown renderer (bold + bullets, ~50 lines, no library), and structured output: agents end with a sentinel-separated JSON block carrying exact task IDs, so navigation chips/cards never depend on parsing prose.
2. *"Do the same for backlog review"* → same modal pattern, where two real bugs surfaced: the model rendered `---` as a markdown horizontal rule mid-prose, colliding with the `---` sentinel and truncating the whole report — fixed by switching to a unique `[FLAGGED_JSON]` marker; and the model leaked raw task IDs as markdown links into the prose — fixed in both the renderer (strips links) and the prompt ("IDs belong in the JSON block only").
3. *"The modal doesn't fit the screen"* — I caught this after the commit had landed; fixed in a follow-up (max-height + scrollable body + pinned header/footer).
4. *"Can we make text generation smoother?"* → first attempt batched state updates to one per animation frame. *"Still not smooth"* → the real fix decoupled rendering from network bursts entirely: a typewriter that advances a visible-character counter per frame (faster drain once the stream ends). The letter-by-letter idea was mine; Claude validated it wouldn't cause performance issues (it's a counter increment and a string slice per frame) and implemented it.

**Verification workflow**: every iteration was verified live — Claude drove Chrome through the Claude-in-Chrome MCP: click the button, wait for the stream, screenshot, confirm rendering — before each commit. Several bugs (the sentinel collision, the ID leak) were caught this way, not by reading code.

---

## Phase 11: N+1 elimination — diagnosed from server logs

**What happened**: I noticed the dev server logged ~35 requests on first load and pasted the logs asking why. Claude traced it to `useSubtaskStats`: two count requests per task (1 + 2N pattern). The fix moved the counts into the task-list SQL via correlated subqueries — subtask progress now arrives embedded in the single list response, and the hook became a pure data extractor.

**Honest assessment**: this is a bug an automated review had earlier rationalized as "acceptable at this scale". It was acceptable until a human looked at the logs and felt it was wrong. The earlier README even documented it as a known trade-off — now it's just fixed.

---

## Phase 12: Status Update — structured output + Copy for Slack

**What I asked**: the status update read fine but was a wall of prose like the other agents used to be — same modal treatment.

**What Claude did**: restructured the prompt (context line + Done / In progress / Next / Blocked bullets with word caps), reused the streaming modal, and added a "Copy for Slack" button that converts `**bold**` to Slack's `*bold*`.

**What broke first**: the live browser test showed the agent emitting six separate "Next" bullets — one per subtask — instead of one summary. Fixed with an explicit prompt rule ("each label appears at most once — summarize across subtasks"). A prompt bug that only an end-to-end test catches.

---

## Phase 13: Improve with AI — second own-idea feature

**The idea was mine, shaped by my own pain**: I'm not a native English speaker, and my rough drafts become exactly the vague tickets Backlog Review later flags. So: a button in the task form that rewrites title + description into clean English at the point of entry.

**What Claude did**: a Haiku-based agent returning strict JSON, deliberately constrained ("never invent requirements the author didn't write"), a plain JSON route (no streaming — it fills form fields), and the form button with a spinner and one-click Undo that restores the original text.

**Verification**: tested live with intentionally broken English — *"fix bug when user click save two times very fast and it create duplicate task"* → *"Prevent duplicate tasks from rapid save button clicks"*, with the description keeping my suggested fix and adding nothing invented.

---

## What Claude did well

- **Context retention**: Conventions from `.claude/` were followed consistently across multiple agent sessions and PR reviews without repeated reminders
- **Architecture decisions**: The shared `runAgentLoop` pattern, the `parentId`-as-subtask design, and the selective context loading were all Claude suggestions that held up through the build
- **Post-merge integration**: Finding and explaining the null coercion bug, the type boundary gaps, and the stub conflict — all diagnosed and fixed without help
- **Self-verification**: Driving the actual browser (Claude-in-Chrome MCP) to test every UI change end-to-end before committing — this caught prompt-format bugs (sentinel collision, ID leaks, repeated bullets) that no amount of code reading would have found
- **Diagnosis from evidence**: Tracing the N+1 from pasted server logs to the exact hook, and proposing the correlated-subquery fix in one pass

## What needed human judgment

- **Product taste**: Every UX iteration in Phase 10 started with me using the app and reacting — "too much text", "still not smooth", "doesn't fit the screen". Claude implemented and verified; the judgment of what *feels* right stayed human
- **Noticing what's wrong**: The N+1 was found because I read the dev server logs and felt 35 requests was too many — the earlier automated review had rationalized it as acceptable
- **Feature ideas**: The fifth AI feature (Improve with AI) came from my own pain as a non-native English speaker; the letter-by-letter typewriter rendering was also my suggestion
- **Clarification UX**: Recognizing that the decompose flow had a product gap (agent asks question, UI has no reply mechanism) was a manual insight the automated review missed
- **Scope sequencing**: Specified features A–C first, the own-idea agents (D: Backlog Review, plus Improve with AI) after the base was hardened

---

## Process summary

| PR | Branch | Who did it |
|----|--------|----------|
| #1 | `chore/claude-setup` | Claude Code (main session) |
| #2 | `chore/setup-deps` | Claude Code (main session) |
| #3 | `feat/data-layer` | Sub-agent (parallel) |
| #4 | `feat/ai-agents` | Sub-agent (parallel) |
| #5 | `feat/task-ui` | Sub-agent (parallel) |
| #6 | `fix/type-errors` | Claude Code (post-merge integration) |
| #7 | `fix/toplevel-tasks-query` | Claude Code (post-merge review) |
| #8 | `fix/polish` | Claude Code (after `/review` pass) |
| #9 | `docs/readme-agentlog` | Claude Code (main session) |

Later phases continued on feature branches merged locally into `develop` (`fix/senior-review`, `feat/sse-streaming`, `feat/backlog-review-agent`, `feat/seed-demo-data`, `feat/tanstack-query-zod`, and others — see `git log`). An honest note on workflow: during the final UX iteration phase (modals, streaming, typewriter), changes landed as sequential conventional commits directly on `develop` rather than one-branch-per-change — the iterations were small, feedback-driven, and each was browser-verified before commit, so the PR ceremony added no value at that cadence. `develop` was merged to `main` with `--no-ff` at stable points.
