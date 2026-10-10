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
      ? line.split('\t')
      : line.split(/[;,]/).map((c) => c.trim())

    // Skip header-like rows
    const maybeHeader = cols[0]?.toLowerCase() ?? ''
    if (
      maybeHeader.includes('назв') ||
      maybeHeader === 'name' ||
      maybeHeader === 'деталь'
    ) {
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

    const name = (cols[0] ?? '').trim() || 'Без назви'
    const lengthRaw = parseNumber(cols[1])
    const widthRaw = parseNumber(cols[2])
    const qtyRaw = parseNumber(cols[3])
    const grain = parseGrain(cols[4])

    let error: string | undefined
    if (lengthRaw == null || lengthRaw <= 0) error = 'Некоректна довжина'
    else if (widthRaw == null || widthRaw <= 0) error = 'Некоректна ширина'
    else if (qtyRaw != null && qtyRaw <= 0) error = 'Некоректна кількість'

    const length = lengthRaw != null ? toMm(lengthRaw, unit) : 0
    const width = widthRaw != null ? toMm(widthRaw, unit) : 0
    const quantity = qtyRaw != null ? Math.floor(qtyRaw) : 1

    return { name, length, width, quantity, grain, raw: line, error }
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
