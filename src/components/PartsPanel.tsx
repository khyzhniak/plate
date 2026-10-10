import { useRef, useState } from 'react'
import type { GrainDirection } from '../nesting'
import {
  parsePasteText,
  pasteRowsToParts,
  type ParsedPasteRow,
} from '../lib/pasteParts'
import { newId } from '../lib/storage'
import type { CutSettings, LengthUnit, PartRow } from '../types/app'
import { GRAIN_LABELS, fromMm, toMm } from '../types/app'
import { PastePreviewModal } from './PastePreviewModal'

interface Props {
  parts: PartRow[]
  settings: CutSettings
  onChange: (parts: PartRow[]) => void
  onUnitChange: (unit: LengthUnit) => void
}

export function PartsPanel({
  parts,
  settings,
  onChange,
  onUnitChange,
}: Props) {
  const [pasteRows, setPasteRows] = useState<ParsedPasteRow[] | null>(null)
  const fileRef = useRef<HTMLTextAreaElement>(null)
  const unit = settings.inputUnit

  function update(id: string, patch: Partial<PartRow>) {
    onChange(parts.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function addRow() {
    onChange([
      ...parts,
      {
        id: newId('part'),
        name: `Деталь ${parts.length + 1}`,
        length: 500,
        width: 300,
        quantity: 1,
        grain: 'none',
      },
    ])
  }

  function remove(id: string) {
    onChange(parts.filter((p) => p.id !== id))
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) {
        alert('Буфер обміну порожній')
        return
      }
      setPasteRows(parsePasteText(text, unit))
    } catch {
      // Fallback: show textarea
      fileRef.current?.focus()
      alert(
        'Не вдалося прочитати буфер. Вставте текст у поле нижче (Ctrl+V) і натисніть «Розібрати».',
      )
    }
  }

  function parseManual() {
    const text = fileRef.current?.value ?? ''
    if (!text.trim()) return
    setPasteRows(parsePasteText(text, unit))
  }

  function confirmPaste() {
    if (!pasteRows) return
    const added = pasteRowsToParts(pasteRows)
    onChange([...parts, ...added])
    setPasteRows(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function displayValue(mm: number): string {
    const v = fromMm(mm, unit)
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000)
  }

  return (
    <section className="animate-fade-up space-y-3" style={{ animationDelay: '40ms' }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="section-title">Деталі</h2>
        <div className="flex items-center gap-1.5">
          <select
            className="field w-auto py-1 text-xs"
            value={unit}
            onChange={(e) => onUnitChange(e.target.value as LengthUnit)}
            title="Одиниця введення"
          >
            <option value="mm">мм</option>
            <option value="cm">см</option>
            <option value="m">м</option>
          </select>
          <button type="button" className="btn btn-ghost text-sm" onClick={addRow}>
            + Рядок
          </button>
          <button
            type="button"
            className="btn btn-ghost text-sm"
            onClick={pasteFromClipboard}
          >
            Вставити
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-56 border border-[var(--panel-edge)] rounded bg-white">
        <table className="w-full text-xs">
          <thead className="bg-[#eef2f6] sticky top-0">
            <tr className="text-left text-[var(--ink-muted)]">
              <th className="px-2 py-1.5 font-semibold">Назва</th>
              <th className="px-2 py-1.5 font-semibold">Д</th>
              <th className="px-2 py-1.5 font-semibold">Ш</th>
              <th className="px-2 py-1.5 font-semibold">К-сть</th>
              <th className="px-2 py-1.5 font-semibold">Малюнок</th>
              <th className="px-1 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id} className="border-t border-[var(--panel-edge)]">
                <td className="px-1.5 py-1">
                  <input
                    className="field py-1 text-xs"
                    value={p.name}
                    onChange={(e) => update(p.id, { name: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1 w-16">
                  <input
                    className="field py-1 text-xs mono"
                    type="number"
                    min={0}
                    step="any"
                    value={displayValue(p.length)}
                    onChange={(e) =>
                      update(p.id, {
                        length: toMm(Number(e.target.value) || 0, unit),
                      })
                    }
                  />
                </td>
                <td className="px-1 py-1 w-16">
                  <input
                    className="field py-1 text-xs mono"
                    type="number"
                    min={0}
                    step="any"
                    value={displayValue(p.width)}
                    onChange={(e) =>
                      update(p.id, {
                        width: toMm(Number(e.target.value) || 0, unit),
                      })
                    }
                  />
                </td>
                <td className="px-1 py-1 w-14">
                  <input
                    className="field py-1 text-xs mono"
                    type="number"
                    min={1}
                    value={p.quantity}
                    onChange={(e) =>
                      update(p.id, {
                        quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                      })
                    }
                  />
                </td>
                <td className="px-1 py-1 w-28">
                  <select
                    className="field py-1 text-xs"
                    value={p.grain}
                    onChange={(e) =>
                      update(p.id, { grain: e.target.value as GrainDirection })
                    }
                  >
                    {(Object.keys(GRAIN_LABELS) as GrainDirection[]).map((k) => (
                      <option key={k} value={k}>
                        {GRAIN_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <button
                    type="button"
                    className="btn btn-danger text-xs px-2 py-1"
                    onClick={() => remove(p.id)}
                    aria-label="Видалити"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-[var(--ink-muted)] block">
          Або вставте таблицю (назва, довжина, ширина, к-сть, малюнок):
        </label>
        <textarea
          ref={fileRef}
          className="field mono text-xs min-h-[56px] resize-y"
          placeholder={'Бік\t720\t560\t2\tдовжина\nДно\t1000\t560\t1'}
        />
        <button type="button" className="btn btn-ghost text-sm" onClick={parseManual}>
          Розібрати вставку
        </button>
      </div>

      {pasteRows && (
        <PastePreviewModal
          rows={pasteRows}
          onConfirm={confirmPaste}
          onCancel={() => setPasteRows(null)}
        />
      )}
    </section>
  )
}
