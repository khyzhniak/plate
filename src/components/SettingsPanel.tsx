import type { OptimizationMode } from '../nesting'
import type { CutSettings, Material } from '../types/app'
import { MODE_LABELS } from '../types/app'

interface Props {
  settings: CutSettings
  materials: Material[]
  onChange: (settings: CutSettings) => void
  onCompute: () => void
}

export function SettingsPanel({
  settings,
  materials,
  onChange,
  onCompute,
}: Props) {
  function patch(p: Partial<CutSettings>) {
    onChange({ ...settings, ...p })
  }

  return (
    <section className="animate-fade-up space-y-3" style={{ animationDelay: '80ms' }}>
      <h2 className="section-title">Налаштування</h2>

      <label className="text-xs space-y-1 block">
        <span className="text-[var(--ink-muted)]">Матеріал</span>
        <select
          className="field"
          value={settings.materialId ?? ''}
          onChange={(e) => patch({ materialId: e.target.value || null })}
        >
          <option value="">— оберіть —</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.sheetLengthMm}×{m.sheetWidthMm}×{m.thicknessMm})
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs space-y-1 block">
        <span className="text-[var(--ink-muted)]">Пропил (kerf), мм</span>
        <input
          className="field mono"
          type="number"
          min={0}
          step={0.1}
          value={settings.kerfMm}
          onChange={(e) => patch({ kerfMm: Number(e.target.value) || 0 })}
        />
      </label>

      <label className="text-xs space-y-1 block">
        <span className="text-[var(--ink-muted)]">Режим оптимізації</span>
        <select
          className="field"
          value={settings.mode}
          onChange={(e) =>
            patch({ mode: e.target.value as OptimizationMode })
          }
        >
          {(Object.keys(MODE_LABELS) as OptimizationMode[]).map((k) => (
            <option key={k} value={k}>
              {MODE_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.allowRotate}
          onChange={(e) => patch({ allowRotate: e.target.checked })}
        />
        Дозволити поворот 90°
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.respectGrain}
          onChange={(e) => patch({ respectGrain: e.target.checked })}
        />
        Дотримуватись напрямку малюнка
      </label>

      <button type="button" className="btn btn-primary w-full" onClick={onCompute}>
        Розрахувати розкрій
      </button>
    </section>
  )
}
