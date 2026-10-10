import type { Material, MaterialType } from '../types/app'
import { GRAIN_LABELS, MATERIAL_TYPE_LABELS } from '../types/app'
import type { GrainDirection } from '../nesting'
import { newId } from '../lib/storage'

interface Props {
  materials: Material[]
  selectedId: string | null
  onChange: (materials: Material[]) => void
  onSelect: (id: string) => void
}

const emptyMaterial = (): Material => ({
  id: newId('mat'),
  name: 'Новий матеріал',
  type: 'mdf',
  thicknessMm: 16,
  sheetLengthMm: 2800,
  sheetWidthMm: 2070,
  grain: 'none',
  availableSheets: 10,
})

export function MaterialsPanel({
  materials,
  selectedId,
  onChange,
  onSelect,
}: Props) {
  const selected = materials.find((m) => m.id === selectedId) ?? null

  function update(id: string, patch: Partial<Material>) {
    onChange(materials.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  function add() {
    const mat = emptyMaterial()
    onChange([...materials, mat])
    onSelect(mat.id)
  }

  function remove(id: string) {
    const next = materials.filter((m) => m.id !== id)
    onChange(next)
    if (selectedId === id) onSelect(next[0]?.id ?? '')
  }

  return (
    <section className="animate-fade-up space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-title">Матеріали</h2>
        <button type="button" className="btn btn-ghost text-sm" onClick={add}>
          + Додати
        </button>
      </div>

      <ul className="space-y-1.5 max-h-40 overflow-auto pr-1">
        {materials.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onSelect(m.id)}
              className={`w-full text-left rounded px-2.5 py-2 border transition-colors ${
                m.id === selectedId
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-transparent bg-white/70 hover:bg-white'
              }`}
            >
              <div className="font-semibold text-sm leading-tight">{m.name}</div>
              <div className="mono text-[11px] text-[var(--ink-muted)] mt-0.5">
                {MATERIAL_TYPE_LABELS[m.type]} · {m.thicknessMm} мм ·{' '}
                {m.sheetLengthMm}×{m.sheetWidthMm} · {m.availableSheets} шт
              </div>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--panel-edge)]">
          <label className="col-span-2 text-xs space-y-1">
            <span className="text-[var(--ink-muted)]">Назва</span>
            <input
              className="field"
              value={selected.name}
              onChange={(e) => update(selected.id, { name: e.target.value })}
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="text-[var(--ink-muted)]">Тип</span>
            <select
              className="field"
              value={selected.type}
              onChange={(e) =>
                update(selected.id, { type: e.target.value as MaterialType })
              }
            >
              {(Object.keys(MATERIAL_TYPE_LABELS) as MaterialType[]).map((k) => (
                <option key={k} value={k}>
                  {MATERIAL_TYPE_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs space-y-1">
            <span className="text-[var(--ink-muted)]">Товщина, мм</span>
            <input
              className="field mono"
              type="number"
              min={1}
              step={1}
              value={selected.thicknessMm}
              onChange={(e) =>
                update(selected.id, { thicknessMm: Number(e.target.value) || 0 })
              }
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="text-[var(--ink-muted)]">Довжина листа, мм</span>
            <input
              className="field mono"
              type="number"
              min={1}
              value={selected.sheetLengthMm}
              onChange={(e) =>
                update(selected.id, {
                  sheetLengthMm: Number(e.target.value) || 0,
                })
              }
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="text-[var(--ink-muted)]">Ширина листа, мм</span>
            <input
              className="field mono"
              type="number"
              min={1}
              value={selected.sheetWidthMm}
              onChange={(e) =>
                update(selected.id, {
                  sheetWidthMm: Number(e.target.value) || 0,
                })
              }
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="text-[var(--ink-muted)]">Малюнок</span>
            <select
              className="field"
              value={selected.grain}
              onChange={(e) =>
                update(selected.id, {
                  grain: e.target.value as GrainDirection,
                })
              }
            >
              {(Object.keys(GRAIN_LABELS) as GrainDirection[]).map((k) => (
                <option key={k} value={k}>
                  {GRAIN_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs space-y-1">
            <span className="text-[var(--ink-muted)]">Кількість листів</span>
            <input
              className="field mono"
              type="number"
              min={1}
              value={selected.availableSheets}
              onChange={(e) =>
                update(selected.id, {
                  availableSheets: Number(e.target.value) || 0,
                })
              }
            />
          </label>
          <div className="col-span-2">
            <button
              type="button"
              className="btn btn-danger text-sm w-full"
              onClick={() => remove(selected.id)}
            >
              Видалити матеріал
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
