'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Package,
  History,
  Leaf,
  HelpCircle,
  LogOut,
  Plus,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { label: 'Halaman Utama',      href: '/pengecer/dashboard',        icon: Home },
  { label: 'Manajemen Stok',     href: '/pengecer/manajemen-stok',   icon: Package },
  { label: 'Riwayat Transaksi',  href: '/pengecer/riwayat',          icon: History },
  { label: 'Penebusan Pupuk',    href: '/pengecer/penebusan',        icon: Leaf },
]

interface SidebarProps {
  notifCount?: number
}

export default function Sidebar({ notifCount = 0 }: SidebarProps) {
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
          <Image src="/LogoPutih.png" alt="AgriFlow" width={140} height={40} style={{ objectFit: 'contain' }} />
        </Link>
      </div>

      {/* Terima Stok Button */}
      <div style={{ padding: '0 16px 24px' }}>
        <Link
          href="/pengecer/terima-stok"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 20px',
            borderRadius: '999px',
            background: 'white',
            color: '#1e6b1e',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '15px',
            textDecoration: 'none',
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
          Terima Stok
        </Link>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} style={linkStyle(href)}>
            <Icon size={20} strokeWidth={1.8} />
            {label}
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