'use client'

import { HelpCircle } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FloatingHelp() {
  const [hovered, setHovered] = useState(false)
  const router = useRouter()

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push('/bantuan')}
      style={{
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: hovered ? '14px 22px 14px 18px' : '14px 10px',
        background: 'white',
        color: '#1e6b1e',
        borderRadius: '999px',
        boxShadow: '0 4px 24px rgba(15, 61, 15, 0.18)',
        border: '1.5px solid #c8e6c8',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
      aria-label="Hubungi Bantuan"
    >
      <HelpCircle size={20} color="#1e6b1e" />
      <span
        style={{
          maxWidth: hovered ? '120px' : '0px',
          opacity: hovered ? 1 : 0,
          overflow: 'hidden',
          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        Hubungi Bantuan
      </span>
    </button>
  )
}