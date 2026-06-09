# /senior-review — Senior Developer Codebase Review

You are orchestrating a panel of senior engineers reviewing this codebase as if evaluating a candidate for a senior role. Run five specialized reviewer agents **in parallel** using the Agent tool, then synthesize their findings into one final report.

---

## Step 1 — Spawn five agents in parallel

Launch all five with a single message containing five Agent tool calls. Each agent must read the actual files — not guess from memory.

---

### Agent 1: Architecture & Structure

**Brief**: You are a principal engineer reviewing this project's architecture. Read `CLAUDE.md`, `AGENTS.md`, all files under `.claude/`, then scan the full directory tree with Glob. Assess with zero mercy.

**Checklist** (cite file:line for every finding):

**Project & folder structure**
- Does the folder layout telegraph intent at a glance? A new developer should know where to look within 60 seconds
- Are Next.js App Router conventions followed correctly? Server vs client components — is `'use client'` applied precisely where needed, not defensively everywhere?
- Is there a clear boundary between UI (`app/`, `components/`) and logic (`lib/`)?
- Are there any files in the wrong layer — business logic in components, UI concerns in lib, DB calls in route handlers?
- Does every folder have a single clear responsibility, or are folders catch-alls?

**Separation of concerns**
- Should the backend (API routes, DB, agents) be a separate service from the Next.js frontend? Evaluate whether co-locating them in one Next.js app is the right trade-off for this project's stated scope. Is the API surface clean enough to extract later?
- Are the AI agent files self-contained or do they bleed into other concerns?
- Is `lib/db.ts` a genuine single source of truth, or does logic leak elsewhere?

**Module boundaries & coupling**
- Can any module be replaced in isolation (e.g., swap SQLite for Postgres, swap Claude for GPT) without touching other layers?
- Are there circular imports or tight couplings between modules that should be independent?
- Is the shared `runAgentLoop` abstraction at the right level — does it serve all agents without requiring workarounds?

**Naming & discoverability**
- Are file and folder names descriptive and consistent?
- Do type names, function names, and API paths tell the same story — or do they use different vocabulary for the same concept?

**Configuration & environment**
- Are all environment-dependent values in `.env`? Are any secrets, base URLs, or feature flags hardcoded in source?
- Is the `.env.example` complete and accurate?

**Output**: JSON array `{ file, line, severity, category: "architecture", finding, recommendation }`

---

### Agent 2: Code Quality & TypeScript

**Brief**: You are a senior TypeScript engineer. Read every file in `lib/`, `components/`, `app/`, and `app/api/`. Your job is to find anything a TypeScript or React expert would flag.

**Checklist**:

**TypeScript strictness**
- Any `any`, `unknown` without a type guard, `!` non-null assertion, or `as` cast that bypasses safety?
- Are all function signatures fully typed (params and return types)?
- Are generic types used where they should be, or are types repeated instead of shared?
- Are discriminated unions or type guards used where appropriate, or are conditions on untyped values?
- Are there implicit `any`s hiding behind loosely typed third-party calls?

**DRY & duplication**
- Is any logic copy-pasted across files? Two pieces of code that do the same thing but live separately
- Are there any repeated Tailwind class combinations that should be a shared component or a `cn()` helper?
- Are fetch patterns repeated across components without a shared hook or utility?

**Function & file length**
- Any function longer than ~40 lines that should be split?
- Any file longer than ~200 lines where the concerns could be separated?
- Are React components doing both data fetching and rendering without separation?

**Naming**
- Are names precise? `handleXxx` for event handlers, `fetchXxx` for data fetching, `runXxx` for agent calls
- Are boolean variables named with `is/has/should` prefix?
- Are magic strings or numbers used where named constants should be?

**React correctness**
- Are `useEffect` dependency arrays complete and correct?
- Is `useCallback` / `useMemo` applied where it matters (passed as props, in effect deps) but not cargo-culted everywhere?
- Are there any `setState` calls that could cause a stale closure bug?
- Is derived state computed from existing state (no redundant state variables)?
- Are controlled vs uncontrolled inputs consistent?

**Error handling completeness**
- Are caught errors actually handled or silently swallowed?
- Are there any `async` functions without try/catch where an uncaught rejection would be silent?
- Do error messages give the user actionable information?

**Comments & documentation**
- Are there any comments explaining WHAT the code does (redundant with good names)?
- Are there any non-obvious behaviors that LACK a comment?
- Are there TODOs that should be issues instead?

**Output**: JSON array `{ file, line, severity, category: "code-quality", finding, recommendation }`

---

### Agent 3: Scalability & Reusability

**Brief**: You are a staff engineer thinking 2 years ahead. Read all components, pages, and lib files. Evaluate whether this codebase can grow without becoming a mess.

**Checklist**:

**Component reusability**
- Are components too specific to one context, making them unusable elsewhere? A `Button` that's always blue, a `Card` that only renders tasks
- Are there repeated UI patterns (card + hover actions, modal + form, badge variants) that should be unified into a single configurable component?
- Do components accept `className` props for styling overrides, or are styles baked in?
- Are component props typed narrowly enough to catch misuse, but broadly enough to be reusable?
- Is there a `compact` prop pattern or similar that's growing — would a `size` prop scale better?

**Prop drilling & state**
- Is state lifted to the right level — not too high (prop drilling) and not too low (missing shared state)?
- Are there data-fetching patterns duplicated in multiple components that should be a custom hook?
- Would this codebase benefit from a simple context or store for shared state (e.g., task list) at its current scale?

**Hardcoding**
- Are status values (`'todo'`, `'in-progress'`, `'done'`) and priority values (`'low'`, `'medium'`, `'high'`) repeated as string literals throughout the codebase rather than imported from a single source?
- Are API base paths hardcoded in multiple fetch calls rather than in one place?
- Are Tailwind color tokens for status/priority badges hardcoded in multiple components rather than in a shared map?

**Data layer extensibility**
- Can the DB layer be swapped to Postgres with minimal changes? Are there SQLite-specific syntax features (WAL pragma, etc.) that would need migration?
- Can new tasks fields (e.g., assignee, due date) be added without touching the whole stack?
- Can new agent types be added without touching the shared loop or tool dispatcher?

**API extensibility**
- Is the filter/sort API shape flexible enough to add new filter types (e.g., `?priority=high`) without breaking clients?
- Is pagination considered? At what task count does the current API break down?

**AI agent extensibility**
- Is it straightforward to add a fourth agent? What's the minimum surface to touch?
- Are agent tool definitions decoupled from agent logic — could two agents share a tool definition?

**Output**: JSON array `{ file, line, severity, category: "scalability", finding, recommendation }`

---

### Agent 4: Security & Reliability

**Brief**: You are a security engineer and SRE. Read all API routes, the DB layer, the agent files, and all components that make external calls. Find anything that could be exploited, fail silently, or cause data loss.

**Checklist**:

**Input validation & injection**
- Are all API inputs validated at the boundary — not just `title`, but status enum values, priority enum values, sort parameters?
- Could an attacker pass `status='; DROP TABLE tasks; --` or `sort=../../etc/passwd`?
- Are all SQL queries parameterized? Verify no string interpolation in SQL
- Is the `UPDATABLE_COLUMNS` allowlist complete — could adding a new column to the schema accidentally expose it?

**Authentication & authorization**
- No auth is by design, but: are there any endpoints that should still require some form of auth even for single-user? (Rate limiting, SSRF via agent calls)
- Are AI endpoints protected from abuse? A single call to the decompose endpoint can make multiple expensive API calls — is there any rate limiting or request size limit?

**Secret & environment handling**
- Is `ANTHROPIC_API_KEY` ever logged, returned in API responses, or accessible client-side (e.g., via `NEXT_PUBLIC_` prefix)?
- Are error responses in API routes revealing stack traces or internal details?

**Error handling & reliability**
- What happens if the Anthropic API is down — does the UI show a clear error or hang?
- What happens if SQLite file is locked or corrupted — is there a safe fallback?
- Are there any `async` operations that could succeed partially (e.g., create task but fail to respond) leaving the DB in a state the UI doesn't know about?
- Are concurrent writes to SQLite handled safely (WAL mode helps, but are there race conditions in multi-step operations)?

**Client-side security**
- Is user-provided text ever rendered as HTML (`dangerouslySetInnerHTML`) or interpolated into strings that reach the DOM unsanitized?
- Is there any URL constructed from user input that could enable open redirect or SSRF?

**Data integrity**
- If a delete fails mid-cascade, what's the DB state?
- Are there any constraints that should exist in the schema but don't (e.g., status must be one of three values)?
- What happens if the Anthropic agent calls `create_task` with a `parentId` that doesn't exist?

**Output**: JSON array `{ file, line, severity, category: "security", finding, recommendation }`

---

### Agent 5: Performance & UX

**Brief**: You are a performance engineer and UX lead. Read all pages, components, and API routes. Evaluate the user experience under real conditions: slow network, many tasks, mobile.

**Checklist**:

**React rendering performance**
- Are there components that re-render unnecessarily? Look for objects/arrays/functions created inline in JSX props
- Are `useCallback` and `useMemo` applied only where they actually prevent re-renders, not as a habit?
- Are list items given stable keys (not array index)?
- Are heavy computations (sort, filter) done in render without memoization?

**Data fetching**
- Is the N+1 subtask count pattern documented as a known trade-off? At what scale does it become a problem (100 tasks = 101 requests)?
- Are there any fetch waterfalls — sequential fetches that could be parallel?
- Is there any stale data risk — after a mutation, is the UI always in sync with the server?
- Should there be optimistic updates for status changes (currently requires a round-trip before UI updates)?

**AI response handling**
- Agent calls can take 5–30 seconds. Is there adequate feedback during that time (loading indicator, cancel option)?
- Is there a timeout if the agent hangs?
- If the user navigates away during an agent call, is the pending request cancelled or does it hang open?

**Bundle & load performance**
- Are any heavy libraries imported at module level that could be dynamically imported?
- Are images, icons, or assets optimized?
- Is code splitting happening naturally via Next.js App Router (each page is a separate chunk)?

**Accessibility**
- Do all interactive elements have accessible labels (`aria-label`, visible text, or associated `<label>`)?
- Is keyboard navigation fully functional — can the entire app be used without a mouse?
- Are focus states visible for keyboard users?
- Do status badges and priority badges convey meaning beyond color (for colorblind users)?
- Are modals focus-trapped and closed with Escape?
- Are loading states announced to screen readers (`aria-live` or `role="status"`)?

**Loading & error states**
- Does every async operation have a loading state?
- Does every async operation have an error state that's shown to the user (not silently swallowed)?
- Are empty states informative and actionable?
- What does the user see if the AI panel returns an empty string?

**Mobile UX**
- Is the layout usable on a 375px screen?
- Are touch targets at least 44×44px?
- Is the AI panel slide-over smooth and dismissible by tapping outside?

**Output**: JSON array `{ file, line, severity, category: "performance-ux", finding, recommendation }`

---

## Step 2 — Synthesize

After all five agents complete, read their JSON outputs and produce the final report in this exact structure:

---

### Overall Score

Rate the codebase **A / B / C / D / F** with a one-paragraph verdict. Be honest. A = production-ready with minor improvements; B = solid foundation, some real issues; C = functional but needs significant work before scaling; D = architectural or security issues that block growth; F = not suitable for production.

---

### Findings

One table, all confirmed findings from all agents, ranked by severity:

| # | Severity | Category | File:Line | Finding | Recommendation |
|---|----------|----------|-----------|---------|----------------|

Severity levels:
- **Critical** — security vulnerability, data loss risk, or broken core behavior
- **Major** — violates best practices in a way that will cause real problems at scale or during maintenance
- **Minor** — code quality, DRY, naming, small UX gaps
- **Nit** — purely stylistic, optional

Drop any finding that is refuted by reading the actual code. Do not invent findings.

---

### What's Done Well

Honest praise — 5–8 specific things the code gets right that many projects at this scale get wrong. Cite file:line. This section matters: a good reviewer calls out genuine strengths, not just problems.

---

### Action Plan

Prioritized list of what to fix first, with effort estimate:

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 1 | ... | S/M/L | ... |

Effort: S = under an hour, M = half a day, L = multiple days.

---

### Architecture Decision Record

For the two or three most significant architectural questions surfaced (e.g., "should this be a separate backend service?", "should we add a state management library?"), write a one-paragraph ADR:
- **Current state**
- **The trade-off**
- **Recommendation for this project's scope**
- **When to revisit**

---

## Grading rubric (for the score)

| Dimension | Weight | What earns an A |
|-----------|--------|-----------------|
| Architecture | 25% | Clear layers, no violations, extractable |
| Code quality | 25% | Strict TS, DRY, right-size files/functions |
| Security | 20% | All inputs validated, no leakage, handled failures |
| Scalability | 15% | Reusable components, extensible data layer |
| Performance & UX | 15% | No N+1s in hot paths, every state handled, accessible |
