'use client'

import Link from 'next/link'
import { LogIn } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'

export default function HeroSection() {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '580px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background image with overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            "url('/utama.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.55)',
        }}
      />

      {/* Gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, rgba(15,61,15,0.7) 0%, rgba(30,107,30,0.4) 60%, transparent 100%)',
        }}
      />

      <Navbar />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 1200,
          margin: '0 auto',
          padding: '120px 48px 72px',
          width: '100%',
        }}
      >

        {/* Headline */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(36px, 5vw, 60px)',
            color: 'white',
            lineHeight: 1.1,
            marginBottom: '16px',
            maxWidth: '560px',
            letterSpacing: '-0.02em',
          }}
        >
          Sistem Penyaluran
          <br />
          Pupuk Subsidi
        </h1>

        {/* Subheadline */}
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: 'clamp(18px, 2.5vw, 26px)',
            color: 'rgba(255,255,255,0.85)',
            marginBottom: '40px',
          }}
        >
          Transparan dan Tepat Sasaran
        </p>

        {/* CTA input-style box */}
        <Link
          href="/register"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: '440px',
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '16px',
            padding: '16px 16px 16px 24px',
            gap: '16px',
            boxShadow: '0 8px 32px rgba(15,61,15,0.2)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.transform = 'translateY(-2px)'
            el.style.boxShadow = '0 12px 40px rgba(15,61,15,0.25)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.transform = 'translateY(0)'
            el.style.boxShadow = '0 8px 32px rgba(15,61,15,0.2)'
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '15px',
              color: '#4a7a4a',
            }}
          >
            Ayo registrasikan akunmu!
          </span>
          <div
            style={{
              width: 40,
              height: 40,
              background: '#1e6b1e',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <LogIn size={18} color="white" />
          </div>
        </Link>
      </div>
    </section>
  )
}