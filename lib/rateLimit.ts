// Simple in-memory rate limiter. Resets on server restart.
// For multi-instance deployments, replace with Redis-backed rate limiting.
const store = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(ip: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = store.get(ip)
  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}
