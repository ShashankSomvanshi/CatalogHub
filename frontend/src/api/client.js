import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

let refreshPromise = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      originalRequest?.url?.includes('/api/token/refresh')
    ) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      clearAuthAndRedirect()
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      refreshPromise ||= api.post('/api/token/refresh', { refresh_token: refreshToken })
      const response = await refreshPromise
      refreshPromise = null

      persistTokenPayload(response.data)
      originalRequest.headers.Authorization = `Bearer ${getAuthToken(response.data)}`

      return api(originalRequest)
    } catch (refreshError) {
      refreshPromise = null
      clearAuthAndRedirect()
      return Promise.reject(refreshError)
    }
  },
)

export async function prepareSanctumSession() {
  try {
    await api.get('/sanctum/csrf-cookie')
  } catch (error) {
    if (error.response?.status && error.response.status !== 404) {
      throw error
    }
  }
}

const tokenKeys = new Set([
  'token',
  'access_token',
  'accessToken',
  'auth_token',
  'authToken',
  'api_token',
  'apiToken',
  'plain_text_token',
  'plainTextToken',
  'bearer_token',
  'bearerToken',
])

const refreshTokenKeys = new Set([
  'refresh_token',
  'refreshToken',
])

function findToken(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object') return null
  if (seen.has(value)) return null
  seen.add(value)

  for (const [key, item] of Object.entries(value)) {
    if (tokenKeys.has(key) && !refreshTokenKeys.has(key) && typeof item === 'string' && item.trim()) {
      return item
    }
  }

  for (const item of Object.values(value)) {
    const token = findToken(item, seen)
    if (token) return token
  }

  return null
}

export function getAuthToken(payload) {
  return findToken(payload)
}

export function getRefreshToken(payload) {
  return findTokenByKeys(payload, refreshTokenKeys)
}

export function getAuthUser(payload) {
  return payload?.user || payload?.data?.user || payload?.data || null
}

export function persistTokenPayload(payload) {
  const token = getAuthToken(payload)
  const refreshToken = getRefreshToken(payload)
  const user = getAuthUser(payload)

  if (token) {
    localStorage.setItem('auth_token', token)
  }

  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken)
  }

  if (payload?.access_token_expires_at) {
    localStorage.setItem('access_token_expires_at', payload.access_token_expires_at)
  }

  if (payload?.refresh_token_expires_at) {
    localStorage.setItem('refresh_token_expires_at', payload.refresh_token_expires_at)
  }

  if (user) {
    const storedUser = (() => {
      try { return JSON.parse(localStorage.getItem('auth_user') || '{}') }
      catch { return {} }
    })()
    localStorage.setItem('auth_user', JSON.stringify({ ...storedUser, ...user }))
    window.dispatchEvent(new CustomEvent('auth-user-updated', { detail: { ...storedUser, ...user } }))
  }
}

export function clearAuthAndRedirect() {
  const role = localStorage.getItem('auth_role')
  localStorage.removeItem('auth_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('access_token_expires_at')
  localStorage.removeItem('refresh_token_expires_at')
  localStorage.removeItem('auth_user')
  localStorage.removeItem('auth_role')

  if (window.location.pathname !== '/login' && window.location.pathname !== '/admin') {
    window.location.href = role === 'admin' ? '/admin' : '/login'
  }
}

function findTokenByKeys(value, keys, seen = new WeakSet()) {
  if (!value || typeof value !== 'object') return null
  if (seen.has(value)) return null
  seen.add(value)

  for (const [key, item] of Object.entries(value)) {
    if (keys.has(key) && typeof item === 'string' && item.trim()) {
      return item
    }
  }

  for (const item of Object.values(value)) {
    const token = findTokenByKeys(item, keys, seen)
    if (token) return token
  }

  return null
}
