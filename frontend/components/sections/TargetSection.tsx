import { Lock, Target, Clock } from 'lucide-react'

const criteria = [
  {
    number: '1',
    title: 'Petani Terdaftar',
    desc: 'Petani yang telah terdata resmi dalam sistem dan memiliki identitas valid.',
  },
  {
    number: '2',
    title: 'Memiliki Lahan Pertanian',
    desc: 'Petani dengan lahan aktif yang digunakan untuk kegiatan pertanian.',
  },
  {
    number: '3',
    title: 'Lokasi Sesuai Wilayah Subsidi',
    desc: 'Berada di wilayah yang termasuk dalam program subsidi pemerintah.',
  },
  {
    number: '4',
    title: 'Memenuhi Persyaratan Administrasi',
    desc: 'Telah melengkapi dokumen dan data yang dibutuhkan untuk verifikasi.',
  },
]

const features = [
  {
    icon: <Lock size={28} strokeWidth={1.5} />,
    title: 'Transparan',
    subtitle: 'Terbuka & dapat dipantau',
    active: false,
  },
  {
    icon: <Target size={28} strokeWidth={1.5} />,
    title: 'Tepat Sasaran',
    subtitle: 'Berbasis data akurat',
    active: true,
  },
  {
    icon: <Clock size={28} strokeWidth={1.5} />,
    title: 'Efisien',
    subtitle: 'Proses cepat & terintegrasi',
    active: false,
  },
]

export default function TargetSection() {
  return (
    <section
      style={{
        background: '#f0f9f0',
        padding: '72px 48px',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '64px',
          alignItems: 'start',
        }}
      >
        {/* Left: Criteria */}
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 'clamp(28px, 3vw, 40px)',
              color: '#155215',
              marginBottom: '40px',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            Target Penerima
            <br />
            Subsidi
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {criteria.map(({ number, title, desc }) => (
              <div key={number} style={{ display: 'flex', gap: '16px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '18px',
                    color: '#1e6b1e',
                    minWidth: '24px',
                    paddingTop: '2px',
                  }}
                >
                  {number}.
                </span>
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '16px',
                      color: '#1e6b1e',
                      marginBottom: '6px',
                    }}
                  >
                    {title}
                  </p>
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#4a7a4a',
                      lineHeight: 1.65,
                    }}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Feature cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {features.map(({ icon, title, subtitle, active }) => (
            <div
              key={title}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '24px 28px',
                borderRadius: '16px',
                background: active ? '#1e6b1e' : '#c8e6c8',
                transition: 'transform 0.2s ease',
                cursor: 'default',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '12px',
                  background: active ? 'rgba(255,255,255,0.15)' : 'rgba(30,107,30,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: active ? 'white' : '#1e6b1e',
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '18px',
                    color: active ? 'white' : '#155215',
                    marginBottom: '4px',
                  }}
                >
                  {title}
                </p>
                <p
                  style={{
                    fontSize: '14px',
                    color: active ? 'rgba(255,255,255,0.75)' : '#4a7a4a',
                    fontWeight: 500,
                  }}
                >
                  {subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}