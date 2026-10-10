import { describe, expect, it } from 'vitest'
import {
  grainAllowsOrientation,
  isInBounds,
  orientationsForPart,
  packingBinSize,
  packingPartSize,
  rectsOverlap,
} from './geometry'
import { nestSheets, validateNestResult } from './nest'
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

  it('expands packing sizes by kerf', () => {
    expect(packingPartSize(100, 50, 3)).toEqual({ width: 103, height: 53 })
    expect(packingBinSize(2800, 2070, 3)).toEqual({
      width: 2803,
      height: 2073,
    })
  })
})

describe('grain and rotation', () => {
  it('allows any orientation when grain not respected', () => {
    expect(grainAllowsOrientation('length', 'width', false, false)).toBe(true)
    expect(grainAllowsOrientation('length', 'width', true, false)).toBe(true)
  })

  it('requires grain alignment when respected', () => {
    // Sheet grain along X (length); part grain along length → OK unrotated
    expect(grainAllowsOrientation('length', 'length', false, true)).toBe(true)
    // Rotating swaps part grain to Y → not OK
    expect(grainAllowsOrientation('length', 'length', true, true)).toBe(false)
    // Part grain along width: unrotated runs along Y → not OK on length sheet
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
    allowRotate: true,
    respectGrain: false,
    mode: 'maxrects',
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
    const r1 = nestSheets(parts, sheet, { ...baseSettings, mode: 'guillotine' })
    const r2 = nestSheets(parts, sheet, { ...baseSettings, mode: 'guillotine' })
    expect(r1).toEqual(r2)
  })

  it('leaves kerf gap between neighbouring parts', () => {
    const parts: NestPartInput[] = [
      { id: 'a', name: 'A', width: 100, height: 100, quantity: 2, grain: 'none' },
    ]
    const smallSheet: NestSheetSpec = {
      width: 250,
      height: 100,
      grain: 'none',
      availableCount: 1,
    }
    const result = nestSheets(parts, smallSheet, { ...baseSettings, kerf: 3 })
    expect(result.stats.placedCount).toBe(2)
    const [p1, p2] = [...result.sheets[0].parts].sort((a, b) => a.x - b.x)
    // With kerf 3, second part should start at least 103mm from first origin
    expect(p2.x).toBeGreaterThanOrEqual(p1.x + p1.width + 3 - 1e-6)
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
    // Sheet only 1500 wide — would need rotate, but grain forbids it
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

  it('guillotine mode also produces valid layouts', () => {
    const parts: NestPartInput[] = [
      { id: 'a', name: 'A', width: 900, height: 400, quantity: 5, grain: 'none' },
    ]
    const result = nestSheets(parts, sheet, {
      ...baseSettings,
      mode: 'guillotine',
    })
    expect(validateNestResult(result)).toEqual([])
    expect(result.stats.placedCount).toBe(5)
  })
})
