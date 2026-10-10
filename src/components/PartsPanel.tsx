import { useRef, type ClipboardEvent } from 'react'
import {
  parsePasteText,
  pasteRowsToParts,
} from '../lib/pasteParts'
import { newId } from '../lib/storage'
import type { CutSettings, LengthUnit, PartRow } from '../types/app'
import { fromMm, toMm } from '../types/app'

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
      },
    ])
  }

  function remove(id: string) {
    onChange(parts.filter((p) => p.id !== id))
  }

  function applyPasteText(text: string) {
    if (!text.trim()) return
    const rows = parsePasteText(text, unit)
    const added = pasteRowsToParts(rows)
    if (added.length === 0) {
      alert('Не вдалося розібрати вставку. Очікується: довжина\\tширина')
      return
    }
    onChange([...parts, ...added])
    if (fileRef.current) fileRef.current.value = ''
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) {
        alert('Буфер обміну порожній')
        return
      }
      applyPasteText(text)
    } catch {
      fileRef.current?.focus()
      alert(
        'Не вдалося прочитати буфер. Вставте текст у поле нижче (Ctrl+V) — розбір автоматичний.',
      )
    }
  }

  function onTextareaPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const text = e.clipboardData.getData('text')
    if (!text.trim()) return
    e.preventDefault()
    applyPasteText(text)
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
              <th className="px-2 py-1.5 font-semibold">Довжина</th>
              <th className="px-2 py-1.5 font-semibold">Ширина</th>
              <th className="px-2 py-1.5 font-semibold">К-сть</th>
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
                <td className="px-1 py-1 w-20">
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
                <td className="px-1 py-1 w-20">
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
          Вставка з Excel — два стовпці (таб): довжина, ширина (мм). К-сть = 1;
          третій стовпець — кількість (опційно). Після вставки розкрій рахується
          одразу.
        </label>
        <textarea
          ref={fileRef}
          className="field mono text-xs min-h-[72px] resize-y"
          placeholder={'1288\t38\n1414\t38\n2224\t50\n2224\t63'}
          onPaste={onTextareaPaste}
        />
      </div>
    </section>
  )
}
