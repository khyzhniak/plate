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
  const loaded = readJson<Array<Partial<Material> & { grain?: string }>>(
    MATERIALS_KEY,
    defaultMaterials(),
  )
  return loaded.map((m) => migrateMaterial(m))
}

function migrateMaterial(
  m: Partial<Material> & { grain?: string; id?: string },
): Material {
  const base = emptyMaterialDefaults()
  const respectGrain =
    typeof m.respectGrain === 'boolean'
      ? m.respectGrain
      : m.grain === 'length' || m.grain === 'width'
  return {
    id: m.id ?? base.id,
    name: m.name ?? base.name,
    type: (m.type as Material['type']) ?? base.type,
    thicknessMm: m.thicknessMm ?? base.thicknessMm,
    sheetLengthMm: m.sheetLengthMm ?? base.sheetLengthMm,
    sheetWidthMm: m.sheetWidthMm ?? base.sheetWidthMm,
    respectGrain,
    availableSheets: m.availableSheets ?? base.availableSheets,
  }
}

function emptyMaterialDefaults(): Material {
  return {
    id: 'mat-tmp',
    name: 'Новий матеріал',
    type: 'mdf',
    thicknessMm: 16,
    sheetLengthMm: 2800,
    sheetWidthMm: 2070,
    respectGrain: false,
    availableSheets: 10,
  }
}

export function saveMaterials(materials: Material[]): void {
  writeJson(MATERIALS_KEY, materials)
}

export function loadParts(): PartRow[] {
  const loaded = readJson<Array<Partial<PartRow> & { grain?: string }>>(
    PARTS_KEY,
    defaultParts(),
  )
  return loaded.map((p) => ({
    id: p.id ?? newId('part'),
    name: p.name ?? 'Деталь',
    length: p.length ?? 0,
    width: p.width ?? 0,
    quantity: Math.max(1, Math.floor(p.quantity ?? 1)),
  }))
}

export function saveParts(parts: PartRow[]): void {
  writeJson(PARTS_KEY, parts)
}

export function loadSettings(): CutSettings {
  const loaded = readJson<Partial<CutSettings>>(SETTINGS_KEY, defaultSettings())
  return {
    ...defaultSettings(),
    materialId: loaded.materialId ?? defaultSettings().materialId,
    kerfMm: typeof loaded.kerfMm === 'number' ? loaded.kerfMm : 3,
    edgeTrimMm: typeof loaded.edgeTrimMm === 'number' ? loaded.edgeTrimMm : 3,
    inputUnit: loaded.inputUnit ?? 'mm',
  }
}

export function saveSettings(settings: CutSettings): void {
  writeJson(SETTINGS_KEY, {
    materialId: settings.materialId,
    kerfMm: settings.kerfMm,
    edgeTrimMm: settings.edgeTrimMm,
    inputUnit: settings.inputUnit,
  })
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
      respectGrain: false,
      availableSheets: 10,
    },
    {
      id: 'mat-ply-18',
      name: 'Фанера 18 мм',
      type: 'plywood',
      thicknessMm: 18,
      sheetLengthMm: 2500,
      sheetWidthMm: 1250,
      respectGrain: true,
      availableSheets: 5,
    },
    {
      id: 'mat-dsp-16',
      name: 'ДСП 16 мм дуб',
      type: 'chipboard',
      thicknessMm: 16,
      sheetLengthMm: 2800,
      sheetWidthMm: 2070,
      respectGrain: false,
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
    },
    {
      id: 'part-2',
      name: 'Бік правий',
      length: 720,
      width: 560,
      quantity: 2,
    },
    {
      id: 'part-3',
      name: 'Дно',
      length: 1000,
      width: 560,
      quantity: 1,
    },
    {
      id: 'part-4',
      name: 'Полиця',
      length: 968,
      width: 300,
      quantity: 3,
    },
    {
      id: 'part-5',
      name: 'Фасад',
      length: 597,
      width: 396,
      quantity: 4,
    },
  ]
}

export function defaultSettings(): CutSettings {
  return {
    materialId: 'mat-dsp-16',
    kerfMm: 3,
    edgeTrimMm: 3,
    inputUnit: 'mm',
  }
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}
