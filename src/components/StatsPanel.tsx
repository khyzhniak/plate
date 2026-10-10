import type { NestResult } from '../nesting'
import { formatAreaM2, formatMm } from '../types/app'

interface Props {
  result: NestResult | null
}

export function StatsPanel({ result }: Props) {
  if (!result) {
    return (
      <section className="animate-fade-up space-y-2" style={{ animationDelay: '120ms' }}>
        <h2 className="section-title">Статистика</h2>
        <p className="text-sm text-[var(--ink-muted)]">
          Натисніть «Розрахувати розкрій», щоб побачити використання листів.
        </p>
      </section>
    )
  }

  const { stats, unplaced } = result

  return (
    <section className="animate-fade-up space-y-3" style={{ animationDelay: '120ms' }}>
      <h2 className="section-title">Статистика</h2>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="Листів" value={String(stats.sheetsUsed)} />
        <Stat
          label="Використання"
          value={`${stats.utilizationPercent.toFixed(1)}%`}
        />
        <Stat label="Площа деталей" value={`${formatAreaM2(stats.totalPartsArea)} м²`} />
        <Stat label="Площа листів" value={`${formatAreaM2(stats.totalSheetArea)} м²`} />
        <Stat label="Відходи" value={`${formatAreaM2(stats.totalWasteArea)} м²`} />
        <Stat
          label="Розміщено"
          value={`${stats.placedCount} / ${stats.placedCount + stats.unplacedCount}`}
        />
      </dl>

      {unplaced.length > 0 && (
        <div className="rounded border border-[color-mix(in_srgb,var(--danger)_35%,white)] bg-[color-mix(in_srgb,var(--danger)_6%,white)] p-2.5">
          <div className="text-xs font-bold text-[var(--danger)] mb-1.5">
            Нерозміщені ({unplaced.length})
          </div>
          <ul className="space-y-1 max-h-28 overflow-auto text-xs">
            {unplaced.map((u) => (
              <li key={`${u.partId}-${u.instanceIndex}`}>
                <span className="font-semibold">{u.name}</span>{' '}
                <span className="mono text-[var(--ink-muted)]">
                  {formatMm(u.width)}×{formatMm(u.height)}
                </span>
                <div className="text-[var(--ink-muted)]">{u.reason}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white/80 border border-[var(--panel-edge)] px-2.5 py-2">
      <dt className="text-[11px] text-[var(--ink-muted)]">{label}</dt>
      <dd className="mono font-semibold mt-0.5">{value}</dd>
    </div>
  )
}
