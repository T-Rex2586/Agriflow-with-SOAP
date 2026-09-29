import { AuthGuard } from '@/components/auth/AuthGuard'

export default function PengecerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRole="PENGECER">
      {children}
    </AuthGuard>
  )
}
