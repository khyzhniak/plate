import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import type { NestResult, PlacedPart } from '../nesting'
import { formatMm } from '../types/app'

interface Props {
  result: NestResult | null
  materialName?: string
}

const PART_COLORS = ['#2a7a68', '#1e6b8a', '#5a6b3d', '#8a5a2a', '#4a5f7a', '#2f6b55']

export function CuttingMap({ result, materialName }: Props) {
  const [sheetTab, setSheetTab] = useState(0)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 })
  const dragRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(
    null,
  )
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    setSheetTab(0)
    setSelectedKey(null)
    setView({ x: 0, y: 0, scale: 1 })
  }, [result])

  const sheet = result?.sheets[sheetTab] ?? null

  const numberedParts = useMemo(() => {
    if (!sheet) return []
    return sheet.parts.map((p, i) => ({
      ...p,
      number: i + 1,
      key: `${p.partId}-${p.instanceIndex}-${i}`,
    }))
  }, [sheet])

  const activeKey = hoveredKey ?? selectedKey
  const active = numberedParts.find((p) => p.key === activeKey) ?? null

  function onWheel(e: ReactWheelEvent) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setView((v) => ({
      ...v,
      scale: Math.min(8, Math.max(0.2, v.scale * delta)),
    }))
  }

  function onPointerDown(e: ReactPointerEvent) {
    if (e.button !== 0) return
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    setView((v) => ({
      ...v,
      x: dragRef.current!.vx + dx,
      y: dragRef.current!.vy + dy,
    }))
  }

  function onPointerUp() {
    dragRef.current = null
  }

  function resetView() {
    setView({ x: 0, y: 0, scale: 1 })
  }

  if (!result || !sheet) {
    return (
      <div className="h-full min-h-[420px] flex items-center justify-center panel rounded-md">
        <div className="text-center px-6 max-w-md">
          <div className="section-title mb-2">Карта розкрою</div>
          <p className="text-[var(--ink-muted)] text-sm leading-relaxed">
            Тут з’явиться схема листів після розрахунку. Перетягуйте для панорамування,
            коліщатко — масштаб.
          </p>
        </div>
      </div>
    )
  }

  const pad = 40
  const vbW = sheet.width + pad * 2
  const vbH = sheet.height + pad * 2

  return (
    <div className="h-full min-h-[420px] panel rounded-md flex flex-col overflow-hidden animate-map-in">
      <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-b border-[var(--panel-edge)] bg-[#eef2f6]/70">
        <h2 className="section-title mr-auto">Карта розкрою</h2>
        {materialName && (
          <span className="text-xs text-[var(--ink-muted)]">{materialName}</span>
        )}
        <div className="flex gap-1">
          {result.sheets.map((s, i) => (
            <button
              key={s.index}
              type="button"
              className={`btn text-xs px-2 py-1 ${
                i === sheetTab ? 'btn-primary' : 'btn-ghost'
              }`}
              onClick={() => {
                setSheetTab(i)
                setSelectedKey(null)
                resetView()
              }}
            >
              Лист {i + 1}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost text-xs" onClick={resetView}>
          Скинути вид
        </button>
      </div>

      <div className="relative flex-1 bg-[linear-gradient(135deg,#cfd8e3_0%,#b9c5d3_100%)] overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
          viewBox={`0 0 ${vbW} ${vbH}`}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <g transform={`translate(${view.x + pad}, ${view.y + pad}) scale(${view.scale})`}>
            {/* Sheet */}
            <rect
              x={0}
              y={0}
              width={sheet.width}
              height={sheet.height}
              fill="var(--sheet)"
              stroke="#3a4a5c"
              strokeWidth={2 / view.scale}
            />

            {/* Waste hatch */}
            <defs>
              <pattern
                id="waste-hatch"
                width={16}
                height={16}
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(35)"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="16"
                  stroke="var(--waste)"
                  strokeWidth="1"
                  opacity="0.35"
                />
              </pattern>
              <marker
                id="grain-head"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="2.5"
                orient="auto"
              >
                <path d="M0,0 L5,2.5 L0,5 Z" fill="#e8f5f0" />
              </marker>
            </defs>
            <rect
              x={0}
              y={0}
              width={sheet.width}
              height={sheet.height}
              fill="url(#waste-hatch)"
              pointerEvents="none"
            />

            {/* Grain arrow on sheet */}
            {sheet.grain !== 'none' && (
              <GrainArrow
                sheetW={sheet.width}
                sheetH={sheet.height}
                alongX={sheet.grain === 'length'}
                scale={view.scale}
              />
            )}

            {numberedParts.map((p, idx) => (
              <PartRect
                key={p.key}
                part={p}
                number={p.number}
                color={PART_COLORS[idx % PART_COLORS.length]}
                active={p.key === activeKey}
                scale={view.scale}
                showGrain={p.grain !== 'none'}
                onEnter={() => setHoveredKey(p.key)}
                onLeave={() => setHoveredKey(null)}
                onClick={() =>
                  setSelectedKey((k) => (k === p.key ? null : p.key))
                }
              />
            ))}
          </g>
        </svg>

        {active && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto panel rounded px-3 py-2 text-sm shadow-lg pointer-events-none">
            <div className="font-bold">
              №{active.number} · {active.name}
            </div>
            <div className="mono text-[var(--ink-muted)] mt-0.5">
              {formatMm(active.width)} × {formatMm(active.height)} мм
              {active.rotated ? ' · повернуто 90°' : ''}
              {' · '}
              поз. ({formatMm(active.x)}; {formatMm(active.y)})
            </div>
          </div>
        )}

        <div className="absolute top-3 right-3 text-[11px] mono bg-white/80 border border-[var(--panel-edge)] rounded px-2 py-1 text-[var(--ink-muted)]">
          {sheet.width}×{sheet.height} мм · {sheet.utilization.toFixed(1)}%
        </div>
      </div>
    </div>
  )
}

function PartRect({
  part,
  number,
  color,
  active,
  scale,
  showGrain,
  onEnter,
  onLeave,
  onClick,
}: {
  part: PlacedPart & { key: string }
  number: number
  color: string
  active: boolean
  scale: number
  showGrain: boolean
  onEnter: () => void
  onLeave: () => void
  onClick: () => void
}) {
  const stroke = active ? '#c45c26' : 'var(--part-stroke)'
  const sw = (active ? 2.5 : 1.2) / scale
  const fontSize = Math.min(part.width, part.height) * 0.18
  const labelSize = Math.max(10 / scale, Math.min(fontSize, 28 / scale))

  return (
    <g
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      style={{ cursor: 'pointer' }}
    >
      <rect
        x={part.x}
        y={part.y}
        width={part.width}
        height={part.height}
        fill={color}
        fillOpacity={active ? 0.92 : 0.78}
        stroke={stroke}
        strokeWidth={sw}
      />
      <text
        x={part.x + part.width / 2}
        y={part.y + part.height / 2 - labelSize * 0.35}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#f4faf8"
        fontSize={labelSize}
        fontFamily="var(--font-mono)"
        fontWeight={600}
        style={{ pointerEvents: 'none' }}
      >
        {number}
      </text>
      <text
        x={part.x + part.width / 2}
        y={part.y + part.height / 2 + labelSize * 0.55}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#dceee8"
        fontSize={labelSize * 0.55}
        fontFamily="var(--font-ui)"
        style={{ pointerEvents: 'none' }}
      >
        {truncate(part.name, 14)}
      </text>
      {active && (
        <text
          x={part.x + part.width / 2}
          y={part.y + part.height - 6 / scale}
          textAnchor="middle"
          fill="#fff4e8"
          fontSize={Math.max(9 / scale, labelSize * 0.45)}
          fontFamily="var(--font-mono)"
          style={{ pointerEvents: 'none' }}
        >
          {formatMm(part.width)}×{formatMm(part.height)}
        </text>
      )}
      {showGrain && (
        <line
          x1={part.x + part.width * 0.2}
          y1={part.y + part.height * 0.15}
          x2={part.x + part.width * 0.8}
          y2={part.y + part.height * 0.15}
          stroke="#e8f5f0"
          strokeWidth={1.5 / scale}
          markerEnd="url(#grain-head)"
          opacity={0.7}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </g>
  )
}

function GrainArrow({
  sheetW,
  sheetH,
  alongX,
  scale,
}: {
  sheetW: number
  sheetH: number
  alongX: boolean
  scale: number
}) {
  const margin = 24
  if (alongX) {
    return (
      <g opacity={0.55} style={{ pointerEvents: 'none' }}>
        <defs>
          <marker
            id="sheet-grain"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="#3a4a5c" />
          </marker>
        </defs>
        <line
          x1={margin}
          y1={sheetH - margin}
          x2={sheetW - margin}
          y2={sheetH - margin}
          stroke="#3a4a5c"
          strokeWidth={2 / scale}
          markerEnd="url(#sheet-grain)"
        />
        <text
          x={sheetW / 2}
          y={sheetH - margin - 8 / scale}
          textAnchor="middle"
          fill="#3a4a5c"
          fontSize={12 / scale}
          fontFamily="var(--font-ui)"
        >
          малюнок
        </text>
      </g>
    )
  }
  return (
    <g opacity={0.55} style={{ pointerEvents: 'none' }}>
      <defs>
        <marker
          id="sheet-grain-v"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="#3a4a5c" />
        </marker>
      </defs>
      <line
        x1={margin}
        y1={sheetH - margin}
        x2={margin}
        y2={margin}
        stroke="#3a4a5c"
        strokeWidth={2 / scale}
        markerEnd="url(#sheet-grain-v)"
      />
      <text
        x={margin + 10 / scale}
        y={sheetH / 2}
        fill="#3a4a5c"
        fontSize={12 / scale}
        fontFamily="var(--font-ui)"
        transform={`rotate(-90 ${margin + 10 / scale} ${sheetH / 2})`}
      >
        малюнок
      </text>
    </g>
  )
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}
