'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  UserCheck,
  AlertTriangle,
  Bell,
  HelpCircle,
  LogOut,
  Users,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { invokeSoap } from '@/lib/soap-pemerintah'

const navItems = [
  { label: 'Dashboard',            href: '/pemerintah/dashboard',       icon: Home },
  { label: 'Verifikasi Pendaftar', href: '/pemerintah/verifikasi',      icon: UserCheck },
  { label: 'User Management',      href: '/pemerintah/user-management', icon: Users },
  { label: 'Notifikasi',           href: '/pemerintah/notifikasi',      icon: Bell },
  { label: 'Deteksi Anomali',      href: '/pemerintah/anomali',         icon: AlertTriangle },
  { label: 'Bantuan & Keluhan',    href: '/pemerintah/bantuan',         icon: HelpCircle },
]

export default function SidebarPemerintah() {
  const [notifCount, setNotifCount] = useState(0)
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // 🔓 UNSIGNED SOAP — GetUnreadCount
    invokeSoap('GetUnreadCount', { UserId: user?.userId || 1 })
      .then(res => {
        if (res.data?.UnreadCount !== undefined) {
          setNotifCount(Number(res.data.UnreadCount))
        }
      })
      .catch(() => {})
  }, [user])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const linkStyle = (href: string) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    borderRadius: '10px',
    fontFamily: 'var(--font-display)',
    fontWeight: pathname === href ? 700 : 400,
    fontSize: '15px',
    color: 'white',
    background: 'transparent',
    textDecoration: 'none',
    transition: 'background 0.15s',
    position: 'relative' as const,
  })

  const activeBar = (href: string) =>
    pathname === href ? (
      <div
        style={{
          position: 'absolute',
          right: '-16px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '4px',
          height: '32px',
          background: 'white',
          borderRadius: '4px 0 0 4px',
        }}
      />
    ) : null

  return (
    <aside
      style={{
        width: '240px',
        height: '100vh',
        background: '#114111',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '24px 20px 32px' }}>
        <Link href="/">
          <Image src="/LogoPutih.png" alt="AgriFlow" width={140} height={40} style={{ objectFit: 'contain' }} />
        </Link>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} style={linkStyle(href)}>
            <Icon size={20} strokeWidth={1.8} />
            <span style={{ flex: 1 }}>{label}</span>
            {label === 'Notifikasi' && notifCount > 0 && (
              <span style={{ background: '#BA1A1A', color: 'white', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px' }}>
                {notifCount}
              </span>
            )}
            {activeBar(href)}
          </Link>
        ))}
      </nav>

      {/* Divider */}
      <div style={{ margin: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.2)' }} />

      {/* Logout */}
      <div style={{ padding: '0 16px 32px' }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            borderRadius: '10px',
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: '15px',
            color: 'white',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            opacity: 0.85,
          }}
        >
          <LogOut size={20} strokeWidth={1.8} />
          Keluar
        </button>
      </div>
    </aside>
  )
}
