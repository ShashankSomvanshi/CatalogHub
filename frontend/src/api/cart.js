import { api } from './client.js'

export async function fetchCart() {
  const response = await api.get('/api/cart')
  return response.data.cart
}

export async function syncCart(items) {
  const response = await api.put('/api/cart', {
    items: items.map((item) => ({ product_id: item.product_id || item.id, quantity: Number(item.quantity || 1) })),
  })
  return response.data.cart
}

export async function addCartItem(productId, quantity = 1) {
  const response = await api.post('/api/cart/items', { product_id: productId, quantity })
  return response.data.cart
}

export async function updateCartItem(cartItemId, quantity) {
  const response = await api.patch(`/api/cart/items/${cartItemId}`, { quantity })
  return response.data.cart
}

export async function removeCartItem(cartItemId) {
  const response = await api.delete(`/api/cart/items/${cartItemId}`)
  return response.data.cart
}

export async function placeOrder(payload, authenticated = false) {
  const endpoint = authenticated ? '/api/checkout/place-order-authenticated' : '/api/checkout/place-order'
  const response = await api.post(endpoint, payload)
  return response.data.order
}
