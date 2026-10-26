import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { Roast, Unit } from '../lib/types'
import { computeMetrics, rateOfRise, setpointAt, tempAt } from '../lib/metrics'
import { deltaIn, fmtTime, tempIn } from '../lib/format'

type Curve = Pick<Roast, 'readings' | 'setpoints' | 'events' | 'batch_g' | 'roasted_g'>

interface Props {
  roast: Curve
  reference?: Curve | null
  referenceLabel?: string
  unit: Unit
  nowS?: number | null // live roast: where "now" is
  height?: number
  rorHeight?: number
  ghostSetpoints?: { t: number; c: number }[] // a plan's set temperatures, drawn faintly
}

const PAD = { l: 34, r: 12, t: 32, b: 20 }

function niceStep(range: number, target: number) {
  const raw = range / target
  const mag = 10 ** Math.floor(Math.log10(raw))
  for (const s of [1, 2, 2.5, 5, 10]) if (raw <= s * mag) return s * mag
  return 10 * mag
}

const eventLabel: Record<string, string> = { yellow: 'Yellow', fc_start: '1C', fc_end: '1C end', sc_start: '2C', drop: 'Cool' }

export default function RoastChart({ roast, reference, referenceLabel, unit, nowS, height = 220, rorHeight = 84, ghostSetpoints }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(340)
  const [hoverT, setHoverT] = useState<number | null>(null)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, Math.floor(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const m = useMemo(() => computeMetrics(roast, nowS ?? undefined), [roast, nowS])
  const refM = useMemo(() => (reference ? computeMetrics(reference) : null), [reference])
  const ror = useMemo(() => rateOfRise(roast.readings), [roast.readings])
  const refRor = useMemo(() => (reference ? rateOfRise(reference.readings) : []), [reference])

  const u = (c: number) => (unit === 'F' ? (c * 9) / 5 + 32 : c)

  // ——— scales ———
  const lastT = Math.max(
    10 * 60,
    m.totalS ?? 0,
    nowS ?? 0,
    refM?.totalS ?? 0,
    ...roast.readings.map((r) => r.t),
    ...(reference?.readings.map((r) => r.t) ?? []),
  )
  const xMax = Math.ceil((lastT + 30) / 60) * 60
  const plotW = width - PAD.l - PAD.r
  const x = (t: number) => PAD.l + (t / xMax) * plotW
  const tFromX = (px: number) => Math.max(0, Math.min(xMax, ((px - PAD.l) / plotW) * xMax))

  const temps = [
    ...roast.readings.map((r) => u(r.c)),
    ...roast.setpoints.map((s) => u(s.c)),
    ...(reference?.readings.map((r) => u(r.c)) ?? []),
    ...(ghostSetpoints?.map((s) => u(s.c)) ?? []),
  ]
  const tMin0 = temps.length ? Math.min(...temps) : u(60)
  const tMax0 = temps.length ? Math.max(...temps) : u(250)
  const yStep = niceStep(Math.max(tMax0 - tMin0, 40), 4)
  const yMin = Math.floor((tMin0 - yStep * 0.3) / yStep) * yStep
  const yMax = Math.ceil((tMax0 + yStep * 0.3) / yStep) * yStep
  // Event labels sit above the plot. When one would overlap another, it moves up a row
  // (up to three), and the plot starts lower to make room.
  const marks = roast.events.filter((e) => e.type in eventLabel).sort((a, b) => a.t - b.t)
  const labels: { row: number; end: boolean }[] = []
  const rowEnds = [-Infinity, -Infinity, -Infinity]
  for (const e of marks) {
    const w = eventLabel[e.type].length * 5.6 + 4
    const end = x(e.t) + w + 2 > width - PAD.r // near the right edge: put the label left of the line
    const start = end ? x(e.t) - 2 - w : x(e.t) + 2
    let row = rowEnds.findIndex((r) => start >= r)
    if (row < 0) row = rowEnds.indexOf(Math.min(...rowEnds))
    labels.push({ row, end })
    rowEnds[row] = start + w
  }
  const padT = PAD.t + 12 * Math.max(0, ...labels.map((l) => l.row))

  const plotH = height - PAD.t - PAD.b
  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * plotH

  const rorVals = [...ror.map((p) => deltaIn(p.ror, unit)), ...refRor.map((p) => deltaIn(p.ror, unit))]
  const rMax0 = rorVals.length ? Math.max(...rorVals, 5) : 20
  const rMin0 = rorVals.length ? Math.min(...rorVals, 0) : 0
  const rStep = niceStep(Math.max(rMax0 - rMin0, 5), 3)
  const rMin = Math.floor(rMin0 / rStep) * rStep
  const rMax = Math.ceil(rMax0 / rStep) * rStep
  const rPlotH = rorHeight - 8 - PAD.b
  const ry = (v: number) => 8 + (1 - (v - rMin) / (rMax - rMin || 1)) * rPlotH

  const minuteStep = plotW / (xMax / 60) >= 34 ? 1 : plotW / (xMax / 60) >= 17 ? 2 : 5
  const xTicks: number[] = []
  for (let s = 0; s <= xMax; s += minuteStep * 60) xTicks.push(s)
  const yTicks: number[] = []
  for (let v = yMin; v <= yMax + 1e-9; v += yStep) yTicks.push(v)
  const rTicks: number[] = []
  for (let v = rMin; v <= rMax + 1e-9; v += rStep) rTicks.push(v)

  // ——— paths ———
  const sorted = [...roast.readings].sort((a, b) => a.t - b.t)
  const line = (pts: { t: number; v: number }[], yy: (v: number) => number) =>
    pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${yy(p.v).toFixed(1)}`).join('')
  const tempPath = line(sorted.map((r) => ({ t: r.t, v: u(r.c) })), y)
  const refPath = reference ? line([...reference.readings].sort((a, b) => a.t - b.t).map((r) => ({ t: r.t, v: u(r.c) })), y) : ''
  const stepPath = (sps: { t: number; c: number }[], end: number) => {
    const s = [...sps].sort((a, b) => a.t - b.t)
    if (!s.length) return ''
    let d = `M${x(s[0].t)},${y(u(s[0].c))}`
    for (let i = 1; i < s.length; i++) d += `H${x(s[i].t)}V${y(u(s[i].c))}`
    return d + `H${x(Math.max(end, s[s.length - 1].t))}`
  }
  const setEnd = m.dropS ?? nowS ?? Math.max(m.totalS ?? 0, ...roast.setpoints.map((s) => s.t))
  const setPath = stepPath(roast.setpoints, setEnd)
  const ghostPath = ghostSetpoints?.length ? stepPath(ghostSetpoints, xMax) : ''
  const rorPath = line(ror.map((p) => ({ t: p.t, v: deltaIn(p.ror, unit) })), ry)
  const refRorPath = line(refRor.map((p) => ({ t: p.t, v: deltaIn(p.ror, unit) })), ry)

  // ——— phases ———
  const end = m.dropS ?? nowS ?? m.totalS
  const bands: { from: number; to: number; label: string; cls: string }[] = []
  if (end != null && end > 0) {
    const pct = (a: number, b: number) => `${Math.round(((b - a) / end) * 100)}%`
    if (m.yellowS != null) bands.push({ from: 0, to: m.yellowS, label: `Drying ${pct(0, m.yellowS)}`, cls: 'band-dry' })
    if (m.yellowS != null && m.fcS != null) bands.push({ from: m.yellowS, to: m.fcS, label: `Maillard ${pct(m.yellowS, m.fcS)}`, cls: 'band-maillard' })
    else if (m.yellowS != null && nowS != null) bands.push({ from: m.yellowS, to: nowS, label: 'Maillard', cls: 'band-maillard' })
    if (m.fcS != null && end > m.fcS) bands.push({ from: m.fcS, to: end, label: `Dev ${pct(m.fcS, end)}`, cls: 'band-dev' })
  }
  const smallMarks = roast.events.filter((e) => !(e.type in eventLabel))
  const refMarks = reference?.events.filter((e) => e.type === 'fc_start' || e.type === 'drop' || e.type === 'yellow') ?? []

  const last = sorted[sorted.length - 1]

  // ——— hover ———
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoverT(tFromX(e.clientX - rect.left))
  }
  const hv =
    hoverT == null
      ? null
      : {
          t: hoverT,
          temp: tempAt(roast.readings, hoverT),
          set: setpointAt(roast.setpoints, hoverT),
          ror: ror.length ? ror.reduce((a, b) => (Math.abs(b.t - hoverT) < Math.abs(a.t - hoverT) ? b : a)).ror : null,
          ref: reference ? tempAt(reference.readings, hoverT) : null,
        }

  const summary = `Roast curve: ${sorted.length} readings${m.fcS != null ? `, first crack at ${fmtTime(m.fcS)}` : ''}${m.dropS != null ? `, cool at ${fmtTime(m.dropS)}` : ''}${last ? `, last reading ${tempIn(last.c, unit)}°${unit}` : ''}.`

  return (
    <div ref={wrap} className="viz relative w-full select-none">
      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-2)]">
        <span className="inline-flex items-center gap-1"><i className="inline-block h-0.5 w-4 rounded bg-[var(--series-1)]" />Display (exhaust)</span>
        <span className="inline-flex items-center gap-1"><i className="inline-block h-0 w-4 border-t-2 border-dashed border-[var(--series-2)]" />Set temp</span>
        {reference && <span className="inline-flex items-center gap-1"><i className="inline-block h-0.5 w-4 rounded bg-[var(--ref)]" />{referenceLabel ?? 'Reference'}</span>}
        {ghostPath && <span className="inline-flex items-center gap-1"><i className="inline-block h-0 w-4 border-t-2 border-dotted border-[var(--ink-muted)]" />Plan</span>}
      </div>
      <svg
        width={width}
        height={height + padT - PAD.t}
        role="img"
        aria-label={summary}
        className="block touch-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHoverT(null)}
      >
        <rect x={PAD.l} y={padT} width={plotW} height={plotH} fill="var(--chart-surface)" />
        {bands.map((b) => (
          <g key={b.cls}>
            <rect x={x(b.from)} y={padT} width={Math.max(0, x(b.to) - x(b.from))} height={plotH} className={b.cls} />
            {x(b.to) - x(b.from) > 44 && (
              <text x={(x(b.from) + x(b.to)) / 2} y={padT + 12} textAnchor="middle" className="fill-[var(--ink-muted)] text-[10px]">
                {b.label}
              </text>
            )}
          </g>
        ))}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={width - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--grid)" strokeWidth={1} />
            <text x={PAD.l - 4} y={y(v) + 3} textAnchor="end" className="fill-[var(--ink-muted)] text-[10px] tabular-nums">{Math.round(v)}</text>
          </g>
        ))}
        {xTicks.filter((s) => x(s) < width - PAD.r - 24).map((s) => (
          <text key={s} x={x(s)} y={padT + plotH + PAD.b - 5} textAnchor="middle" className="fill-[var(--ink-muted)] text-[10px] tabular-nums">{s / 60}</text>
        ))}
        <text x={width - PAD.r} y={padT + plotH + PAD.b - 5} textAnchor="end" className="fill-[var(--ink-muted)] text-[10px]">min</text>
        <text x={PAD.l - 4} y={padT - 8} textAnchor="end" className="fill-[var(--ink-muted)] text-[10px]">°{unit}</text>
        <line x1={PAD.l} x2={width - PAD.r} y1={padT + plotH} y2={padT + plotH} stroke="var(--axis)" strokeWidth={1} />

        {refMarks.map((e, i) => (
          <line key={`rm${i}`} x1={x(e.t)} x2={x(e.t)} y1={padT + plotH - 10} y2={padT + plotH} stroke="var(--ref)" strokeWidth={2} />
        ))}
        {marks.map((e, i) => (
          <g key={`m${i}`}>
            <line x1={x(e.t)} x2={x(e.t)} y1={padT} y2={padT + plotH} stroke="var(--ink-muted)" strokeWidth={1} />
            <text x={labels[i].end ? x(e.t) - 2 : x(e.t) + 2} y={padT - 4 - labels[i].row * 12} textAnchor={labels[i].end ? 'end' : 'start'} className="fill-[var(--ink-2)] text-[10px] font-medium">{eventLabel[e.type]}</text>
          </g>
        ))}
        {smallMarks.map((e, i) => (
          <circle key={`s${i}`} cx={x(e.t)} cy={padT + plotH - 4} r={3} fill="var(--ink-muted)">
            <title>{`${fmtTime(e.t)} ${e.type}: ${e.value ?? ''} ${e.note ?? ''}`}</title>
          </circle>
        ))}

        {ghostPath && <path d={ghostPath} fill="none" stroke="var(--ink-muted)" strokeWidth={1.5} strokeDasharray="2 3" />}
        {refPath && <path d={refPath} fill="none" stroke="var(--ref)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.75} />}
        {setPath && <path d={setPath} fill="none" stroke="var(--series-2)" strokeWidth={2} strokeDasharray="5 4" />}
        {tempPath && <path d={tempPath} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {sorted.map((r, i) => (
          <circle key={i} cx={x(r.t)} cy={y(u(r.c))} r={i === sorted.length - 1 ? 4 : 2.5} fill="var(--series-1)" stroke="var(--chart-surface)" strokeWidth={i === sorted.length - 1 ? 2 : 1} />
        ))}
        {last && hv == null && (
          <text x={Math.min(x(last.t) + 7, width - PAD.r - 2)} y={y(u(last.c)) - 7} textAnchor={x(last.t) + 40 > width ? 'end' : 'start'} className="fill-[var(--ink-1)] text-[11px] font-semibold tabular-nums">
            {tempIn(last.c, unit)}°
          </text>
        )}
        {nowS != null && <line x1={x(nowS)} x2={x(nowS)} y1={padT} y2={padT + plotH} stroke="var(--accent)" strokeWidth={2} />}
        {hv && <line x1={x(hv.t)} x2={x(hv.t)} y1={padT} y2={padT + plotH} stroke="var(--ink-2)" strokeWidth={1} />}
      </svg>

      <div className="mt-1 text-xs text-[var(--ink-2)]">Rate of rise (°{unit}/min, from the display)</div>
      <svg width={width} height={rorHeight} aria-hidden className="block touch-none" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHoverT(null)}>
        <rect x={PAD.l} y={8} width={plotW} height={rPlotH} fill="var(--chart-surface)" />
        {rTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={width - PAD.r} y1={ry(v)} y2={ry(v)} stroke={v === 0 ? 'var(--axis)' : 'var(--grid)'} strokeWidth={1} />
            <text x={PAD.l - 4} y={ry(v) + 3} textAnchor="end" className="fill-[var(--ink-muted)] text-[10px] tabular-nums">{Math.round(v)}</text>
          </g>
        ))}
        {marks.map((e, i) => (
          <line key={i} x1={x(e.t)} x2={x(e.t)} y1={8} y2={8 + rPlotH} stroke="var(--ink-muted)" strokeWidth={1} />
        ))}
        {refRorPath && <path d={refRorPath} fill="none" stroke="var(--ref)" strokeWidth={2} opacity={0.75} strokeLinejoin="round" />}
        {rorPath && <path d={rorPath} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {xTicks.map((s) => (
          <text key={s} x={x(s)} y={rorHeight - 5} textAnchor="middle" className="fill-[var(--ink-muted)] text-[10px] tabular-nums">{s / 60}</text>
        ))}
        {nowS != null && <line x1={x(nowS)} x2={x(nowS)} y1={8} y2={8 + rPlotH} stroke="var(--accent)" strokeWidth={2} />}
        {hv && <line x1={x(hv.t)} x2={x(hv.t)} y1={8} y2={8 + rPlotH} stroke="var(--ink-2)" strokeWidth={1} />}
      </svg>

      {hv && (
        <div
          className="pointer-events-none absolute top-6 z-10 rounded-lg bg-[var(--tooltip-bg)] px-2.5 py-1.5 text-xs text-[var(--ink-1)] shadow-md ring-1 ring-[var(--border)]"
          style={x(hv.t) > width / 2 ? { left: 8 + PAD.l } : { right: 8 + PAD.r }}
        >
          <div className="font-semibold tabular-nums">{fmtTime(hv.t)}</div>
          {hv.temp != null && <div className="tabular-nums">Display {tempIn(hv.temp, unit)}°{unit}</div>}
          {hv.set != null && <div className="tabular-nums">Set {tempIn(hv.set, unit)}°{unit}</div>}
          {hv.ror != null && <div className="tabular-nums">RoR {deltaIn(hv.ror, unit).toFixed(1)}°/min</div>}
          {hv.ref != null && <div className="tabular-nums text-[var(--ink-2)]">{referenceLabel ?? 'Ref'} {tempIn(hv.ref, unit)}°{unit}</div>}
        </div>
      )}
    </div>
  )
}
