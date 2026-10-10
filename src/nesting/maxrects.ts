import type { FreeRect, PackCandidate } from './types'
import { almostEqual } from './geometry'

/** MaxRects Best Short Side Fit (BSSF) free-rectangle packer. */

export function createFreeRects(binW: number, binH: number): FreeRect[] {
  return [{ x: 0, y: 0, width: binW, height: binH }]
}

export function findBestMaxRectsPlacement(
  freeRects: FreeRect[],
  partW: number,
  partH: number,
): PackCandidate | null {
  let best: PackCandidate | null = null

  for (let i = 0; i < freeRects.length; i++) {
    const fr = freeRects[i]
    if (partW <= fr.width + 1e-9 && partH <= fr.height + 1e-9) {
      const leftoverHoriz = fr.width - partW
      const leftoverVert = fr.height - partH
      const shortSide = Math.min(leftoverHoriz, leftoverVert)
      const longSide = Math.max(leftoverHoriz, leftoverVert)
      const candidate: PackCandidate = {
        freeIndex: i,
        x: fr.x,
        y: fr.y,
        width: partW,
        height: partH,
        rotated: false,
        score: shortSide,
        scoreSecondary: longSide,
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

export function placeInMaxRects(
  freeRects: FreeRect[],
  x: number,
  y: number,
  width: number,
  height: number,
): FreeRect[] {
  const placed = { x, y, width, height }
  let next = splitFreeRects(freeRects, placed)
  next = pruneFreeRects(next)
  return next
}

function splitFreeRects(
  freeRects: FreeRect[],
  used: FreeRect,
): FreeRect[] {
  const result: FreeRect[] = []

  for (const fr of freeRects) {
    if (!intersects(fr, used)) {
      result.push(fr)
      continue
    }

    // Left
    if (used.x > fr.x + 1e-9) {
      result.push({
        x: fr.x,
        y: fr.y,
        width: used.x - fr.x,
        height: fr.height,
      })
    }
    // Right
    if (used.x + used.width < fr.x + fr.width - 1e-9) {
      result.push({
        x: used.x + used.width,
        y: fr.y,
        width: fr.x + fr.width - (used.x + used.width),
        height: fr.height,
      })
    }
    // Bottom
    if (used.y > fr.y + 1e-9) {
      result.push({
        x: fr.x,
        y: fr.y,
        width: fr.width,
        height: used.y - fr.y,
      })
    }
    // Top
    if (used.y + used.height < fr.y + fr.height - 1e-9) {
      result.push({
        x: fr.x,
        y: used.y + used.height,
        width: fr.width,
        height: fr.y + fr.height - (used.y + used.height),
      })
    }
  }

  return result
}

function intersects(a: FreeRect, b: FreeRect): boolean {
  return (
    a.x < b.x + b.width - 1e-9 &&
    a.x + a.width > b.x + 1e-9 &&
    a.y < b.y + b.height - 1e-9 &&
    a.y + a.height > b.y + 1e-9
  )
}

function isContainedIn(a: FreeRect, b: FreeRect): boolean {
  return (
    a.x >= b.x - 1e-9 &&
    a.y >= b.y - 1e-9 &&
    a.x + a.width <= b.x + b.width + 1e-9 &&
    a.y + a.height <= b.y + b.height + 1e-9
  )
}

function pruneFreeRects(rects: FreeRect[]): FreeRect[] {
  const pruned: FreeRect[] = []
  for (let i = 0; i < rects.length; i++) {
    const a = rects[i]
    if (a.width <= 1e-9 || a.height <= 1e-9) continue
    let contained = false
    for (let j = 0; j < rects.length; j++) {
      if (i === j) continue
      if (isContainedIn(a, rects[j])) {
        contained = true
        break
      }
    }
    if (!contained) pruned.push(a)
  }
  return pruned
}
