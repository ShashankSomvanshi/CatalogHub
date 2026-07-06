import { api } from './client.js'

export async function fetchTransactions() {
  const response = await api.get('/api/admin/transactions')
  return response.data?.transactions || []
}

export async function fetchTransaction(transactionId) {
  const response = await api.get(`/api/admin/transactions/${transactionId}`)
  return response.data?.transaction || null
}
