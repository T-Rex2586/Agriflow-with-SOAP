'use client'

interface DataPoint {
  tahun: number
  bulan: number
  totalPupuk: number
}

interface LineChartProps {
  data: DataPoint[]
  label?: string
}

const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']

export default function LineChart({ data, label }: LineChartProps) {
  if (!data.length) return <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '32px' }}>Belum ada data</p>

  const w = 1000, h = 260, pad = { top: 25, right: 30, bottom: 40, left: 55 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom

  const maxVal = Math.max(...data.map(d => d.totalPupuk), 1)
  const minDate = new Date(data[0].tahun, data[0].bulan - 1)
  const maxDate = new Date(data[data.length - 1].tahun, data[data.length - 1].bulan - 1)
  const timeRange = maxDate.getTime() - minDate.getTime() || 1

  const xFn = (d: DataPoint) => {
    const t = new Date(d.tahun, d.bulan - 1).getTime()
    return pad.left + ((t - minDate.getTime()) / timeRange) * chartW
  }
  const yFn = (v: number) => pad.top + chartH - (v / maxVal) * chartH

  const lineD = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xFn(d).toFixed(1)},${yFn(d.totalPupuk).toFixed(1)}`).join(' ')

  const areaD = `${lineD} L${xFn(data[data.length-1]).toFixed(1)},${pad.top + chartH} L${xFn(data[0]).toFixed(1)},${pad.top + chartH} Z`

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ v: maxVal * f, y: yFn(maxVal * f) }))

  const showLabels = data.length < 50

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width='100%' height='240' style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id='areaGrad' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stopColor='#1e6b1e' stopOpacity='0.2' />
            <stop offset='100%' stopColor='#1e6b1e' stopOpacity='0.02' />
          </linearGradient>
        </defs>

        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pad.left} y1={t.y} x2={w - pad.right} y2={t.y}
              stroke='#eee' strokeWidth='1' />
            <text x={pad.left - 8} y={t.y + 4} textAnchor='end' fontSize='10' fill='#aaa'>
              {Math.round(t.v).toLocaleString('id-ID')}
            </text>
          </g>
        ))}

        <path d={areaD} fill='url(#areaGrad)' />
        <path d={lineD} fill='none' stroke='#1e6b1e' strokeWidth='2' strokeLinejoin='round' strokeLinecap='round' />

        {showLabels && data.map((d, i) => (
          <g key={i}>
            <circle cx={xFn(d)} cy={yFn(d.totalPupuk)} r='3' fill='#1e6b1e' stroke='white' strokeWidth='1.5' />
          </g>
        ))}

        {showLabels && data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 12)) === 0).map((d, i) => (
          <text key={i} x={xFn(d)} y={h - 8} textAnchor='middle' fontSize='10' fill='#888'>
            {BULAN[(d.bulan - 1) % 12]} {d.tahun}
          </text>
        ))}
      </svg>
    </div>
  )
}
