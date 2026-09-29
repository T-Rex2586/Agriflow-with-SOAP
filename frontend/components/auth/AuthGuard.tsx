'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

interface AuthGuardProps {
  children: ReactNode
  allowedRole?: 'DISTRIBUTOR' | 'PENGECER' | 'PEMERINTAH'
}

export function AuthGuard({ children, allowedRole }: AuthGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (allowedRole && user.role !== allowedRole) {
      // Redirect to their own dashboard
      const dashboardMap: Record<string, string> = {
        DISTRIBUTOR: '/distributor/dashboard',
        PENGECER: '/pengecer/dashboard',
        PEMERINTAH: '/pemerintah/dashboard',
      }
      router.replace(dashboardMap[user.role] || '/')
    }
  }, [user, isLoading, allowedRole, router])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ fontFamily: 'var(--font-display)', color: '#1e6b1e' }}>Memuat...</p>
      </div>
    )
  }

  if (!user) return null

  if (allowedRole && user.role !== allowedRole) return null

  return <>{children}</>
}
