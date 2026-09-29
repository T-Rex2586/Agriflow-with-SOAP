const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://backendrsi.kelompok1rsi.site'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('agriflow_token')
}

export function setToken(token: string | null): void {
  if (typeof window === 'undefined') return
  if (token) {
    localStorage.setItem('agriflow_token', token)
  } else {
    localStorage.removeItem('agriflow_token')
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('agriflow_refresh')
}

export function setRefreshToken(token: string | null): void {
  if (typeof window === 'undefined') return
  if (token) {
    localStorage.setItem('agriflow_refresh', token)
  } else {
    localStorage.removeItem('agriflow_refresh')
  }
}

export function clearTokens(): void {
  setToken(null)
  setRefreshToken(null)
}

export interface ApiResponse<T = unknown> {
  success?: boolean
  message?: string
  data?: T
  error?: string
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!res.ok) {
      clearTokens()
      return null
    }

    const json = await res.json()
    const newToken = json.data?.accessToken
    const newRefreshToken = json.data?.refreshToken
    if (newToken) setToken(newToken)
    if (newRefreshToken) setRefreshToken(newRefreshToken)
    return newToken
  } catch {
    clearTokens()
    return null
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { formData?: boolean; params?: Record<string, string> },
): Promise<ApiResponse<T>> {
  let url = `${API_BASE}${path}`
  if (options?.params) {
    const searchParams = new URLSearchParams(options.params)
    url += `?${searchParams.toString()}`
  }

  const headers: Record<string, string> = {}
  if (!options?.formData) {
    headers['Content-Type'] = 'application/json'
  }

  const token = getToken()
  if (token && typeof token === 'string' && token.trim()) {
    headers['Authorization'] = `Bearer ${token.trim()}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
      body: body
        ? options?.formData
          ? (body as FormData)
          : JSON.stringify(body)
        : undefined,
    })
  } finally {
    clearTimeout(timeoutId)
  }

  // If 401, try refresh token
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(url, {
        method,
        headers,
        body: body
          ? options?.formData
            ? (body as FormData)
            : JSON.stringify(body)
          : undefined,
      })
    }
  }

  const json = await res.json()

  if (!res.ok) {
    throw new ApiError(
      json.error || json.message || `Request failed with status ${res.status}`,
      res.status,
      json,
    )
  }

  return json as ApiResponse<T>
}

export const api = {
  get<T>(path: string, params?: Record<string, string>) {
    return request<T>('GET', path, undefined, { params })
  },

  post<T>(path: string, body?: unknown, options?: { formData?: boolean }) {
    return request<T>('POST', path, body, options)
  },

  patch<T>(path: string, body?: unknown) {
    return request<T>('PATCH', path, body)
  },

  delete<T>(path: string) {
    return request<T>('DELETE', path)
  },
}
