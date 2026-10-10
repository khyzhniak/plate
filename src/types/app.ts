export type MaterialType = 'mdf' | 'plywood' | 'chipboard' | 'other'

export interface Material {
  id: string
  name: string
  type: MaterialType
  thicknessMm: number
  sheetLengthMm: number
  sheetWidthMm: number
  /**
   * When true, part length must stay along sheet length (grain).
   * When false (default), grain is ignored and 90° turns are free under guillotine.
   */
  respectGrain: boolean
  availableSheets: number
}

export type LengthUnit = 'mm' | 'cm' | 'm'

export interface PartRow {
  id: string
  name: string
  /** Довжина заготовки, мм */
  length: number
  /** Ширина заготовки, мм */
  width: number
  quantity: number
}

export interface CutSettings {
  materialId: string | null
  kerfMm: number
  /** Perimeter edge trim on all four sides (mm). Default 3. */
  edgeTrimMm: number
  inputUnit: LengthUnit
}

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  mdf: 'МДФ',
  plywood: 'Фанера',
  chipboard: 'ДСП',
  other: 'Інше',
}

export function toMm(value: number, unit: LengthUnit): number {
  if (unit === 'cm') return value * 10
  if (unit === 'm') return value * 1000
  return value
}

export function fromMm(valueMm: number, unit: LengthUnit): number {
  if (unit === 'cm') return valueMm / 10
  if (unit === 'm') return valueMm / 1000
  return valueMm
}

export function formatMm(value: number, digits = 1): string {
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits)
}

export function formatAreaM2(mm2: number): string {
  return (mm2 / 1_000_000).toFixed(3)
}
