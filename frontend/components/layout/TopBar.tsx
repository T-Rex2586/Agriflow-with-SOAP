'use client'

import { UserCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface TopBarProps {
  pageCode?: string
}

export default function TopBar({ pageCode }: TopBarProps) {
  const { user } = useAuth()

  const roleLabel: Record<string, string> = {
    DISTRIBUTOR: 'Distributor',
    PENGECER: 'Pengecer',
    PEMERINTAH: 'Pemerintah',
  }

  const displayRole = user ? roleLabel[user.role] || user.role : 'Guest'
  const displayEmail = user?.email || 'guest@email.com'

  return (
    <header
      style={{
        height: '72px',
        borderBottom: '1px solid #e5e5e5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: pageCode ? 'space-between' : 'flex-end',
        padding: '0 36px',
        background: 'white',
        flexShrink: 0,
      }}
    >



      {/* User info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
        <UserCircle size={40} color="#1e6b1e" strokeWidth={1.5} />
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: '#1a1a1a' }}>
            {displayRole}
          </p>
          <p style={{ fontSize: '13px', color: '#666' }}>
            {displayEmail}
          </p>
        </div>
      </div>
      
    </header>
  )
}