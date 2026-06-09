# Coding Conventions

## TypeScript

- Strict mode is on — no implicit `any`, no `!` non-null assertions unless unavoidable
- Prefer `type` over `interface` for data shapes; `interface` only for extensible contracts
- All agent tool inputs/outputs must be fully typed (no `unknown` without a type guard)

## File naming

- React components: `PascalCase.tsx` in `components/`
- Utilities and lib: `camelCase.ts` in `lib/`
- API routes: `route.ts` per Next.js App Router convention
- Agent files: `lib/agents/[feature].ts`

## API routes

Every route handler follows this pattern:

```typescript
export async function GET(request: Request) {
  try {
    const data = db.getSomething()
    return Response.json(data)
  } catch (error) {
    return Response.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
```

- Always return `{ error: string }` with appropriate status on failure
- No business logic in route files — delegate to `lib/db.ts` or `lib/agents/`

## Components

- No business logic in components — only UI state and event handlers
- Fetch calls go in the component or a small custom hook, not in lib
- Tailwind only for styling — no inline styles, no CSS modules

## Imports

- Use `@/` alias for all internal imports (configured in tsconfig)
- Group: external packages → internal lib → components → types
- No barrel files (`index.ts`) — import directly from the source file

## Comments

Write comments only for non-obvious WHY, not WHAT. One line max. No docstrings.

## Error handling

- Validate at API boundaries only (check required fields on POST)
- Trust SQLite constraints for data integrity
- Surface errors to UI as toast or inline message — never swallow silently
