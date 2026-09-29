import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft } from 'lucide-react'

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main
      style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Background foto sawah */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: "url('/utama.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.6)',
          zIndex: 0,
        }}
      />
      {/* Green tint overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(21, 82, 21, 0.35)',
          zIndex: 0,
        }}
      />

      {/* Top-left back nav */}
      <nav
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '20px 32px',
        }}
      >
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ChevronLeft size={20} strokeWidth={2.5} color="white" />
          <Image src="/LogoPutih.png" alt="AgriFlow" width={130} height={38} style={{ objectFit: 'contain' }} />
        </Link>
      </nav>

      {/* Page content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        {children}
      </div>
    </main>
  )
}