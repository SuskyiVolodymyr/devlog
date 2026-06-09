<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# DevLog — Agent Context

This project uses Next.js 16 App Router. Key conventions for AI agents working on this codebase:

## Project purpose
DevLog is a task tracker with embedded AI agents. The in-product AI features (prioritization, decomposition, status updates) use the Anthropic Claude API with tool use. Claude Code (you) is the coding assistant that builds the app.

## Tech stack
- **Framework**: Next.js 16.2 App Router, TypeScript, Tailwind CSS, Turbopack
- **Storage**: SQLite via `better-sqlite3` — file-based, zero infrastructure
- **AI runtime**: `@anthropic-ai/sdk` — Claude API with tool use for agentic loops
- **Style**: Tailwind utility classes only, no CSS modules

## Critical rules
1. All database access goes through `lib/db.ts` — never raw SQL in components or route handlers
2. Every API route wraps its handler in try/catch and returns `{ error: string }` on failure
3. AI agents use a shared `runAgentLoop()` from `lib/agents/loop.ts` — not one-off LLM calls
4. No `any` types in agent tool definitions
5. Business logic lives in `lib/` — components and routes are thin
