import type { GrainDirection } from '../nesting'
import type { LengthUnit, PartRow } from '../types/app'
import { toMm } from '../types/app'
import { newId } from './storage'

export interface ParsedPasteRow {
  name: string
  length: number
  width: number
  quantity: number
  grain: GrainDirection
  raw: string
  error?: string
}

const GRAIN_MAP: Record<string, GrainDirection> = {
  '': 'none',
  '-': 'none',
  none: 'none',
  ні: 'none',
  нема: 'none',
  'без малюнка': 'none',
  length: 'length',
  l: 'length',
  довжина: 'length',
  'уздовж довжини': 'length',
  width: 'width',
  w: 'width',
  ширина: 'width',
  'уздовж ширини': 'width',
}

function parseGrain(value: string | undefined): GrainDirection {
  if (!value) return 'none'
  const key = value.trim().toLowerCase()
  return GRAIN_MAP[key] ?? 'none'
}

function parseNumber(value: string | undefined): number | null {
  if (value == null || value.trim() === '') return null
  const normalized = value.replace(',', '.').replace(/\s/g, '')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

function isNumericCell(value: string | undefined): boolean {
  return parseNumber(value) != null
}

function looksLikeHeader(cols: string[]): boolean {
  const first = (cols[0] ?? '').toLowerCase()
  if (
    first.includes('назв') ||
    first === 'name' ||
    first === 'деталь' ||
    first.includes('довж') ||
    first.includes('length') ||
    first === 'д' ||
    first === 'l'
  ) {
    return true
  }
  // Two numeric header labels like "Довжина" "Ширина" already caught;
  // also skip if first two cells are non-numeric words that aren't sizes
  if (cols.length >= 2 && !isNumericCell(cols[0]) && !isNumericCell(cols[1])) {
    const second = (cols[1] ?? '').toLowerCase()
    if (second.includes('шир') || second.includes('width') || second === 'ш') {
      return true
    }
  }
  return false
}

/**
 * Map columns to fields.
 * Happy path: 2 columns = length, width (Excel paste).
 * Optional extras: name / qty / grain when present.
 */
function mapColumns(cols: string[]): {
  name: string
  lengthRaw: number | null
  widthRaw: number | null
  qtyRaw: number | null
  grain: GrainDirection
} {
  const n = cols.length

  // 2-col happy path: length × width
  if (n === 2 && isNumericCell(cols[0]) && isNumericCell(cols[1])) {
    return {
      name: 'Без назви',
      lengthRaw: parseNumber(cols[0]),
      widthRaw: parseNumber(cols[1]),
      qtyRaw: null,
      grain: 'none',
    }
  }

  // 3 cols: length, width, qty  OR  name, length, width
  if (n === 3) {
    if (isNumericCell(cols[0]) && isNumericCell(cols[1])) {
      return {
        name: 'Без назви',
        lengthRaw: parseNumber(cols[0]),
        widthRaw: parseNumber(cols[1]),
        qtyRaw: parseNumber(cols[2]),
        grain: 'none',
      }
    }
    return {
      name: (cols[0] ?? '').trim() || 'Без назви',
      lengthRaw: parseNumber(cols[1]),
      widthRaw: parseNumber(cols[2]),
      qtyRaw: null,
      grain: 'none',
    }
  }

  // 4+ cols: name, length, width, qty [, grain]
  // Also: length, width, qty, grain (all-numeric first)
  if (n >= 4 && isNumericCell(cols[0]) && isNumericCell(cols[1])) {
    return {
      name: 'Без назви',
      lengthRaw: parseNumber(cols[0]),
      widthRaw: parseNumber(cols[1]),
      qtyRaw: parseNumber(cols[2]),
      grain: parseGrain(cols[3]),
    }
  }

  return {
    name: (cols[0] ?? '').trim() || 'Без назви',
    lengthRaw: parseNumber(cols[1]),
    widthRaw: parseNumber(cols[2]),
    qtyRaw: parseNumber(cols[3]),
    grain: parseGrain(cols[4]),
  }
}

/** Parse tab/newline clipboard text from Excel / Google Sheets. */
export function parsePasteText(
  text: string,
  unit: LengthUnit,
): ParsedPasteRow[] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0)

  return lines.map((line) => {
    const cols = line.includes('\t')
      ? line.split('\t').map((c) => c.trim())
      : line.split(/[;,]/).map((c) => c.trim())

    if (looksLikeHeader(cols)) {
      return {
        name: cols[0] ?? '',
        length: 0,
        width: 0,
        quantity: 0,
        grain: 'none' as const,
        raw: line,
        error: 'Рядок заголовка — буде пропущено',
      }
    }

    const mapped = mapColumns(cols)
    let error: string | undefined
    if (mapped.lengthRaw == null || mapped.lengthRaw <= 0) {
      error = 'Некоректна довжина'
    } else if (mapped.widthRaw == null || mapped.widthRaw <= 0) {
      error = 'Некоректна ширина'
    } else if (mapped.qtyRaw != null && mapped.qtyRaw <= 0) {
      error = 'Некоректна кількість'
    }

    const length = mapped.lengthRaw != null ? toMm(mapped.lengthRaw, unit) : 0
    const width = mapped.widthRaw != null ? toMm(mapped.widthRaw, unit) : 0
    const quantity =
      mapped.qtyRaw != null ? Math.floor(mapped.qtyRaw) : 1

    return {
      name: mapped.name,
      length,
      width,
      quantity,
      grain: mapped.grain,
      raw: line,
      error,
    }
  })
}

export function pasteRowsToParts(rows: ParsedPasteRow[]): PartRow[] {
  return rows
    .filter((r) => !r.error)
    .map((r) => ({
      id: newId('part'),
      name: r.name,
      length: r.length,
      width: r.width,
      quantity: r.quantity,
      grain: r.grain,
    }))
}
