import type { CutSettings, Material } from '../types/app'

interface Props {
  settings: CutSettings
  materials: Material[]
  selectedMaterial: Material | null
  onChange: (settings: CutSettings) => void
  onMaterialPatch: (materialId: string, patch: Partial<Material>) => void
}

export function SettingsPanel({
  settings,
  materials,
  selectedMaterial,
  onChange,
  onMaterialPatch,
}: Props) {
  function patch(p: Partial<CutSettings>) {
    onChange({ ...settings, ...p })
  }

  const ignoreGrain = selectedMaterial ? !selectedMaterial.respectGrain : true

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

      <label
        className={`flex items-start gap-2.5 rounded border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
          ignoreGrain
            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
            : 'border-[var(--panel-edge)] bg-white/70'
        }`}
      >
        <input
          type="checkbox"
          className="mt-0.5"
          checked={ignoreGrain}
          disabled={!selectedMaterial}
          onChange={(e) => {
            if (!selectedMaterial) return
            onMaterialPatch(selectedMaterial.id, {
              respectGrain: !e.target.checked,
            })
          }}
        />
        <span>
          <span className="font-semibold">Не враховувати малюнок</span>
          <span className="block text-[11px] text-[var(--ink-muted)] leading-snug mt-0.5">
            Увімкнено (типово): розкрій лише під пилку — вільний поворот 90°,
            довжина/ширина лише як розміри. Вимкнено: довжина деталі лишається
            уздовж довжини листа (малюнок).
          </span>
        </span>
      </label>

      <p className="text-[11px] text-[var(--ink-muted)] leading-snug">
        Розкрій перераховується автоматично після змін.
      </p>
    </section>
  )
}
