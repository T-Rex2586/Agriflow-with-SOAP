import HeroSection from '@/components/sections/HeroSection'
import StatsBar from '@/components/sections/StatsBar'
import TargetSection from '@/components/sections/TargetSection'
import Footer from '@/components/layout/Footer'
import FloatingHelp from '@/components/ui/FloatingHelp'

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <StatsBar />
      <TargetSection />
      <Footer />
      <FloatingHelp />
    </main>
  )
} 
