import type { GrainDirection } from './types'

export function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  epsilon = 1e-9,
): boolean {
  return (
    a.x < b.x + b.width - epsilon &&
    a.x + a.width > b.x + epsilon &&
    a.y < b.y + b.height - epsilon &&
    a.y + a.height > b.y + epsilon
  )
}

export function isInBounds(
  part: { x: number; y: number; width: number; height: number },
  sheetW: number,
  sheetH: number,
  epsilon = 1e-9,
): boolean {
  return (
    part.x >= -epsilon &&
    part.y >= -epsilon &&
    part.x + part.width <= sheetW + epsilon &&
    part.y + part.height <= sheetH + epsilon
  )
}

/**
 * Usable nesting rectangle after perimeter edge trim on all four sides.
 */
export function usableSheetRect(
  sheetW: number,
  sheetH: number,
  edgeTrim: number,
): { x: number; y: number; width: number; height: number } {
  const trim = Math.max(0, edgeTrim)
  const width = Math.max(0, sheetW - 2 * trim)
  const height = Math.max(0, sheetH - 2 * trim)
  return { x: trim, y: trim, width, height }
}

/**
 * Packing bin for the usable area, expanded by kerf so parts can sit flush
 * on the usable edges while still leaving kerf between neighbouring parts.
 */
export function packingBinSize(
  sheetW: number,
  sheetH: number,
  kerf: number,
  edgeTrim = 0,
) {
  const usable = usableSheetRect(sheetW, sheetH, edgeTrim)
  return { width: usable.width + kerf, height: usable.height + kerf }
}

/** Effective rectangle size used by the packer (part + kerf gap). */
export function packingPartSize(width: number, height: number, kerf: number) {
  return { width: width + kerf, height: height + kerf }
}

/**
 * Minimum gap between two non-overlapping axis-aligned rects
 * (0 if they touch or overlap). Uses Chebyshev edge distance.
 */
export function minGapBetween(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): number {
  const gapX = Math.max(0, Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width)))
  const gapY = Math.max(0, Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height)))
  if (gapX > 0 && gapY > 0) {
    // Diagonal separation — not adjacent
    return Math.hypot(gapX, gapY)
  }
  return Math.max(gapX, gapY)
}

/** True if parts share an edge projection and are neighbours along one axis. */
export function areAdjacentWithGap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  expectedGap: number,
  epsilon = 1e-6,
): boolean {
  const overlapY =
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > epsilon
  const overlapX =
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > epsilon

  if (overlapY && !overlapX) {
    const gap = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width))
    return Math.abs(gap - expectedGap) <= epsilon
  }
  if (overlapX && !overlapY) {
    const gap = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height))
    return Math.abs(gap - expectedGap) <= epsilon
  }
  return false
}

/**
 * Whether a part orientation is allowed under grain rules.
 * Sheet grain `length` runs along sheet width (X); `width` along sheet height (Y).
 * Part grain `length` runs along part width; `width` along part height.
 * After rotation, axes swap.
 */
export function grainAllowsOrientation(
  sheetGrain: GrainDirection,
  partGrain: GrainDirection,
  rotated: boolean,
  respectGrain: boolean,
): boolean {
  if (!respectGrain) return true
  if (sheetGrain === 'none' || partGrain === 'none') return true

  const partAlongX = rotated
    ? partGrain === 'width'
    : partGrain === 'length'

  const sheetAlongX = sheetGrain === 'length'
  return partAlongX === sheetAlongX
}

export function orientationsForPart(
  width: number,
  height: number,
  partGrain: GrainDirection,
  sheetGrain: GrainDirection,
  allowRotate: boolean,
  respectGrain: boolean,
): Array<{ width: number; height: number; rotated: boolean }> {
  const opts: Array<{ width: number; height: number; rotated: boolean }> = []

  if (grainAllowsOrientation(sheetGrain, partGrain, false, respectGrain)) {
    opts.push({ width, height, rotated: false })
  }

  if (allowRotate && (width !== height || partGrain !== 'none')) {
    if (grainAllowsOrientation(sheetGrain, partGrain, true, respectGrain)) {
      const already =
        opts.length === 1 && opts[0].width === height && opts[0].height === width
      if (!already) {
        opts.push({ width: height, height: width, rotated: true })
      }
    }
  }

  return opts
}

export function area(width: number, height: number): number {
  return width * height
}

export function almostEqual(a: number, b: number, epsilon = 1e-9): boolean {
  return Math.abs(a - b) < epsilon
}
