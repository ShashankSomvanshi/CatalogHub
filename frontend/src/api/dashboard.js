import { api } from './client.js'

const emptyDashboard = {
  totals: {
    users: 0,
    categories: 0,
    products: 0,
  },
  recentUsers: [],
  recentProducts: [],
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

export function normalizeDashboard(payload) {
  const source = payload?.data && typeof payload.data === 'object' ? payload.data : payload
  const totals = source?.totals || {}

  return {
    totals: {
      users: Number(totals.users || totals.total_users || 0),
      categories: Number(totals.categories || totals.total_categories || 0),
      products: Number(totals.products || totals.total_products || 0),
    },
    recentUsers: toArray(source?.recent_users || source?.recentUsers),
    recentProducts: toArray(source?.recent_products || source?.recentProducts),
  }
}

export async function fetchDashboardSummary() {
  const response = await api.get('/api/admin/dashboard')

  return normalizeDashboard(response.data) || emptyDashboard
}
