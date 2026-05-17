const GAP = 1000
const REBALANCE_THRESHOLD = 0.001

export function getInsertPosition(positions: number[]): number {
  if (positions.length === 0) return GAP
  return Math.max(...positions) + GAP
}

export function getInsertBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return GAP
  if (before === null) return after! / 2
  if (after === null) return before + GAP
  return (before + after) / 2
}

export function needsRebalance(positions: number[]): boolean {
  if (positions.length < 2) return false
  const sorted = [...positions].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] < REBALANCE_THRESHOLD) return true
  }
  return false
}

export function rebalancePositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * GAP)
}
