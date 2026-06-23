import { api } from './client.js'

const assetBaseUrl = import.meta.env.VITE_ASSET_BASE_URL?.replace(/\/$/, '') || ''

export function normalizeProducts(payload) {
  const findProductArray = (value) => {
    if (Array.isArray(value)) {
      return value.some((item) => item && typeof item === 'object' && ('id' in item || 'name' in item || 'product_name' in item))
        ? value
        : null
    }

    if (!value || typeof value !== 'object') return null

    for (const key of ['products', 'data', 'items', 'result', 'records']) {
      const found = findProductArray(value[key])
      if (found) return found
    }

    return null
  }

  return findProductArray(payload) || []
}

export async function fetchProducts() {
  const response = await api.get('/api/admin/products')

  return normalizeProducts(response.data)
}

export async function fetchPublicProducts() {
  const response = await api.get('/api/products')

  return normalizeProducts(response.data)
}

export async function fetchAllPublicProducts() {
  const response = await api.get('/api/products/all')
  return normalizeProducts(response.data)
}

export async function fetchPublicProduct(productId) {
  const response = await api.get(`/api/products/${productId}`)

  return normalizeProduct(response.data)
}

export async function fetchProductsByCategory(categoryId) {
  const response = await api.get(`/api/categories/${categoryId}/products`)
  return {
    category: response.data.category || null,
    products: normalizeProducts(response.data),
  }
}

export function normalizeProduct(payload) {
  if (!payload || typeof payload !== 'object') return null

  if ('id' in payload || 'name' in payload || 'product_name' in payload) {
    return payload
  }

  for (const key of ['product', 'data', 'item', 'result', 'record']) {
    const product = normalizeProduct(payload[key])
    if (product) return product
  }

  return null
}

export async function fetchProduct(productId) {
  const response = await api.get(`/api/admin/products/${productId}`)

  return normalizeProduct(response.data)
}

export function getProductName(product) {
  return product?.product_name || product?.name || 'Unnamed product'
}

export function getProductCategoryName(product) {
  if (product?.category && typeof product.category === 'object') {
    return product.category.name || product.category.category_name || `Category ${product.category.id || product.category_id || ''}`.trim()
  }

  return product?.category_name || product?.category || `Category ${product?.category_id || ''}`.trim()
}

export function getProductImage(product) {
  const image = product?.product_image || product?.image || product?.image_url || product?.photo || ''

  if (!image || typeof image !== 'string') return ''
  if (/^https?:\/\//i.test(image) || image.startsWith('data:') || image.startsWith('blob:')) return image

  const cleanImage = image.replace(/^\/+/, '')
  const storagePath = cleanImage.startsWith('storage/')
    ? cleanImage
    : `storage/${cleanImage.replace(/^public\//, '')}`

  return assetBaseUrl ? `${assetBaseUrl}/${storagePath}` : `/${storagePath}`
}

export function formatProductPrice(price) {
  const amount = Number(price || 0)

  return Number.isNaN(amount)
    ? price
    : amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
