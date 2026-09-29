'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import AuthLayout from '@/components/layout/AuthLayout'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'

type Role = 'DISTRIBUTOR' | 'PENGECER'

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [fullname, setFullname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('DISTRIBUTOR')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

  const inputStyle = {
    width: '100%',
    padding: '13px 16px',
    borderRadius: '12px',
    border: '1.5px solid rgba(200,230,200,0.5)',
    fontSize: '14px',
    color: '#0f3d0f',
    background: 'rgba(255,255,255,0.6)',
    outline: 'none',
    fontFamily: 'var(--font-body)',
  }

  const inputWithIconStyle = {
    ...inputStyle,
    paddingLeft: '44px',
  }

  const labelStyle = {
    display: 'block' as const,
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '14px',
    color: '#1a1a1a',
    marginBottom: '8px',
  }

  const roles: Role[] = ['DISTRIBUTOR', 'PENGECER']

  const handleRegister = async () => {
    setError('')
    setSuccess('')
    if (!fullname || !email || !password || !file) {
      setError('Semua field wajib diisi')
      return
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter')
      return
    }
    setLoading(true)
    try {
      await register({ fullname, email, password, role, proof: file })
      setSuccess('Registrasi berhasil! Menunggu persetujuan admin.')
      setTimeout(() => router.push('/login'), 2500)
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
          Register
        </h1>
        <p style={{ fontSize: '14px', color: '#555', marginBottom: '32px' }}>
          Daftarkan akun untuk masuk ke dalam sistem.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ padding: '12px', borderRadius: '8px', background: '#FEE2E2', color: '#991B1B', fontSize: '14px' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ padding: '12px', borderRadius: '8px', background: '#D1FAE5', color: '#065F46', fontSize: '14px' }}>
              {success}
            </div>
          )}

          {/* Nama Lengkap */}
          <div>
            <label style={labelStyle}>Nama Lengkap</label>
            <input
              type="text"
              placeholder="Anindya Artanti"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                color="#888"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputWithIconStyle}
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputWithIconStyle, paddingRight: '44px' }}
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

          {/* Role */}
          <div>
            <label style={labelStyle}>Role</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: '10px',
                    border: '1.5px solid',
                    borderColor: role === r ? 'transparent' : 'rgba(200,230,200,0.5)',
                    background: role === r ? '#9dc518' : 'rgba(255,255,255,0.6)',
                    color: role === r ? 'white' : '#555',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '12px',
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {r === 'DISTRIBUTOR' ? 'Distributor' : 'Pengecer'}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Bukti */}
          <div>
            <label style={labelStyle}>Upload Bukti Registrasi</label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '13px 16px',
                borderRadius: '12px',
                border: '1.5px solid rgba(200,230,200,0.5)',
                background: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
              }}
            >
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <span style={{ fontSize: '14px', color: '#888', flex: 1 }}>
                {file ? file.name : 'Pilih file (JPG/PNG, max 5MB)'}
              </span>
            </label>
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
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
            }}
            onClick={handleRegister}
          >
            {loading ? 'Memproses...' : 'Register'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '14px', color: '#444' }}>
            Sudah memiliki akun?{' '}
            <Link href="/login" style={{ color: '#1e6b1e', fontWeight: 600 }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}