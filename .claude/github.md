# GitHub Workflow

## Branch strategy

```
main          production-ready, merge from develop only via PR
develop       integration branch, merge from feature branches via PR
feat/*        new features
fix/*         bug fixes
chore/*       tooling, config, deps, docs
```

Never commit directly to `main` or `develop`.

## Branch naming

```
feat/task-crud
feat/ai-prioritize
feat/ai-decompose
feat/ai-status-update
fix/sqlite-cascade-delete
chore/claude-setup
docs/readme-agentlog
```

## Commit format (Conventional Commits)

```
type(scope): short description

feat(tasks): add SQLite persistence layer
feat(ai): implement prioritization agent with tool use
fix(api): handle cascade delete for subtasks
chore(deps): add better-sqlite3 and @anthropic-ai/sdk
docs(readme): add architecture and setup instructions
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`
Scope: `tasks`, `ai`, `api`, `ui`, `db`, `agents`, `deps`

## PR rules

- One PR per feature branch
- Title follows commit format: `feat(ai): implement decomposition agent`
- Body must include: summary, what changed, how to test
- PRs target `develop`, not `main`
- Merge `develop` → `main` only when a set of features is complete
- CI (`.github/workflows/ci.yml`) must pass before merging: type-check, lint, tests, build. Run `npx tsc --noEmit && npm run lint && npm test` locally before pushing.

## PR body template

```markdown
## Summary
- What this PR does in 2-3 bullets

## Changes
- List of key files changed and why

## How to test
- Step-by-step to verify the feature works
```
