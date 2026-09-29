'use client'

import Link from 'next/link'
import Image from 'next/image'
import { LogIn } from 'lucide-react'

export default function Navbar() {
  return (
    <nav
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 48px',
      }}
    >
      {/* Logo badge oval */}
      <Link href="/">
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(255,255,255,0.3)',
            borderRadius: '999px',
            padding: '6px 20px 6px 6px',
          }}
        >
          {/* Icon circle hijau */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#1e6b1e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <Image
              src="/LogoPutih_Kepala.png"
              alt="AgriFlow"
              width={28}
              height={28}
              style={{ objectFit: 'cover', objectPosition: 'left center' }}
              priority
            />
          </div>

          {/* Text AgriFlow */}
          <span
            style={{
              color: 'white',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '15px',
              letterSpacing: '-0.01em',
            }}
          >
            AgriFlow
          </span>
        </div>
      </Link>

      {/* Login Button */}
      <Link
        href="/login"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'white',
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: '15px',
          padding: '8px 16px',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(8px)',
          border: '1.5px solid rgba(255,255,255,0.3)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLAnchorElement
          el.style.background = 'rgba(255,255,255,0.2)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLAnchorElement
          el.style.background = 'rgba(255,255,255,0.1)'
        }}
      >
        Login
        <div
          style={{
            width: 32,
            height: 32,
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LogIn size={16} color="#1e6b1e" />
        </div>
      </Link>
    </nav>
  )
}