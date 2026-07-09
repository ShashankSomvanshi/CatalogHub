import { api } from './client.js'

export async function fetchTransactions(params = {}) {
  const response = await api.get('/api/admin/transactions', { params })
  return { records: response.data?.transactions || [], meta: response.data?.meta || {} }
}

export async function fetchTransaction(transactionId) {
  const response = await api.get(`/api/admin/transactions/${transactionId}`)
  return response.data?.transaction || null
}

export async function updateTransactionOrderStatus(transactionId, status, note = '') {
  const response = await api.patch(`/api/admin/transactions/${transactionId}/order-status`, { status, note })
  return response.data?.transaction || null
}
