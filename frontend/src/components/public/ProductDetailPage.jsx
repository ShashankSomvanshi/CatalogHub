import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchPublicProduct, formatProductPrice, getProductCategoryName, getProductImage, getProductName } from '../../api/products.js'
import { addCartItem } from '../../api/cart.js'
import { showSuccess } from '../../utils/alerts.js'
import PublicHeader from './PublicHeader.jsx'

function readCart() {
  try {
    const cart = JSON.parse(localStorage.getItem('catalog_cart') || '[]')
    return Array.isArray(cart) ? cart : []
  } catch {
    return []
  }
}

function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imageFailed, setImageFailed] = useState(false)
  const [cartCount, setCartCount] = useState(() => readCart().reduce((total, item) => total + Number(item.quantity || 1), 0))

  useEffect(() => {
    let ignore = false

    fetchPublicProduct(productId)
      .then((loadedProduct) => {
        if (!ignore) setProduct(loadedProduct)
      })
      .catch((requestError) => {
        if (!ignore) setError(requestError.response?.data?.message || 'Unable to load this product.')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [productId])

  const addToCart = async ({ showMessage = true } = {}) => {
    if (!product) return

    if (localStorage.getItem('auth_token')) {
      const savedCart = await addCartItem(product.id)
      setCartCount(savedCart.item_count || 0)
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: savedCart.item_count || 0 } }))
      if (showMessage) await showSuccess('Product added to cart')
      return
    }

    const cart = readCart()
    const existingItem = cart.find((item) => String(item.id) === String(product.id))

    if (existingItem) {
      existingItem.quantity = Number(existingItem.quantity || 1) + 1
    } else {
      cart.push({
        id: product.id,
        name: getProductName(product),
        price: product.price,
        image: product.image,
        quantity: 1,
      })
    }

    localStorage.setItem('catalog_cart', JSON.stringify(cart))
    setCartCount(cart.reduce((total, item) => total + Number(item.quantity || 1), 0))
    window.dispatchEvent(new CustomEvent('cart-updated'))

    if (showMessage) await showSuccess('Product added to cart')
  }

  const handleBuyNow = async () => {
    localStorage.setItem('buy_now_item', JSON.stringify({
      id: product.id,
      product_id: product.id,
      name: getProductName(product),
      product_name: getProductName(product),
      price: product.price,
      image: product.image,
      quantity: 1,
    }))
    navigate('/checkout?mode=buy-now')
  }

  const imageUrl = product ? getProductImage(product) : ''

  return (
    <div className="product-detail-shell">
      <PublicHeader cartCount={cartCount} />

      <main className="product-detail-main">
        <div className="product-detail-breadcrumb"><Link to="/">Home</Link><span>/</span><span>{product ? getProductName(product) : 'Product'}</span></div>

        {loading ? (
          <section className="product-detail-card product-detail-loading" aria-label="Loading product" />
        ) : error || !product ? (
          <section className="product-detail-error"><h1>Product unavailable</h1><p>{error || 'This product could not be found.'}</p><Link to="/">Back to home</Link></section>
        ) : (
          <section className="product-detail-card">
            <div className="product-detail-image">
              {imageUrl && !imageFailed ? <img src={imageUrl} alt={getProductName(product)} onError={() => setImageFailed(true)} /> : <span>No image available</span>}
            </div>

            <div className="product-detail-info">
              <p className="public-kicker">{getProductCategoryName(product)}</p>
              <h1>{getProductName(product)}</h1>
              <p className="product-detail-sku">SKU: <strong>{product.sku || 'Not available'}</strong></p>
              <p className="product-detail-price">{formatProductPrice(product.price)}</p>
              <div className="product-detail-description"><h2>Description</h2><p>{product.description || 'No description is available for this product.'}</p></div>
              <div className="product-detail-actions">
                <button type="button" className="product-add-cart" onClick={() => addToCart()}>Add to Cart</button>
                <button type="button" className="product-buy-now" onClick={handleBuyNow}>Buy Now</button>
              </div>
              <div className="product-detail-benefits"><span>Secure ordering</span><span>Catalog verified</span><span>Easy support</span></div>
            </div>
          </section>
        )}
      </main>

      <footer className="product-detail-footer"><span>CatalogHub</span><p>Simple catalog shopping for modern customers.</p><span>&copy; 2026 CatalogHub</span></footer>
    </div>
  )
}

export default ProductDetailPage
