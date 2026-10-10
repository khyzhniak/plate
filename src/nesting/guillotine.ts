import type { FreeRect, PackCandidate } from './types'
import { almostEqual } from './geometry'

/**
 * Guillotine packer with through-cut splits (SAS — Short Axis Split).
 * Favours long through-cuts suitable for panel saws.
 */

export function createGuillotineFreeRects(
  binW: number,
  binH: number,
): FreeRect[] {
  return [{ x: 0, y: 0, width: binW, height: binH }]
}

export function findBestGuillotinePlacement(
  freeRects: FreeRect[],
  partW: number,
  partH: number,
): PackCandidate | null {
  let best: PackCandidate | null = null

  for (let i = 0; i < freeRects.length; i++) {
    const fr = freeRects[i]
    if (partW <= fr.width + 1e-9 && partH <= fr.height + 1e-9) {
      // Prefer placements that leave long through-cut remnants
      const leftoverHoriz = fr.width - partW
      const leftoverVert = fr.height - partH
      // Area fit primary, then prefer larger remaining through-cut axis
      const score = leftoverHoriz * leftoverVert
      const throughCut = Math.max(leftoverHoriz, leftoverVert)
      const candidate: PackCandidate = {
        freeIndex: i,
        x: fr.x,
        y: fr.y,
        width: partW,
        height: partH,
        rotated: false,
        score,
        scoreSecondary: -throughCut,
      }
      if (
        !best ||
        candidate.score < best.score - 1e-9 ||
        (almostEqual(candidate.score, best.score) &&
          candidate.scoreSecondary < best.scoreSecondary - 1e-9) ||
        (almostEqual(candidate.score, best.score) &&
          almostEqual(candidate.scoreSecondary, best.scoreSecondary) &&
          (candidate.y < best.y - 1e-9 ||
            (almostEqual(candidate.y, best.y) && candidate.x < best.x - 1e-9)))
      ) {
        best = candidate
      }
    }
  }

  return best
}

export function placeInGuillotine(
  freeRects: FreeRect[],
  freeIndex: number,
  x: number,
  y: number,
  width: number,
  height: number,
): FreeRect[] {
  const fr = freeRects[freeIndex]
  const next = freeRects.filter((_, i) => i !== freeIndex)

  const rightW = fr.x + fr.width - (x + width)
  const topH = fr.y + fr.height - (y + height)

  // Short Axis Split: cut along the shorter leftover first (through-cut)
  const splitHorizontal = fr.width <= fr.height

  if (splitHorizontal) {
    // Vertical through-cut beside the part, then horizontal above
    if (rightW > 1e-9) {
      next.push({ x: x + width, y: fr.y, width: rightW, height: fr.height })
    }
    if (topH > 1e-9) {
      next.push({ x: fr.x, y: y + height, width: width, height: topH })
    }
  } else {
    // Horizontal through-cut above the part, then vertical beside
    if (topH > 1e-9) {
      next.push({ x: fr.x, y: y + height, width: fr.width, height: topH })
    }
    if (rightW > 1e-9) {
      next.push({ x: x + width, y: fr.y, width: rightW, height: height })
    }
  }

  return next.filter((r) => r.width > 1e-9 && r.height > 1e-9)
}
