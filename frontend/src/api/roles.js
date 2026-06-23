import { api } from './client.js'

export function normalizeRoles(payload) {
  const findRoleArray = (value) => {
    if (Array.isArray(value)) {
      return value.some((item) => item && typeof item === 'object' && ('id' in item || 'name' in item || 'role_name' in item))
        ? value
        : null
    }

    if (!value || typeof value !== 'object') return null

    for (const key of ['roles', 'data', 'items', 'result', 'records']) {
      const found = findRoleArray(value[key])
      if (found) return found
    }

    return null
  }

  return findRoleArray(payload) || []
}

export async function fetchRoles() {
  const response = await api.get('/api/admin/roles')

  return normalizeRoles(response.data)
}

export async function fetchSubAdminRoles() {
  const response = await api.get('/api/admin/sub-admin-roles')

  return normalizeRoles(response.data?.sub_admin_roles || response.data)
}

export async function fetchSubAdminRole(roleId) {
  const response = await api.get(`/api/admin/sub-admin-roles/${roleId}`)
  return response.data.sub_admin_role
}

export async function createSubAdminRole(name) {
  const response = await api.post('/api/admin/sub-admin-roles', { name })
  return response.data.sub_admin_role
}

export async function updateSubAdminRole(roleId, name) {
  const response = await api.put(`/api/admin/sub-admin-roles/${roleId}`, { name })
  return response.data.sub_admin_role
}

export async function deleteSubAdminRole(roleId) {
  const response = await api.delete(`/api/admin/sub-admin-roles/${roleId}`)
  return response.data
}

export function getRoleId(role) {
  return String(role?.id || role?.role_id || '')
}

export function getRoleName(role) {
  return role?.name || role?.role_name || role?.title || `Role ${getRoleId(role)}`
}
