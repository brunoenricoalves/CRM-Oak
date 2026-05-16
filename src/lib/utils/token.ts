export function isTokenExpired(expiresAt: string): boolean {
  const expiry = new Date(expiresAt)
  if (isNaN(expiry.getTime())) throw new Error(`Invalid expiresAt: ${expiresAt}`)
  return expiry < new Date()
}
