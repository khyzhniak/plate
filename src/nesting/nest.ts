import {
  area,
  isInBounds,
  orientationsForPart,
  packingBinSize,
  packingPartSize,
  rectsOverlap,
} from './geometry'
import {
  createFreeRects,
  findBestMaxRectsPlacement,
  placeInMaxRects,
} from './maxrects'
import {
  createGuillotineFreeRects,
  findBestGuillotinePlacement,
  placeInGuillotine,
} from './guillotine'
import type {
  FreeRect,
  NestPartInput,
  NestResult,
  NestSettings,
  NestSheetResult,
  NestSheetSpec,
  PackCandidate,
  PlacedPart,
  UnplacedPart,
} from './types'

interface ExpandedInstance {
  partId: string
  instanceIndex: number
  name: string
  width: number
  height: number
  grain: NestPartInput['grain']
  area: number
}

/**
 * Deterministic 2D sheet nesting.
 * Same inputs always produce the same placement.
 */
export function nestSheets(
  parts: NestPartInput[],
  sheet: NestSheetSpec,
  settings: NestSettings,
): NestResult {
  const kerf = Math.max(0, settings.kerf)
  const instances = expandAndSort(parts)
  const maxSheets =
    Number.isFinite(sheet.availableCount) && sheet.availableCount > 0
      ? Math.floor(sheet.availableCount)
      : Number.POSITIVE_INFINITY

  const sheets: NestSheetResult[] = []
  const unplaced: UnplacedPart[] = []
  let sheetIndex = 0
  let remaining = [...instances]

  while (remaining.length > 0) {
    if (sheetIndex >= maxSheets) {
      for (const inst of remaining) {
        unplaced.push({
          partId: inst.partId,
          instanceIndex: inst.instanceIndex,
          name: inst.name,
          width: inst.width,
          height: inst.height,
          reason: 'Немає вільних листів (ліміт матеріалу)',
        })
      }
      break
    }

    const { placed, leftover, failed } = packOneSheet(
      remaining,
      sheet,
      settings,
      kerf,
      sheetIndex,
    )

    if (placed.length === 0) {
      // Nothing fits on a fresh sheet — mark all remaining as unfit
      for (const inst of leftover.length ? leftover : remaining) {
        const reason = failed.get(keyOf(inst)) ?? describeFitFailure(inst, sheet, settings)
        unplaced.push({
          partId: inst.partId,
          instanceIndex: inst.instanceIndex,
          name: inst.name,
          width: inst.width,
          height: inst.height,
          reason,
        })
      }
      break
    }

    const usedArea = placed.reduce((s, p) => s + area(p.width, p.height), 0)
    const sheetArea = area(sheet.width, sheet.height)
    sheets.push({
      index: sheetIndex,
      width: sheet.width,
      height: sheet.height,
      grain: sheet.grain,
      parts: placed,
      usedArea,
      sheetArea,
      utilization: sheetArea > 0 ? (usedArea / sheetArea) * 100 : 0,
    })

    remaining = leftover
    sheetIndex += 1
  }

  return buildResult(sheets, unplaced, sheet)
}

function expandAndSort(parts: NestPartInput[]): ExpandedInstance[] {
  const out: ExpandedInstance[] = []
  // Stable order: input order, then instance index
  for (const part of parts) {
    const qty = Math.max(0, Math.floor(part.quantity))
    for (let i = 0; i < qty; i++) {
      out.push({
        partId: part.id,
        instanceIndex: i,
        name: part.name,
        width: part.width,
        height: part.height,
        grain: part.grain,
        area: area(part.width, part.height),
      })
    }
  }
  // Largest area first; tie-break by partId then instance for determinism
  out.sort((a, b) => {
    if (b.area !== a.area) return b.area - a.area
    if (a.partId !== b.partId) return a.partId < b.partId ? -1 : 1
    return a.instanceIndex - b.instanceIndex
  })
  return out
}

function keyOf(inst: ExpandedInstance): string {
  return `${inst.partId}#${inst.instanceIndex}`
}

function packOneSheet(
  instances: ExpandedInstance[],
  sheet: NestSheetSpec,
  settings: NestSettings,
  kerf: number,
  sheetIndex: number,
): {
  placed: PlacedPart[]
  leftover: ExpandedInstance[]
  failed: Map<string, string>
} {
  const bin = packingBinSize(sheet.width, sheet.height, kerf)
  let freeRects: FreeRect[] =
    settings.mode === 'guillotine'
      ? createGuillotineFreeRects(bin.width, bin.height)
      : createFreeRects(bin.width, bin.height)

  const placed: PlacedPart[] = []
  const leftover: ExpandedInstance[] = []
  const failed = new Map<string, string>()

  for (const inst of instances) {
    const orientations = orientationsForPart(
      inst.width,
      inst.height,
      inst.grain,
      sheet.grain,
      settings.allowRotate,
      settings.respectGrain,
    )

    if (orientations.length === 0) {
      leftover.push(inst)
      failed.set(
        keyOf(inst),
        'Жодна орієнтація не відповідає напрямку малюнка',
      )
      continue
    }

    let best: (PackCandidate & { rotated: boolean }) | null = null

    for (const ori of orientations) {
      const packSize = packingPartSize(ori.width, ori.height, kerf)
      const candidate =
        settings.mode === 'guillotine'
          ? findBestGuillotinePlacement(freeRects, packSize.width, packSize.height)
          : findBestMaxRectsPlacement(freeRects, packSize.width, packSize.height)

      if (!candidate) continue

      const scored = {
        ...candidate,
        rotated: ori.rotated,
        width: packSize.width,
        height: packSize.height,
      }

      if (
        !best ||
        scored.score < best.score - 1e-9 ||
        (Math.abs(scored.score - best.score) < 1e-9 &&
          scored.scoreSecondary < best.scoreSecondary - 1e-9) ||
        (Math.abs(scored.score - best.score) < 1e-9 &&
          Math.abs(scored.scoreSecondary - best.scoreSecondary) < 1e-9 &&
          (scored.y < best.y - 1e-9 ||
            (Math.abs(scored.y - best.y) < 1e-9 && scored.x < best.x - 1e-9))) ||
        (Math.abs(scored.score - best.score) < 1e-9 &&
          Math.abs(scored.scoreSecondary - best.scoreSecondary) < 1e-9 &&
          Math.abs(scored.y - best.y) < 1e-9 &&
          Math.abs(scored.x - best.x) < 1e-9 &&
          Number(scored.rotated) < Number(best.rotated))
      ) {
        best = scored
      }
    }

    if (!best) {
      leftover.push(inst)
      failed.set(keyOf(inst), describeFitFailure(inst, sheet, settings))
      continue
    }

    const partW = best.rotated ? inst.height : inst.width
    const partH = best.rotated ? inst.width : inst.height

    const placedPart: PlacedPart = {
      partId: inst.partId,
      instanceIndex: inst.instanceIndex,
      name: inst.name,
      sheetIndex,
      x: best.x,
      y: best.y,
      width: partW,
      height: partH,
      rotated: best.rotated,
      grain: inst.grain,
    }

    // Validate against real sheet bounds (not packing bin)
    if (!isInBounds(placedPart, sheet.width, sheet.height)) {
      leftover.push(inst)
      failed.set(keyOf(inst), 'Деталь не вміщується в межі листа')
      continue
    }

    if (placed.some((p) => rectsOverlap(p, placedPart))) {
      leftover.push(inst)
      failed.set(keyOf(inst), 'Перетин з уже розміщеною деталлю')
      continue
    }

    if (settings.mode === 'guillotine') {
      freeRects = placeInGuillotine(
        freeRects,
        best.freeIndex,
        best.x,
        best.y,
        best.width,
        best.height,
      )
    } else {
      freeRects = placeInMaxRects(
        freeRects,
        best.x,
        best.y,
        best.width,
        best.height,
      )
    }

    placed.push(placedPart)
  }

  // Sort placed by position for stable SVG numbering
  placed.sort((a, b) => a.y - b.y || a.x - b.x)

  return { placed, leftover, failed }
}

function describeFitFailure(
  inst: ExpandedInstance,
  sheet: NestSheetSpec,
  settings: NestSettings,
): string {
  const orientations = orientationsForPart(
    inst.width,
    inst.height,
    inst.grain,
    sheet.grain,
    settings.allowRotate,
    settings.respectGrain,
  )
  if (orientations.length === 0) {
    return 'Жодна орієнтація не відповідає напрямку малюнка'
  }
  const fitsSheet = orientations.some(
    (o) => o.width <= sheet.width + 1e-9 && o.height <= sheet.height + 1e-9,
  )
  if (!fitsSheet) {
    return `Деталь ${inst.width}×${inst.height} мм більша за лист ${sheet.width}×${sheet.height} мм`
  }
  return 'Немає вільного місця на листі з урахуванням пропилу'
}

function buildResult(
  sheets: NestSheetResult[],
  unplaced: UnplacedPart[],
  sheet: NestSheetSpec,
): NestResult {
  const totalSheetArea = sheets.reduce((s, sh) => s + sh.sheetArea, 0)
  const totalPartsArea = sheets.reduce((s, sh) => s + sh.usedArea, 0)
  const placedCount = sheets.reduce((s, sh) => s + sh.parts.length, 0)

  return {
    sheets,
    unplaced,
    stats: {
      sheetsUsed: sheets.length,
      sheetsAvailable: Number.isFinite(sheet.availableCount)
        ? sheet.availableCount
        : sheets.length,
      totalSheetArea,
      totalPartsArea,
      totalWasteArea: Math.max(0, totalSheetArea - totalPartsArea),
      utilizationPercent:
        totalSheetArea > 0 ? (totalPartsArea / totalSheetArea) * 100 : 0,
      placedCount,
      unplacedCount: unplaced.length,
    },
  }
}

/** Validate a result has no overlaps and all parts in bounds. */
export function validateNestResult(result: NestResult): string[] {
  const errors: string[] = []
  for (const sheet of result.sheets) {
    for (let i = 0; i < sheet.parts.length; i++) {
      const a = sheet.parts[i]
      if (!isInBounds(a, sheet.width, sheet.height)) {
        errors.push(
          `Sheet ${sheet.index}: part ${a.name} out of bounds at (${a.x},${a.y})`,
        )
      }
      for (let j = i + 1; j < sheet.parts.length; j++) {
        const b = sheet.parts[j]
        if (rectsOverlap(a, b)) {
          errors.push(
            `Sheet ${sheet.index}: overlap between ${a.name} and ${b.name}`,
          )
        }
      }
    }
  }
  return errors
}
