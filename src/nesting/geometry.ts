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
 * Packing bin is expanded by kerf so parts can sit flush on sheet edges
 * while still leaving kerf between neighbouring parts.
 */
export function packingBinSize(sheetW: number, sheetH: number, kerf: number) {
  return { width: sheetW + kerf, height: sheetH + kerf }
}

/** Effective rectangle size used by the packer (part + kerf gap). */
export function packingPartSize(width: number, height: number, kerf: number) {
  return { width: width + kerf, height: height + kerf }
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
