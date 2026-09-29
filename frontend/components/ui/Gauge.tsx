'use client'

interface GaugeProps {
  value: number
  target?: number
  label: string
}

export default function Gauge({ value, target = 75, label }: GaugeProps) {
  const pct = Math.max(0, Math.min(100, value))
  const color = pct < 50 ? '#BA1A1A' : pct < target ? '#D97706' : '#1e6b1e'

  return (
    <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
      <div style={{ position: 'relative', height: '32px', borderRadius: '16px', background: '#e8e8e8', overflow: 'visible' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '16px', transition: 'width 0.5s ease' }} />
        <div style={{ position: 'absolute', top: '-8px', left: `${target}%`, width: '3px', height: '48px', background: '#114111', borderRadius: '1px' }} />
        <div style={{ position: 'absolute', top: '-12px', left: `${target}%`, transform: 'translateX(-50%)', fontSize: '11px', color: '#114111', fontWeight: 700 }}>
          ▲
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888' }}>
        <span>0%</span>
        <span style={{ fontWeight: 700, color: '#114111' }}>Target {target}%</span>
        <span>100%</span>
      </div>
      <div style={{ textAlign: 'center', marginTop: '4px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '44px', color: '#1a1a1a', lineHeight: 1 }}>
          {pct.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}
