import { AuthGuard } from '@/components/auth/AuthGuard'

export default function DistributorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRole="DISTRIBUTOR">
      {children}
    </AuthGuard>
  )
}
