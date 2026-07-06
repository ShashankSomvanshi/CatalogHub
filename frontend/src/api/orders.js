import { api } from './client.js'

export async function fetchMyOrders() {
  const response = await api.get('/api/my-orders')
  return response.data?.orders || []
}
