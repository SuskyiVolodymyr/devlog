# /review — Code Review

Review the current diff (staged + unstaged changes) against these project-specific rules. Be precise — cite file and line number for every finding.

## What to check

### Correctness
- [ ] No raw SQL or DB calls outside `lib/db.ts`
- [ ] Every API route has try/catch returning `{ error: string }` on failure
- [ ] Cascade deletes work — deleting a task removes its subtasks
- [ ] No `any` types in agent tool definitions or Anthropic SDK calls
- [ ] Agent actually loops (uses `runAgentLoop` from `lib/agents/loop.ts`, not a single LLM call)

### Code quality
- [ ] Business logic is in `lib/`, not in components or route handlers
- [ ] No inline styles — Tailwind classes only
- [ ] Imports use `@/` alias, not relative paths from root
- [ ] No unnecessary `console.log` left in
- [ ] TypeScript strict — no `!` assertions without justification

### AI agent quality
- [ ] System prompt is specific and context-rich, not generic
- [ ] Tool definitions have clear descriptions (Claude reads them)
- [ ] Streaming is used for responses longer than a single sentence
- [ ] Clarification flow in decompose agent: vague task → question, not subtasks

### Product
- [ ] Does the feature actually solve the stated friction (see `docs/features/`)?
- [ ] Error states are visible to the user, not silently swallowed

## Output format

List findings grouped by severity:
- **Bug** — incorrect behavior, will break
- **Smell** — violates a project rule, should fix
- **Nit** — minor, optional

If no issues found, say so explicitly. Don't invent findings.
