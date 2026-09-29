'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { api, setToken, setRefreshToken, clearTokens, getToken, getRefreshToken } from '@/lib/api'

export interface User {
  userId: string
  email: string
  name: string
  role: 'DISTRIBUTOR' | 'PENGECER' | 'PEMERINTAH'
  status: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
}

interface RegisterData {
  fullname: string
  email: string
  password: string
  role: string
  proof: File
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = getToken()
    if (token) {
      const stored = localStorage.getItem('agriflow_user')
      if (stored) {
        try {
          setUser(JSON.parse(stored))
        } catch {
          clearTokens()
        }
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const isPemerintah = email.toLowerCase().includes('pemerintah')

    if (isPemerintah) {
      // 📡 Login PEMERINTAH ➡️ Memanggil SOAP 1.1 Web Service (LoginUser)
      const { invokeSoap } = await import('@/lib/soap-pemerintah')
      const soapRes = await invokeSoap('LoginUser', {
        Email: email,
        Password: password,
      })

      if (!soapRes.ok || !soapRes.data || soapRes.data.Success === false) {
        throw new Error(soapRes.data?.Message || 'Login via SOAP Web Service gagal')
      }

      const raw = soapRes.data
      const userObj: User = {
        userId: String(raw.UserId ?? ''),
        email: String(raw.Email ?? email),
        name: String(raw.Name ?? 'Pemerintah'),
        role: (raw.Role as any) || 'PEMERINTAH',
        status: String(raw.Status ?? 'Active'),
      }

      setToken(raw.AccessToken)
      setRefreshToken(raw.AccessToken)
      localStorage.setItem('agriflow_user', JSON.stringify(userObj))
      setUser(userObj)
      return
    }

    // 🚀 Login DISTRIBUTOR & PENGECER ➡️ Memanggil REST API (/api/auth/login)
    const res = await api.post<{
      accessToken: string
      refreshToken: string
      user: User
    }>('/api/auth/login', { email, password })

    if (!res.data) throw new Error('Login gagal')

    setToken(res.data.accessToken)
    setRefreshToken(res.data.refreshToken)
    localStorage.setItem('agriflow_user', JSON.stringify(res.data.user))
    setUser(res.data.user)
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    const formData = new FormData()
    formData.append('fullname', data.fullname)
    formData.append('email', data.email)
    formData.append('password', data.password)
    formData.append('role', data.role)
    formData.append('proof', data.proof)

    await api.post('/api/auth/register', formData, { formData: true })
  }, [])

  const logout = useCallback(async () => {
    try {
      const refreshToken = getRefreshToken()
      await api.post('/api/auth/logout', { refreshToken })
    } catch {
      // proceed even if API call fails
    }
    clearTokens()
    localStorage.removeItem('agriflow_user')
    setUser(null)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
