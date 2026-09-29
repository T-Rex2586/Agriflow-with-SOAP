import Link from 'next/link'
import { Phone, Mail, AtSign } from 'lucide-react'

export default function Footer() {
  return (
    <footer
      style={{
        background: '#0f3d0f',
        color: 'white',
        padding: '40px 48px',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '32px',
        }}
      >
        {/* Left: About */}
        <div style={{ maxWidth: 280 }}>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '15px',
              marginBottom: '12px',
              color: '#b8e0b8',
            }}
          >
            Tentang Kami
          </p>
          <p
            style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.7,
            }}
          >
            Kami merupakan kelompok 1, Sains Data, Semester 4, Universitas Sebelas Maret.
          </p>
        </div>

        {/* Right: Contact */}
        <div>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '15px',
              marginBottom: '12px',
              color: '#b8e0b8',
            }}
          >
            Kontak
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { icon: <Phone size={14} />, label: '(+62) 81234567890' },
              { icon: <Mail size={14} />, label: 'kelompok_1@gmail.com' },
            ].map(({ icon, label }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.65)',
                }}
              >
                <span style={{ color: '#86c886' }}>{icon}</span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1200,
          margin: '32px auto 0',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          textAlign: 'center',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.35)',
        }}
      >
        © {new Date().getFullYear()} AgriFlow. All rights reserved.
      </div>
    </footer>
  )
}