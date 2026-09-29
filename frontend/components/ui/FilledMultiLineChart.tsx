'use client'

interface DataPoint {
  tanggalMulai: string
  distributorKg: number
  pengecerKg: number
  petaniKg: number
}

interface FilledMultiLineChartProps {
  data: DataPoint[]
}

const COLORS = {
  distributor: { line: '#1a5e1a', fill: '#1a5e1a', fillOpacity: '0.15', label: 'Distributor' },
  pengecer:   { line: '#72A94F', fill: '#72A94F', fillOpacity: '0.15', label: 'Pengecer' },
  petani:     { line: '#BA1A1A', fill: '#BA1A1A', fillOpacity: '0.15', label: 'Petani (Ditebus)' },
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export default function FilledMultiLineChart({ data }: FilledMultiLineChartProps) {
  if (!data.length) return <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '32px' }}>Belum ada data</p>

  const w = 1000, h = 300, pad = { top: 30, right: 30, bottom: 45, left: 60 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom

  const allValues = data.flatMap(d => [d.distributorKg, d.pengecerKg, d.petaniKg])
  const maxVal = Math.max(...allValues, 1)
  const minDate = new Date(data[0].tanggalMulai + 'T00:00:00')
  const maxDate = new Date(data[data.length - 1].tanggalMulai + 'T00:00:00')
  const timeRange = maxDate.getTime() - minDate.getTime() || 1

  const xFn = (d: DataPoint) => {
    const t = new Date(d.tanggalMulai + 'T00:00:00').getTime()
    return pad.left + ((t - minDate.getTime()) / timeRange) * chartW
  }
  const yFn = (v: number) => pad.top + chartH - (v / maxVal) * chartH

  const makePath = (key: 'distributorKg' | 'pengecerKg' | 'petaniKg') => {
    const pts = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xFn(d).toFixed(1)},${yFn(d[key]).toFixed(1)}`)
    return pts.join(' ')
  }

  const makeArea = (key: 'distributorKg' | 'pengecerKg' | 'petaniKg') => {
    const lineD = makePath(key)
    const lastX = xFn(data[data.length - 1]).toFixed(1)
    const firstX = xFn(data[0]).toFixed(1)
    const bottom = pad.top + chartH
    return `${lineD} L${lastX},${bottom} L${firstX},${bottom} Z`
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ v: maxVal * f, y: yFn(maxVal * f) }))

  // Show x-axis labels every ~8 weeks to avoid overcrowding
  const labelInterval = Math.max(1, Math.floor(data.length / 8))
  const showLabels = data.length < 200

  const keys: ('distributorKg' | 'pengecerKg' | 'petaniKg')[] = ['distributorKg', 'pengecerKg', 'petaniKg']
  const colorKeys = ['distributor', 'pengecer', 'petani'] as const

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '12px', justifyContent: 'center' }}>
        {(['distributor', 'pengecer', 'petani'] as const).map(k => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 16, height: 3, borderRadius: 2, background: COLORS[k].line }} />
            <span style={{ fontSize: '12px', color: '#555', fontWeight: 600 }}>{COLORS[k].label}</span>
          </div>
        ))}
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} width='100%' height='280' style={{ overflow: 'visible' }}>
        <defs>
          {(['distributor', 'pengecer', 'petani'] as const).map(k => (
            <linearGradient key={k} id={`areaGrad-${k}`} x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0%' stopColor={COLORS[k].fill} stopOpacity='0.25' />
              <stop offset='100%' stopColor={COLORS[k].fill} stopOpacity='0.03' />
            </linearGradient>
          ))}
        </defs>

        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pad.left} y1={t.y} x2={w - pad.right} y2={t.y} stroke='#eee' strokeWidth='1' />
            <text x={pad.left - 8} y={t.y + 4} textAnchor='end' fontSize='10' fill='#aaa'>
              {Math.round(t.v).toLocaleString('id-ID')}
            </text>
          </g>
        ))}

        {keys.map((key, idx) => {
          const k = colorKeys[idx]
          return (
            <g key={k}>
              <path d={makeArea(key)} fill={`url(#areaGrad-${k})`} />
              <path d={makePath(key)} fill='none' stroke={COLORS[k].line} strokeWidth='2' strokeLinejoin='round' strokeLinecap='round' />
              {showLabels && data.map((d, i) => (
                <circle key={i} cx={xFn(d)} cy={yFn(d[key])} r='2.5' fill={COLORS[k].line} stroke='white' strokeWidth='1.5' />
              ))}
            </g>
          )
        })}

        {showLabels && data.filter((_, i) => i % labelInterval === 0).map((d, i) => (
          <text key={i} x={xFn(d)} y={h - 8} textAnchor='middle' fontSize='9' fill='#888'>
            {formatShortDate(d.tanggalMulai)}
          </text>
        ))}
      </svg>
    </div>
  )
}
