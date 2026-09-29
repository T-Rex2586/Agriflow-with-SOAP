'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Package,
  History,
  Truck,
  Bell,
  HelpCircle,
  LogOut,
  Plus,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

const navItems = [
  { label: 'Halaman Utama',      href: '/distributor/dashboard',          icon: Home },
  { label: 'Manajemen Stok',     href: '/distributor/manajemen-stok',     icon: Package },
  { label: 'Riwayat Stok',       href: '/distributor/riwayat-stok',       icon: History },
  { label: 'Riwayat Pengiriman', href: '/distributor/riwayat-pengiriman', icon: Truck },
  { label: 'Notifikasi',         href: '/distributor/notifikasi',         icon: Bell },
]

export default function Sidebar() {
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    api.get<{ count: number }>('/api/notifications/unread-count')
      .then(res => { if (res.data) setNotifCount(res.data.count) })
      .catch(() => {})
  }, [])
  const pathname = usePathname()
  const { logout } = useAuth()
  const router = useRouter()

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
      <div style={{ padding: '24px 20px 20px' }}>
        <Link href="/">
          {/* Pastikan gambar logo.png ada di folder public Yang Mulia */}
          <Image src="/LogoPutih.png" alt="AgriFlow" width={140} height={40} style={{ objectFit: 'contain' }} />
        </Link>
      </div>

      {/* Tambah Pengiriman Button (Sudah Dirapikan 1 Baris) */}
      <div style={{ padding: '0 16px 24px' }}>
        <Link
          href="/distributor/tambah-pengiriman"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '11px 12px',
            borderRadius: '999px',
            background: 'white',
            color: '#1e6b1e',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '14px',
            whiteSpace: 'nowrap', // Sihir agar tidak turun baris
            textDecoration: 'none',
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
          Tambah Pengiriman
        </Link>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} style={linkStyle(href)}>
            <Icon size={20} strokeWidth={1.8} />
            <span style={{ flex: 1 }}>{label}</span>
            
            {/* Sihir kecil: Menampilkan angka notifikasi jika ada */}
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

      {/* Bottom Items */}
      <div style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Link href="/bantuan" style={{ ...linkStyle('/bantuan'), fontWeight: 400, opacity: 0.85 }}>
          <HelpCircle size={20} strokeWidth={1.8} />
          Bantuan
        </Link>
        <button
          onClick={handleLogout}
          style={{
            ...linkStyle('/login'),
            fontWeight: 400,
            opacity: 0.85,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            fontFamily: 'var(--font-display)',
            fontSize: '15px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            borderRadius: '10px',
            textDecoration: 'none',
            transition: 'background 0.15s',
          }}
        >
          <LogOut size={20} strokeWidth={1.8} />
          Keluar
        </button>
      </div>
    </aside>
  )
}