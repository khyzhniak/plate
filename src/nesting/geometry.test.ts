import { describe, expect, it } from 'vitest'
import {
  grainAllowsOrientation,
  isInBounds,
  orientationsForPart,
  packingBinSize,
  packingPartSize,
  rectsOverlap,
  usableSheetRect,
} from './geometry'
import {
  minAdjacentKerf,
  nestSheets,
  validateGuillotineCuts,
  validateNestResult,
} from './nest'
import type { NestPartInput, NestSettings, NestSheetSpec } from './types'

describe('geometry', () => {
  it('detects overlap and non-overlap', () => {
    expect(
      rectsOverlap(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 50, y: 50, width: 100, height: 100 },
      ),
    ).toBe(true)
    expect(
      rectsOverlap(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 100, y: 0, width: 100, height: 100 },
      ),
    ).toBe(false)
  })

  it('checks sheet bounds', () => {
    expect(isInBounds({ x: 0, y: 0, width: 100, height: 50 }, 100, 50)).toBe(
      true,
    )
    expect(isInBounds({ x: 1, y: 0, width: 100, height: 50 }, 100, 50)).toBe(
      false,
    )
  })

  it('expands packing sizes by kerf and insets by edge trim', () => {
    expect(packingPartSize(100, 50, 3)).toEqual({ width: 103, height: 53 })
    expect(packingBinSize(2800, 2070, 3)).toEqual({
      width: 2803,
      height: 2073,
    })
    expect(packingBinSize(2800, 2070, 3, 3)).toEqual({
      width: 2800 - 6 + 3,
      height: 2070 - 6 + 3,
    })
    expect(usableSheetRect(2800, 2070, 3)).toEqual({
      x: 3,
      y: 3,
      width: 2794,
      height: 2064,
    })
  })
})

describe('grain and rotation', () => {
  it('allows any orientation when grain not respected', () => {
    expect(grainAllowsOrientation('length', 'width', false, false)).toBe(true)
    expect(grainAllowsOrientation('length', 'width', true, false)).toBe(true)
  })

  it('requires grain alignment when respected', () => {
    expect(grainAllowsOrientation('length', 'length', false, true)).toBe(true)
    expect(grainAllowsOrientation('length', 'length', true, true)).toBe(false)
    expect(grainAllowsOrientation('length', 'width', false, true)).toBe(false)
    expect(grainAllowsOrientation('length', 'width', true, true)).toBe(true)
  })

  it('lists allowed orientations', () => {
    const both = orientationsForPart(100, 50, 'none', 'length', true, true)
    expect(both).toHaveLength(2)

    const grainLocked = orientationsForPart(
      100,
      50,
      'length',
      'length',
      true,
      true,
    )
    expect(grainLocked).toEqual([{ width: 100, height: 50, rotated: false }])
  })
})

describe('nestSheets', () => {
  const sheet: NestSheetSpec = {
    width: 2800,
    height: 2070,
    grain: 'length',
    availableCount: 5,
  }

  const baseSettings: NestSettings = {
    kerf: 3,
    edgeTrim: 3,
    allowRotate: true,
    respectGrain: false,
    mode: 'guillotine',
  }

  it('places parts without overlap and within bounds', () => {
    const parts: NestPartInput[] = [
      { id: 'a', name: 'A', width: 800, height: 400, quantity: 4, grain: 'none' },
      { id: 'b', name: 'B', width: 600, height: 600, quantity: 2, grain: 'none' },
    ]
    const result = nestSheets(parts, sheet, baseSettings)
    expect(validateNestResult(result)).toEqual([])
    expect(result.stats.placedCount).toBe(6)
    expect(result.unplaced).toHaveLength(0)
  })

  it('is deterministic for identical inputs', () => {
    const parts: NestPartInput[] = [
      { id: 'a', name: 'Бік', width: 720, height: 560, quantity: 6, grain: 'length' },
      { id: 'b', name: 'Дно', width: 1000, height: 500, quantity: 3, grain: 'none' },
    ]
    const r1 = nestSheets(parts, sheet, baseSettings)
    const r2 = nestSheets(parts, sheet, baseSettings)
    expect(r1).toEqual(r2)
  })

  it('leaves kerf gap between neighbouring parts', () => {
    const parts: NestPartInput[] = [
      { id: 'a', name: 'A', width: 100, height: 100, quantity: 2, grain: 'none' },
    ]
    const smallSheet: NestSheetSpec = {
      width: 250,
      height: 120,
      grain: 'none',
      availableCount: 1,
    }
    const result = nestSheets(parts, smallSheet, {
      ...baseSettings,
      kerf: 3,
      edgeTrim: 3,
    })
    expect(result.stats.placedCount).toBe(2)
    const [p1, p2] = [...result.sheets[0].parts].sort((a, b) => a.x - b.x || a.y - b.y)
    const gapX = p2.x - (p1.x + p1.width)
    const gapY = p2.y - (p1.y + p1.height)
    const gap = Math.max(gapX, gapY)
    expect(gap).toBeGreaterThanOrEqual(3 - 1e-6)
    expect(minAdjacentKerf(result)).toBeGreaterThanOrEqual(3 - 1e-6)
  })

  it('insets all parts by perimeter edge trim', () => {
    const parts: NestPartInput[] = [
      { id: 'a', name: 'A', width: 200, height: 100, quantity: 3, grain: 'none' },
    ]
    const result = nestSheets(parts, sheet, {
      ...baseSettings,
      kerf: 3,
      edgeTrim: 3,
    })
    expect(result.stats.placedCount).toBe(3)
    const sh = result.sheets[0]
    expect(sh.usableX).toBe(3)
    expect(sh.usableY).toBe(3)
    for (const p of sh.parts) {
      expect(p.x).toBeGreaterThanOrEqual(3 - 1e-9)
      expect(p.y).toBeGreaterThanOrEqual(3 - 1e-9)
      expect(p.x + p.width).toBeLessThanOrEqual(sheet.width - 3 + 1e-9)
      expect(p.y + p.height).toBeLessThanOrEqual(sheet.height - 3 + 1e-9)
    }
    expect(validateNestResult(result)).toEqual([])
  })

  it('guillotine layouts only use through-cuts', () => {
    const parts: NestPartInput[] = [
      { id: 'a', name: 'A', width: 900, height: 400, quantity: 5, grain: 'none' },
      { id: 'b', name: 'B', width: 600, height: 500, quantity: 3, grain: 'none' },
    ]
    const result = nestSheets(parts, sheet, {
      ...baseSettings,
      mode: 'guillotine',
    })
    expect(validateNestResult(result)).toEqual([])
    expect(validateGuillotineCuts(result)).toEqual([])
    expect(result.sheets[0].cuts.length).toBeGreaterThan(0)
    for (const cut of result.sheets[0].cuts) {
      expect(cut.end - cut.start).toBeGreaterThan(1)
      // Through-cut spans the recorded panel edge-to-edge
      if (cut.orientation === 'vertical') {
        expect(cut.start).toBeCloseTo(cut.panel.y, 3)
        expect(cut.end).toBeCloseTo(cut.panel.y + cut.panel.height, 3)
      } else {
        expect(cut.start).toBeCloseTo(cut.panel.x, 3)
        expect(cut.end).toBeCloseTo(cut.panel.x + cut.panel.width, 3)
      }
    }
    // Part numbers follow cut/placement order
    const orders = result.sheets[0].parts.map((p) => p.cutOrder)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })

  it('reports oversized parts as unplaced', () => {
    const parts: NestPartInput[] = [
      {
        id: 'huge',
        name: 'Велика',
        width: 3000,
        height: 3000,
        quantity: 1,
        grain: 'none',
      },
    ]
    const result = nestSheets(parts, sheet, baseSettings)
    expect(result.unplaced).toHaveLength(1)
    expect(result.unplaced[0].reason).toMatch(/більша за лист/)
  })

  it('respects grain and blocks invalid rotation', () => {
    const parts: NestPartInput[] = [
      {
        id: 'g',
        name: 'З малюнком',
        width: 2000,
        height: 100,
        quantity: 1,
        grain: 'length',
      },
    ]
    const narrow: NestSheetSpec = {
      width: 1500,
      height: 2070,
      grain: 'length',
      availableCount: 1,
    }
    const result = nestSheets(parts, narrow, {
      ...baseSettings,
      allowRotate: true,
      respectGrain: true,
    })
    expect(result.unplaced).toHaveLength(1)
    expect(result.unplaced[0].reason).toMatch(/малюнка|більша/)
  })
})
