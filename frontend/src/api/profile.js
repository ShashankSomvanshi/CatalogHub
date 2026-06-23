import { api } from './client.js'

const assetBaseUrl = import.meta.env.VITE_ASSET_BASE_URL?.replace(/\/$/, '') || ''

export function getProfileImageUrl(profileImage) {
  if (!profileImage || typeof profileImage !== 'string') return ''
  if (/^https?:\/\//i.test(profileImage) || profileImage.startsWith('data:') || profileImage.startsWith('blob:')) return profileImage

  const cleanImage = profileImage.replace(/^\/+/, '').replace(/^public\//, '')
  const storagePath = cleanImage.startsWith('storage/') ? cleanImage : `storage/${cleanImage}`

  return assetBaseUrl ? `${assetBaseUrl}/${storagePath}` : `/${storagePath}`
}

export async function fetchAdminProfile() {
  const response = await api.get('/api/admin/profile')

  return response.data?.profile || response.data
}

export async function updateAdminProfile(payload) {
  const formData = new FormData()

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      formData.append(key, value)
    }
  })

  const response = await api.post('/api/admin/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return response.data
}

export async function fetchUserProfile() {
  const response = await api.get('/api/profile')
  return response.data?.profile || response.data
}

export async function updateUserProfile(payload) {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') formData.append(key, value)
  })
  const response = await api.post('/api/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  return response.data
}
