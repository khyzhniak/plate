import {
  area,
  isInBounds,
  orientationsForPart,
  packingBinSize,
  packingPartSize,
  rectsOverlap,
  usableSheetRect,
} from './geometry'
import {
  createFreeRects,
  findBestMaxRectsPlacement,
  placeInMaxRects,
} from './maxrects'
import {
  createGuillotineFreeRects,
  cutsAreThroughCuts,
  findBestGuillotinePlacement,
  placeInGuillotine,
} from './guillotine'
import type {
  CutStep,
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
 * Default / primary mode is guillotine (panel-saw through-cuts).
 */
export function nestSheets(
  parts: NestPartInput[],
  sheet: NestSheetSpec,
  settings: NestSettings,
): NestResult {
  const kerf = Math.max(0, settings.kerf)
  const edgeTrim = Math.max(0, settings.edgeTrim ?? 0)
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

    const { placed, leftover, failed, cuts } = packOneSheet(
      remaining,
      sheet,
      settings,
      kerf,
      edgeTrim,
      sheetIndex,
    )

    if (placed.length === 0) {
      for (const inst of leftover.length ? leftover : remaining) {
        const reason = failed.get(keyOf(inst)) ?? describeFitFailure(inst, sheet, settings, edgeTrim)
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
    const usable = usableSheetRect(sheet.width, sheet.height, edgeTrim)
    sheets.push({
      index: sheetIndex,
      width: sheet.width,
      height: sheet.height,
      grain: sheet.grain,
      usableX: usable.x,
      usableY: usable.y,
      usableWidth: usable.width,
      usableHeight: usable.height,
      edgeTrim,
      parts: placed,
      cuts,
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
  edgeTrim: number,
  sheetIndex: number,
): {
  placed: PlacedPart[]
  leftover: ExpandedInstance[]
  failed: Map<string, string>
  cuts: CutStep[]
} {
  const mode = settings.mode === 'maxrects' ? 'maxrects' : 'guillotine'
  const usable = usableSheetRect(sheet.width, sheet.height, edgeTrim)
  const bin = packingBinSize(sheet.width, sheet.height, kerf, edgeTrim)

  let freeRects: FreeRect[] =
    mode === 'guillotine'
      ? createGuillotineFreeRects(bin.width, bin.height)
      : createFreeRects(bin.width, bin.height)

  const placed: PlacedPart[] = []
  const leftover: ExpandedInstance[] = []
  const failed = new Map<string, string>()
  const cuts: CutStep[] = []
  let cutOrder = 0

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
        mode === 'guillotine'
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
      failed.set(keyOf(inst), describeFitFailure(inst, sheet, settings, edgeTrim))
      continue
    }

    const partW = best.rotated ? inst.height : inst.width
    const partH = best.rotated ? inst.width : inst.height

    // Packer coords → sheet coords (offset by edge trim)
    const sheetX = best.x + usable.x
    const sheetY = best.y + usable.y

    cutOrder += 1
    const placedPart: PlacedPart = {
      partId: inst.partId,
      instanceIndex: inst.instanceIndex,
      name: inst.name,
      sheetIndex,
      x: sheetX,
      y: sheetY,
      width: partW,
      height: partH,
      rotated: best.rotated,
      grain: inst.grain,
      cutOrder,
    }

    if (!isInBounds(placedPart, sheet.width, sheet.height)) {
      leftover.push(inst)
      failed.set(keyOf(inst), 'Деталь не вміщується в межі листа')
      cutOrder -= 1
      continue
    }

    // Must stay inside usable (trimmed) area
    if (
      placedPart.x < usable.x - 1e-9 ||
      placedPart.y < usable.y - 1e-9 ||
      placedPart.x + placedPart.width > usable.x + usable.width + 1e-9 ||
      placedPart.y + placedPart.height > usable.y + usable.height + 1e-9
    ) {
      leftover.push(inst)
      failed.set(keyOf(inst), 'Деталь виходить за зону обрізки краю')
      cutOrder -= 1
      continue
    }

    if (placed.some((p) => rectsOverlap(p, placedPart))) {
      leftover.push(inst)
      failed.set(keyOf(inst), 'Перетин з уже розміщеною деталлю')
      cutOrder -= 1
      continue
    }

    if (mode === 'guillotine') {
      const placedResult = placeInGuillotine(
        freeRects,
        best.freeIndex,
        best.x,
        best.y,
        best.width,
        best.height,
      )
      freeRects = placedResult.freeRects

      for (const c of placedResult.cuts) {
        // Packing coords → sheet; clip extents to usable area (kerf lives in gap)
        const ox = usable.x
        const oy = usable.y
        const panel = {
          x: Math.max(usable.x, c.panel.x + ox),
          y: Math.max(usable.y, c.panel.y + oy),
          width: Math.min(
            c.panel.width,
            usable.x + usable.width - Math.max(usable.x, c.panel.x + ox),
          ),
          height: Math.min(
            c.panel.height,
            usable.y + usable.height - Math.max(usable.y, c.panel.y + oy),
          ),
        }
        const isVert = c.orientation === 'vertical'
        const rawStart = (isVert ? c.start + oy : c.start + ox)
        const rawEnd = (isVert ? c.end + oy : c.end + ox)
        const spanMin = isVert ? panel.y : panel.x
        const spanMax = isVert ? panel.y + panel.height : panel.x + panel.width
        cuts.push({
          index: cuts.length + 1,
          sheetIndex,
          orientation: c.orientation,
          // Blade at finished part edge (kerf gap follows)
          position: isVert ? sheetX + partW : sheetY + partH,
          start: Math.max(spanMin, Math.min(rawStart, rawEnd)),
          end: Math.min(spanMax, Math.max(rawStart, rawEnd)),
          panel,
        })
      }
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

  // Keep guillotine cut-order numbering; for maxrects sort by position
  if (mode === 'maxrects') {
    placed.sort((a, b) => a.y - b.y || a.x - b.x)
    placed.forEach((p, i) => {
      p.cutOrder = i + 1
    })
  } else {
    placed.sort((a, b) => a.cutOrder - b.cutOrder)
  }

  return { placed, leftover, failed, cuts }
}

function describeFitFailure(
  inst: ExpandedInstance,
  sheet: NestSheetSpec,
  settings: NestSettings,
  edgeTrim: number,
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
  const usable = usableSheetRect(sheet.width, sheet.height, edgeTrim)
  const fitsSheet = orientations.some(
    (o) => o.width <= usable.width + 1e-9 && o.height <= usable.height + 1e-9,
  )
  if (!fitsSheet) {
    return `Деталь ${inst.width}×${inst.height} мм більша за лист ${sheet.width}×${sheet.height} мм (з обрізкою ${edgeTrim} мм)`
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

/** Validate a result has no overlaps and all parts in bounds / trim. */
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
      if (
        a.x < sheet.usableX - 1e-9 ||
        a.y < sheet.usableY - 1e-9 ||
        a.x + a.width > sheet.usableX + sheet.usableWidth + 1e-9 ||
        a.y + a.height > sheet.usableY + sheet.usableHeight + 1e-9
      ) {
        errors.push(
          `Sheet ${sheet.index}: part ${a.name} invades edge trim zone`,
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

/**
 * True when every cut on every guillotine sheet is a through-cut of its panel.
 * MaxRects sheets (no cuts) are skipped.
 */
export function validateGuillotineCuts(result: NestResult): string[] {
  const errors: string[] = []
  for (const sheet of result.sheets) {
    if (sheet.cuts.length === 0 && sheet.parts.length <= 1) continue
    // Rebuild packing-space cuts for geometric check using panel extents
    const packCuts = sheet.cuts.map((c) => ({
      orientation: c.orientation,
      position: c.position,
      start: c.start,
      end: c.end,
      panel: c.panel,
    }))
    // Through-cut: start/end must match the panel edge being traversed
    for (const c of packCuts) {
      if (c.orientation === 'vertical') {
        // May span only the current strip height (post previous cuts) — that is still a through-cut of that strip
        if (c.end - c.start <= 1e-6) {
          errors.push(`Sheet ${sheet.index}: cut ${c.position} has zero length`)
        }
      } else if (c.end - c.start <= 1e-6) {
        errors.push(`Sheet ${sheet.index}: cut ${c.position} has zero length`)
      }
    }
    if (!cutsAreThroughCuts(packCuts)) {
      // Panel may already be a strip; re-check against recorded panel
      for (const c of packCuts) {
        if (c.orientation === 'vertical') {
          if (
            Math.abs(c.start - c.panel.y) > 1e-3 ||
            Math.abs(c.end - (c.panel.y + c.panel.height)) > 1e-3
          ) {
            errors.push(
              `Sheet ${sheet.index}: vertical cut at x=${c.position} is not through-panel`,
            )
          }
        } else if (
          Math.abs(c.start - c.panel.x) > 1e-3 ||
          Math.abs(c.end - (c.panel.x + c.panel.width)) > 1e-3
        ) {
          errors.push(
            `Sheet ${sheet.index}: horizontal cut at y=${c.position} is not through-panel`,
          )
        }
      }
    }
  }
  return errors
}

/** Minimum gap between any two neighbouring (axis-overlapping) parts. */
export function minAdjacentKerf(result: NestResult): number | null {
  let min: number | null = null
  for (const sheet of result.sheets) {
    for (let i = 0; i < sheet.parts.length; i++) {
      for (let j = i + 1; j < sheet.parts.length; j++) {
        const a = sheet.parts[i]
        const b = sheet.parts[j]
        const overlapY =
          Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1e-6
        const overlapX =
          Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1e-6
        if (overlapY && !overlapX) {
          const gap = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width))
          if (gap > 1e-9) min = min == null ? gap : Math.min(min, gap)
        } else if (overlapX && !overlapY) {
          const gap = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height))
          if (gap > 1e-9) min = min == null ? gap : Math.min(min, gap)
        }
      }
    }
  }
  return min
}
