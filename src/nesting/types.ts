/** Pure nesting types — no React. All sizes in millimetres. */

export type GrainDirection = 'length' | 'width' | 'none'

/** Primary production mode is guillotine (panel saw). MaxRects is optional / non-saw. */
export type OptimizationMode = 'guillotine' | 'maxrects'

export interface NestPartInput {
  id: string
  name: string
  /** Part length along X when not rotated (mm) */
  width: number
  /** Part height along Y when not rotated (mm) */
  height: number
  quantity: number
  grain: GrainDirection
}

export interface NestSheetSpec {
  width: number
  height: number
  grain: GrainDirection
  /** Max sheets available; Infinity if unlimited */
  availableCount: number
}

export interface NestSettings {
  /** Saw blade kerf between adjacent parts (mm) */
  kerf: number
  /** Edge trim inset on all four sides of the sheet (mm). Default 3. */
  edgeTrim: number
  allowRotate: boolean
  respectGrain: boolean
  mode: OptimizationMode
}

export interface PlacedPart {
  partId: string
  instanceIndex: number
  name: string
  sheetIndex: number
  x: number
  y: number
  width: number
  height: number
  rotated: boolean
  grain: GrainDirection
  /** 1-based sequence number matching guillotine cut order */
  cutOrder: number
}

export type CutOrientation = 'vertical' | 'horizontal'

/** One through-cut on the current panel/strip (edge to opposite edge). */
export interface CutStep {
  /** 1-based sequence on this sheet */
  index: number
  sheetIndex: number
  orientation: CutOrientation
  /**
   * Cut line position in sheet coordinates:
   * x for vertical cuts, y for horizontal cuts.
   */
  position: number
  /** Start of the cut along the panel (y for vertical, x for horizontal) */
  start: number
  /** End of the cut along the panel */
  end: number
  /** Panel being cut before this through-cut */
  panel: { x: number; y: number; width: number; height: number }
}

export interface UnplacedPart {
  partId: string
  instanceIndex: number
  name: string
  width: number
  height: number
  reason: string
}

export interface NestSheetResult {
  index: number
  width: number
  height: number
  grain: GrainDirection
  /** Usable nesting origin after edge trim */
  usableX: number
  usableY: number
  usableWidth: number
  usableHeight: number
  edgeTrim: number
  parts: PlacedPart[]
  /** Through-cuts in operator sequence order */
  cuts: CutStep[]
  usedArea: number
  sheetArea: number
  utilization: number
}

export interface NestStats {
  sheetsUsed: number
  sheetsAvailable: number
  totalSheetArea: number
  totalPartsArea: number
  totalWasteArea: number
  utilizationPercent: number
  placedCount: number
  unplacedCount: number
}

export interface NestResult {
  sheets: NestSheetResult[]
  unplaced: UnplacedPart[]
  stats: NestStats
}

export interface FreeRect {
  x: number
  y: number
  width: number
  height: number
}

export interface PackCandidate {
  freeIndex: number
  x: number
  y: number
  width: number
  height: number
  rotated: boolean
  score: number
  scoreSecondary: number
}

export interface GuillotinePlaceResult {
  freeRects: FreeRect[]
  cuts: Array<{
    orientation: CutOrientation
    /** Position in packing coords (before sheet trim offset) */
    position: number
    start: number
    end: number
    panel: FreeRect
  }>
}
