import { api } from './client.js'

export function normalizeCategories(payload) {
  const findCategoryArray = (value) => {
    if (Array.isArray(value)) {
      return value.some((item) => item && typeof item === 'object' && ('id' in item || 'name' in item || 'status' in item))
        ? value
        : null
    }

    if (!value || typeof value !== 'object') return null

    for (const key of ['categories', 'data', 'items', 'result', 'records']) {
      const found = findCategoryArray(value[key])
      if (found) return found
    }

    return null
  }

  return findCategoryArray(payload) || []
}

export async function fetchCategoriesPage(params = {}) {
  const response = await api.get('/api/admin/categories', { params })
  return { records: normalizeCategories(response.data), meta: response.data?.meta || {} }
}

export async function fetchCategories() {
  const page = await fetchCategoriesPage({ per_page: 100, sort: 'name', direction: 'asc' })
  return page.records
}

export async function fetchPublicCategories() {
  const response = await api.get('/api/categories')

  return normalizeCategories(response.data)
}
