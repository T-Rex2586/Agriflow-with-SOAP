'use client'

interface BarItem {
  label: string
  value: number
}

interface HorizontalBarProps {
  data: BarItem[]
  color?: string
  unit?: string
}

export default function HorizontalBar({ data, color = '#1e6b1e', unit = 'Kg' }: HorizontalBarProps) {
  if (!data.length) return <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '24px' }}>Belum ada data</p>

  const maxVal = Math.max(...data.map(d => d.value), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map((item, idx) => {
        const pct = (item.value / maxVal) * 100
        return (
          <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>
                {idx + 1}. {item.label}
              </span>
              <span style={{ fontSize: '13px', color: '#555', fontWeight: 500 }}>
                {item.value.toLocaleString('id-ID')} {unit}
              </span>
            </div>
            <div style={{ height: '18px', borderRadius: '4px', background: '#e8f5e9', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
