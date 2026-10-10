import type { LengthUnit, PartRow } from '../types/app'
import { toMm } from '../types/app'
import { newId } from './storage'

export interface ParsedPasteRow {
  name: string
  length: number
  width: number
  quantity: number
  raw: string
  error?: string
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
  if (cols.length >= 2 && !isNumericCell(cols[0]) && !isNumericCell(cols[1])) {
    const second = (cols[1] ?? '').toLowerCase()
    if (second.includes('шир') || second.includes('width') || second === 'ш') {
      return true
    }
  }
  return false
}

/**
 * Canonical: 2 columns = length, width (mm). Optional 3rd = qty.
 * Also accepts name, length, width[, qty] for richer pastes.
 */
function mapColumns(cols: string[]): {
  name: string
  lengthRaw: number | null
  widthRaw: number | null
  qtyRaw: number | null
} {
  const n = cols.length

  // Happy path: length × width
  if (n === 2 && isNumericCell(cols[0]) && isNumericCell(cols[1])) {
    return {
      name: 'Без назви',
      lengthRaw: parseNumber(cols[0]),
      widthRaw: parseNumber(cols[1]),
      qtyRaw: null,
    }
  }

  // length, width, qty
  if (n === 3 && isNumericCell(cols[0]) && isNumericCell(cols[1])) {
    return {
      name: 'Без назви',
      lengthRaw: parseNumber(cols[0]),
      widthRaw: parseNumber(cols[1]),
      qtyRaw: parseNumber(cols[2]),
    }
  }

  // name, length, width
  if (n === 3) {
    return {
      name: (cols[0] ?? '').trim() || 'Без назви',
      lengthRaw: parseNumber(cols[1]),
      widthRaw: parseNumber(cols[2]),
      qtyRaw: null,
    }
  }

  // name, length, width, qty
  if (n >= 4) {
    if (isNumericCell(cols[0]) && isNumericCell(cols[1])) {
      return {
        name: 'Без назви',
        lengthRaw: parseNumber(cols[0]),
        widthRaw: parseNumber(cols[1]),
        qtyRaw: parseNumber(cols[2]),
      }
    }
    return {
      name: (cols[0] ?? '').trim() || 'Без назви',
      lengthRaw: parseNumber(cols[1]),
      widthRaw: parseNumber(cols[2]),
      qtyRaw: parseNumber(cols[3]),
    }
  }

  return {
    name: 'Без назви',
    lengthRaw: parseNumber(cols[0]),
    widthRaw: parseNumber(cols[1]),
    qtyRaw: null,
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

    return {
      name: mapped.name,
      length: mapped.lengthRaw != null ? toMm(mapped.lengthRaw, unit) : 0,
      width: mapped.widthRaw != null ? toMm(mapped.widthRaw, unit) : 0,
      quantity: mapped.qtyRaw != null ? Math.floor(mapped.qtyRaw) : 1,
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
    }))
}
