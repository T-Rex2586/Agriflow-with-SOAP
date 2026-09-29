'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Lock, Eye, EyeOff } from 'lucide-react'
import AuthLayout from '@/components/layout/AuthLayout'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, user } = useAuth()
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const target =
        user.role === 'DISTRIBUTOR' ? '/distributor/dashboard' :
        user.role === 'PENGECER'    ? '/pengecer/dashboard' :
        user.role === 'PEMERINTAH'  ? '/pemerintah/dashboard' :
        '/'
      router.replace(target)
    }
  }, [user, router])

  const handleLogin = async () => {
    setError('')
    if (!email || !password) {
      setError('Email dan password wajib diisi')
      return
    }
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Terjadi kesalahan. Silakan coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '13px 16px 13px 44px',
    borderRadius: '12px',
    border: '1.5px solid rgba(200,230,200,0.5)',
    fontSize: '14px',
    color: '#0f3d0f',
    background: 'rgba(255,255,255,0.6)',
    outline: 'none',
    fontFamily: 'var(--font-body)',
  }

  const labelStyle = {
    display: 'block' as const,
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '14px',
    color: '#1a1a1a',
    marginBottom: '8px',
  }

  return (
    <AuthLayout>
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(240,249,240,0.75)',
          backdropFilter: 'blur(16px)',
          borderRadius: '24px',
          padding: '48px 40px',
          border: '1px solid rgba(255,255,255,0.4)',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '32px',
            color: '#1a1a1a',
            marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}
        >
          Log In
        </h1>
        <p style={{ fontSize: '14px', color: '#555', marginBottom: '32px' }}>
          Masukkan kredensial Anda.
        </p>

        {error && (
          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', background: '#FEE2E2', color: '#991B1B', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Email */}
          <div>
            <label style={labelStyle}>Email</label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                color="#888"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                color="#888"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ ...inputStyle, paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#888',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="button"
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '12px',
              background: loading ? '#6B8F6B' : '#1e6b1e',
              color: 'white',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '15px',
              letterSpacing: '0.05em',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
              transition: 'background 0.2s',
            }}
            onClick={handleLogin}
          >
            {loading ? 'Memproses...' : 'LOG IN'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '14px', color: '#444' }}>
            Belum memiliki akun?{' '}
            <Link href="/bantuan" style={{ color: '#1e6b1e', fontWeight: 600 }}>
              Hubungi Bantuan
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}