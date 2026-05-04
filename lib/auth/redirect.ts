export function sanitizeAuthRedirectPath(input: string | null): string {
  if (!input) return '/analyze'
  if (!input.startsWith('/')) return '/analyze'
  if (input.startsWith('//')) return '/analyze'
  return input
}
