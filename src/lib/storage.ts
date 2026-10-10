import type { CutSettings, Material, PartRow } from '../types/app'

const MATERIALS_KEY = 'sheet-nesting:materials'
const PARTS_KEY = 'sheet-nesting:parts'
const SETTINGS_KEY = 'sheet-nesting:settings'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function loadMaterials(): Material[] {
  return readJson(MATERIALS_KEY, defaultMaterials())
}

export function saveMaterials(materials: Material[]): void {
  writeJson(MATERIALS_KEY, materials)
}

export function loadParts(): PartRow[] {
  return readJson(PARTS_KEY, defaultParts())
}

export function saveParts(parts: PartRow[]): void {
  writeJson(PARTS_KEY, parts)
}

export function loadSettings(): CutSettings {
  const loaded = readJson<Partial<CutSettings> & CutSettings>(
    SETTINGS_KEY,
    defaultSettings(),
  )
  // Migrate older saves: production path is guillotine; MaxRects stays selectable in UI
  return {
    ...defaultSettings(),
    ...loaded,
    edgeTrimMm:
      typeof loaded.edgeTrimMm === 'number' ? loaded.edgeTrimMm : 3,
    // Force panel-saw mode as primary after upgrade from MaxRects default
    mode:
      loaded.mode === 'guillotine' || loaded.mode === 'maxrects'
        ? loaded.mode === 'maxrects' && !('edgeTrimMm' in loaded)
          ? 'guillotine'
          : loaded.mode
        : 'guillotine',
  }
}

export function saveSettings(settings: CutSettings): void {
  writeJson(SETTINGS_KEY, settings)
}

export function defaultMaterials(): Material[] {
  return [
    {
      id: 'mat-mdf-16',
      name: 'МДФ 16 мм білий',
      type: 'mdf',
      thicknessMm: 16,
      sheetLengthMm: 2800,
      sheetWidthMm: 2070,
      grain: 'none',
      availableSheets: 10,
    },
    {
      id: 'mat-ply-18',
      name: 'Фанера 18 мм',
      type: 'plywood',
      thicknessMm: 18,
      sheetLengthMm: 2500,
      sheetWidthMm: 1250,
      grain: 'length',
      availableSheets: 5,
    },
    {
      id: 'mat-dsp-16',
      name: 'ДСП 16 мм дуб',
      type: 'chipboard',
      thicknessMm: 16,
      sheetLengthMm: 2800,
      sheetWidthMm: 2070,
      grain: 'length',
      availableSheets: 8,
    },
  ]
}

export function defaultParts(): PartRow[] {
  return [
    {
      id: 'part-1',
      name: 'Бік лівий',
      length: 720,
      width: 560,
      quantity: 2,
      grain: 'length',
    },
    {
      id: 'part-2',
      name: 'Бік правий',
      length: 720,
      width: 560,
      quantity: 2,
      grain: 'length',
    },
    {
      id: 'part-3',
      name: 'Дно',
      length: 1000,
      width: 560,
      quantity: 1,
      grain: 'none',
    },
    {
      id: 'part-4',
      name: 'Полиця',
      length: 968,
      width: 300,
      quantity: 3,
      grain: 'length',
    },
    {
      id: 'part-5',
      name: 'Фасад',
      length: 597,
      width: 396,
      quantity: 4,
      grain: 'length',
    },
  ]
}

export function defaultSettings(): CutSettings {
  return {
    materialId: 'mat-dsp-16',
    kerfMm: 3,
    edgeTrimMm: 3,
    allowRotate: true,
    respectGrain: true,
    mode: 'guillotine',
    inputUnit: 'mm',
  }
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}
