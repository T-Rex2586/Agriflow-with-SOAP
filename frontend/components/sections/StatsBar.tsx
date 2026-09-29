import { Users, Truck, Package } from 'lucide-react'

interface StatsData {
  totalFarmers: number
  distributedTon: number
  fertilizerCount: number
}

async function getStats(): Promise<StatsData> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backendrsi.kelompok1rsi.site'
    const res = await fetch(`${apiUrl}/api/landing/stats`, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error()
    const json = await res.json()
    return json.data || { totalFarmers: 0, distributedTon: 0, fertilizerCount: 0 }
  } catch {
    return { totalFarmers: 0, distributedTon: 0, fertilizerCount: 0 }
  }
}

const fallbackStats = [
  { icon: <Users size={36} strokeWidth={1.5} />, value: '12k+',       label: 'Petani Terdaftar' },
  { icon: <Truck size={36} strokeWidth={1.5} />, value: '500 kg',    label: 'Pupuk Disalurkan' },
  { icon: <Package size={36} strokeWidth={1.5} />, value: '50+',       label: 'Jenis Pupuk' },
]

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k+`
  return `${n}+`
}

export default async function StatsBar() {
  const statsData = await getStats()
  const hasData = statsData.totalFarmers > 0 || statsData.distributedTon > 0 || statsData.fertilizerCount > 0

  const stats = hasData
    ? [
        { icon: <Users size={36} strokeWidth={1.5} />, value: fmt(statsData.totalFarmers), label: 'Petani Terdaftar' },
        { icon: <Truck size={36} strokeWidth={1.5} />, value: statsData.distributedTon >= 1000 ? `${(statsData.distributedTon / 1000).toFixed(2)} Ton` : `${statsData.distributedTon.toFixed(2)} kg`, label: 'Pupuk Disalurkan' },
        { icon: <Package size={36} strokeWidth={1.5} />, value: fmt(statsData.fertilizerCount), label: 'Jenis Pupuk' },
      ]
    : fallbackStats
  return (
    <section
      style={{
        background: '#155215',
        padding: '40px 48px',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 'clamp(32px, 8vw, 120px)',
          flexWrap: 'wrap',
        }}
      >
        {stats.map(({ icon, value, label }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <div style={{ color: 'rgba(255,255,255,0.75)' }}>{icon}</div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 'clamp(28px, 3vw, 40px)',
                  color: 'white',
                  lineHeight: 1,
                  marginBottom: '4px',
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.65)',
                  fontWeight: 500,
                }}
              >
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}