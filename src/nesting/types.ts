/** Pure nesting types — no React. All sizes in millimetres. */

export type GrainDirection = 'length' | 'width' | 'none'

export type OptimizationMode = 'maxrects' | 'guillotine'

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
  kerf: number
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
  parts: PlacedPart[]
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
