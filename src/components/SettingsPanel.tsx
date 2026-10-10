import type { CutSettings, Material } from '../types/app'

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

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs space-y-1 block">
          <span className="text-[var(--ink-muted)]">Пропил, мм</span>
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
          <span className="text-[var(--ink-muted)]">Обрізка краю, мм</span>
          <input
            className="field mono"
            type="number"
            min={0}
            step={0.1}
            value={settings.edgeTrimMm}
            onChange={(e) =>
              patch({ edgeTrimMm: Number(e.target.value) || 0 })
            }
            title="Відступ від краю листа з усіх боків"
          />
        </label>
      </div>

      <p className="text-[11px] text-[var(--ink-muted)] leading-snug">
        Розкрій — наскрізні різи під форматну пилку. Малюнок вмикається в картці
        матеріалу («Враховувати малюнок»).
      </p>

      <button type="button" className="btn btn-primary w-full" onClick={onCompute}>
        Розрахувати розкрій
      </button>
    </section>
  )
}
