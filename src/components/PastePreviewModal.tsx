import type { ParsedPasteRow } from '../lib/pasteParts'
import { formatMm } from '../types/app'

interface Props {
  rows: ParsedPasteRow[]
  onConfirm: () => void
  onCancel: () => void
}

export function PastePreviewModal({ rows, onConfirm, onCancel }: Props) {
  const valid = rows.filter((r) => !r.error).length
  const invalid = rows.length - valid

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(26,35,48,0.45)]">
      <div
        className="panel w-full max-w-3xl max-h-[85vh] flex flex-col rounded-md overflow-hidden animate-fade-up"
        role="dialog"
        aria-labelledby="paste-title"
      >
        <div className="px-4 py-3 border-b border-[var(--panel-edge)] flex items-start justify-between gap-3">
          <div>
            <h3 id="paste-title" className="font-bold text-base">
              Попередній перегляд вставки
            </h3>
            <p className="text-sm text-[var(--ink-muted)] mt-0.5">
              Два стовпці = довжина × ширина (мм). Після підтвердження деталі
              додаються і розкрій перераховується. Валідних:{' '}
              <span className="mono text-[var(--ok)]">{valid}</span>
              {invalid > 0 && (
                <>
                  {' '}
                  · з помилками:{' '}
                  <span className="mono text-[var(--danger)]">{invalid}</span>
                </>
              )}
            </p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#eef2f6]">
              <tr className="text-left text-[var(--ink-muted)]">
                <th className="px-3 py-2 font-semibold">Назва</th>
                <th className="px-3 py-2 font-semibold">Д×Ш, мм</th>
                <th className="px-3 py-2 font-semibold">К-сть</th>
                <th className="px-3 py-2 font-semibold">Малюнок</th>
                <th className="px-3 py-2 font-semibold">Статус</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className={`border-t border-[var(--panel-edge)] ${
                    r.error ? 'bg-[color-mix(in_srgb,var(--danger)_8%,white)]' : ''
                  }`}
                >
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 mono">
                    {formatMm(r.length)}×{formatMm(r.width)}
                  </td>
                  <td className="px-3 py-2 mono">{r.quantity}</td>
                  <td className="px-3 py-2">{r.grain}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.error ? (
                      <span className="text-[var(--danger)]">{r.error}</span>
                    ) : (
                      <span className="text-[var(--ok)]">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-[var(--panel-edge)] flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Скасувати
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={valid === 0}
            onClick={onConfirm}
          >
            Додати {valid} дет.
          </button>
        </div>
      </div>
    </div>
  )
}
