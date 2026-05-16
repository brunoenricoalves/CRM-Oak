export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}
