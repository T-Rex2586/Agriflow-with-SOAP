import { AuthGuard } from '@/components/auth/AuthGuard'

export default function PemerintahLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRole="PEMERINTAH">
      {children}
    </AuthGuard>
  )
}
