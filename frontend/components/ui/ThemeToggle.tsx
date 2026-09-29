'use client'

import React, { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle tema gelap atau terang"
        className={`w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 transition-colors opacity-0 ${className}`}
      />
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
      title={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
      className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
        isDark
          ? 'bg-green-950 border-green-800 text-yellow-400 hover:bg-green-900'
          : 'bg-white border-green-200 text-gray-700 hover:bg-green-50'
      } ${className}`}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
