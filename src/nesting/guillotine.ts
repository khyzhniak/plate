import type {
  CutOrientation,
  FreeRect,
  GuillotinePlaceResult,
  PackCandidate,
} from './types'
import { almostEqual } from './geometry'

/**
 * Guillotine packer with through-cut splits (SAS — Short Axis Split).
 * Each placement only creates edge-to-edge cuts on the current free panel —
 * never a pocket cut in the middle of the sheet. Suitable for panel / format saws.
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

/**
 * Place a packed rectangle into a free panel using Short Axis Split.
 * Returns updated free rects and the through-cuts performed on that panel.
 */
export function placeInGuillotine(
  freeRects: FreeRect[],
  freeIndex: number,
  x: number,
  y: number,
  width: number,
  height: number,
): GuillotinePlaceResult {
  const fr = freeRects[freeIndex]
  const next = freeRects.filter((_, i) => i !== freeIndex)
  const cuts: GuillotinePlaceResult['cuts'] = []

  const rightW = fr.x + fr.width - (x + width)
  const topH = fr.y + fr.height - (y + height)

  // Short Axis Split: cut along the shorter leftover first (through-cut)
  const splitHorizontal = fr.width <= fr.height

  if (splitHorizontal) {
    // Vertical through-cut beside the part across full free-panel height
    if (rightW > 1e-9) {
      cuts.push({
        orientation: 'vertical',
        position: x + width,
        start: fr.y,
        end: fr.y + fr.height,
        panel: { ...fr },
      })
      next.push({ x: x + width, y: fr.y, width: rightW, height: fr.height })
    }
    // Horizontal through-cut above the part across the part column width
    if (topH > 1e-9) {
      const panel: FreeRect = { x: fr.x, y: fr.y, width, height: fr.height }
      cuts.push({
        orientation: 'horizontal',
        position: y + height,
        start: fr.x,
        end: fr.x + width,
        panel,
      })
      next.push({ x: fr.x, y: y + height, width, height: topH })
    }
  } else {
    // Horizontal through-cut above the part across full free-panel width
    if (topH > 1e-9) {
      cuts.push({
        orientation: 'horizontal',
        position: y + height,
        start: fr.x,
        end: fr.x + fr.width,
        panel: { ...fr },
      })
      next.push({ x: fr.x, y: y + height, width: fr.width, height: topH })
    }
    // Vertical through-cut beside the part across the part row height
    if (rightW > 1e-9) {
      const panel: FreeRect = { x: fr.x, y: fr.y, width: fr.width, height }
      cuts.push({
        orientation: 'vertical',
        position: x + width,
        start: fr.y,
        end: fr.y + height,
        panel,
      })
      next.push({ x: x + width, y: fr.y, width: rightW, height })
    }
  }

  return {
    freeRects: next.filter((r) => r.width > 1e-9 && r.height > 1e-9),
    cuts,
  }
}

/**
 * Validate that every recorded cut is a true through-cut of its panel
 * (spans full panel height for vertical, full width for horizontal).
 */
export function cutsAreThroughCuts(
  cuts: Array<{
    orientation: CutOrientation
    position: number
    start: number
    end: number
    panel: FreeRect
  }>,
  epsilon = 1e-6,
): boolean {
  for (const c of cuts) {
    if (c.orientation === 'vertical') {
      if (Math.abs(c.start - c.panel.y) > epsilon) return false
      if (Math.abs(c.end - (c.panel.y + c.panel.height)) > epsilon) return false
      if (c.position <= c.panel.x + epsilon) return false
      if (c.position >= c.panel.x + c.panel.width - epsilon) return false
    } else {
      if (Math.abs(c.start - c.panel.x) > epsilon) return false
      if (Math.abs(c.end - (c.panel.x + c.panel.width)) > epsilon) return false
      if (c.position <= c.panel.y + epsilon) return false
      if (c.position >= c.panel.y + c.panel.height - epsilon) return false
    }
  }
  return true
}
