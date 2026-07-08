import { api } from './client.js'

export const MODULE_LABELS = {
  users: 'User Management',
  categories: 'Category Management',
  products: 'Product Management',
  role_management: 'Role Management',
  transactions: 'Transaction Management',
}

export const ADMIN_MENU_ITEMS = [
  'Dashboard',
  'User Management',
  'Category Management',
  'Product Management',
  'Role Management',
  'Transaction Management',
]

export function getStoredAdmin() {
  return JSON.parse(localStorage.getItem('auth_user') || '{}')
}

export function isFullAdmin(admin = getStoredAdmin()) {
  return admin?.role === 'admin' || Number(admin?.role_id) === 1
}

export function formatRoleLabel(role) {
  if (!role) return 'Administrator'

  return String(role)
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function hasPermission(module, action = 'view', admin = getStoredAdmin()) {
  if (isFullAdmin(admin)) return true

  return (admin?.permissions || []).some((permission) => (
    permission.module === module && Boolean(permission[`can_${action}`])
  ))
}

export function getAdminMenuItems(admin = getStoredAdmin()) {
  if (isFullAdmin(admin)) return ADMIN_MENU_ITEMS

  const permittedItems = Object.entries(MODULE_LABELS)
    .filter(([module]) => hasPermission(module, 'view', admin))
    .map(([, label]) => label)

  return ['Dashboard', ...permittedItems]
}

export async function fetchSubAdmins() {
  const response = await api.get('/api/admin/sub-admins')

  return response.data?.sub_admins || []
}

export async function createSubAdmin(payload) {
  const response = await api.post('/api/admin/sub-admins', payload)

  return response.data
}

export async function fetchSubAdmin(subAdminId) {
  const response = await api.get(`/api/admin/sub-admins/${subAdminId}`)

  return response.data?.sub_admin || response.data
}

export async function updateSubAdmin(subAdminId, payload) {
  const response = await api.put(`/api/admin/sub-admins/${subAdminId}`, payload)

  return response.data
}

export async function deleteSubAdmin(subAdminId) {
  const response = await api.delete(`/api/admin/sub-admins/${subAdminId}`)

  return response.data
}

export async function fetchRoleModulePermissions(subAdminRoleId) {
  const response = await api.get(`/api/admin/sub-admin-roles/${subAdminRoleId}/permissions`)

  return response.data
}

export async function updateRoleModulePermissions(subAdminRoleId, permissions) {
  const response = await api.put(`/api/admin/sub-admin-roles/${subAdminRoleId}/permissions`, { permissions })

  return response.data
}
