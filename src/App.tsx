import { useEffect, useMemo, useState } from 'react'
import { CuttingMap } from './components/CuttingMap'
import { MaterialsPanel } from './components/MaterialsPanel'
import { PartsPanel } from './components/PartsPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { StatsPanel } from './components/StatsPanel'
import {
  loadMaterials,
  loadParts,
  loadSettings,
  saveMaterials,
  saveParts,
  saveSettings,
} from './lib/storage'
import { nestSheets, type NestResult } from './nesting'
import type { CutSettings, LengthUnit, Material, PartRow } from './types/app'

const NEST_DEBOUNCE_MS = 150

function runNest(
  parts: PartRow[],
  material: Material | null,
  settings: CutSettings,
): { result: NestResult | null; error: string | null } {
  if (!material) {
    return { result: null, error: 'Оберіть матеріал у налаштуваннях' }
  }
  if (parts.length === 0) {
    return { result: null, error: null }
  }

  const invalid = parts.find(
    (p) =>
      !(p.length > 0) ||
      !(p.width > 0) ||
      !Number.isFinite(p.length) ||
      !Number.isFinite(p.width) ||
      !Number.isFinite(p.quantity) ||
      p.quantity < 1,
  )
  if (invalid) {
    return {
      result: null,
      error: `Некоректні розміри: «${invalid.name || 'деталь'}» (довжина/ширина/к-сть)`,
    }
  }

  if (
    !(material.sheetLengthMm > 0) ||
    !(material.sheetWidthMm > 0) ||
    !(material.availableSheets > 0)
  ) {
    return {
      result: null,
      error: 'Некоректні розміри або кількість листів матеріалу',
    }
  }

  if (settings.kerfMm < 0 || settings.edgeTrimMm < 0) {
    return { result: null, error: 'Пропил і обрізка краю не можуть бути від’ємними' }
  }

  const respectGrain = material.respectGrain
  const nestParts = parts.map((p) => ({
    id: p.id,
    name: p.name,
    width: p.length,
    height: p.width,
    quantity: p.quantity,
    grain: respectGrain ? ('length' as const) : ('none' as const),
  }))

  const result = nestSheets(
    nestParts,
    {
      width: material.sheetLengthMm,
      height: material.sheetWidthMm,
      grain: respectGrain ? 'length' : 'none',
      availableCount: material.availableSheets,
    },
    {
      kerf: settings.kerfMm,
      edgeTrim: settings.edgeTrimMm,
      allowRotate: true,
      respectGrain,
      mode: 'guillotine',
    },
  )
  return { result, error: null }
}

export default function App() {
  const [materials, setMaterials] = useState(() => loadMaterials())
  const [parts, setParts] = useState<PartRow[]>(() => loadParts())
  const [settings, setSettings] = useState<CutSettings>(() => loadSettings())
  const [result, setResult] = useState<NestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => saveMaterials(materials), [materials])
  useEffect(() => saveParts(parts), [parts])
  useEffect(() => saveSettings(settings), [settings])

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === settings.materialId) ?? null,
    [materials, settings.materialId],
  )

  // Single reactive path: any nest-affecting input → debounced guillotine → map
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const { result: next, error: err } = runNest(
        parts,
        selectedMaterial,
        settings,
      )
      setResult(next)
      setError(err)
    }, NEST_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [parts, materials, settings, selectedMaterial])

  function onUnitChange(unit: LengthUnit) {
    setSettings((s) => ({ ...s, inputUnit: unit }))
  }

  return (
    <div className="h-full min-h-screen flex flex-col">
      <header className="shrink-0 px-4 py-3 border-b border-[var(--panel-edge)] bg-[color-mix(in_srgb,var(--panel)_88%,transparent)] backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[0.7rem] uppercase tracking-[0.14em] text-[var(--accent)] font-extrabold">
              Sheet Nest
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold leading-tight mt-0.5">
              Розкрій листових матеріалів
            </h1>
            <p className="text-sm text-[var(--ink-muted)] mt-0.5">
              МДФ, фанера, ДСП — карта оновлюється автоматично
            </p>
          </div>
          {error && (
            <div className="text-sm text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_10%,white)] border border-[color-mix(in_srgb,var(--danger)_30%,white)] rounded px-3 py-2">
              {error}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 min-h-0 max-w-[1600px] w-full mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-3 sm:gap-4">
        <aside className="panel rounded-md p-3 sm:p-4 space-y-5 overflow-auto max-h-[46vh] lg:max-h-none">
          <MaterialsPanel
            materials={materials}
            selectedId={settings.materialId}
            onChange={setMaterials}
            onSelect={(id) =>
              setSettings((s) => ({ ...s, materialId: id || null }))
            }
          />
          <PartsPanel
            parts={parts}
            settings={settings}
            onChange={setParts}
            onUnitChange={onUnitChange}
          />
          <SettingsPanel
            settings={settings}
            materials={materials}
            selectedMaterial={selectedMaterial}
            onChange={setSettings}
            onMaterialPatch={(id, patch) =>
              setMaterials((list) =>
                list.map((m) => (m.id === id ? { ...m, ...patch } : m)),
              )
            }
          />
          <StatsPanel result={result} />
        </aside>

        <section className="min-h-0">
          <CuttingMap
            result={result}
            materialName={selectedMaterial?.name}
          />
        </section>
      </main>
    </div>
  )
}
