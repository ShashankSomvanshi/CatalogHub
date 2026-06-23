import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchCart, removeCartItem, syncCart, updateCartItem } from '../../api/cart.js'
import { formatProductPrice, getProductImage, getProductName } from '../../api/products.js'
import PublicHeader from './PublicHeader.jsx'
import PublicFooter from './PublicFooter.jsx'

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 4h2l2.1 9.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 7H6" />
      <circle cx="9" cy="19" r="1.4" />
      <circle cx="17" cy="19" r="1.4" />
    </svg>
  )
}

function readCart() {
  try {
    const cart = JSON.parse(localStorage.getItem('catalog_cart') || '[]')
    return Array.isArray(cart) ? cart : []
  } catch {
    return []
  }
}

function CartPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState(readCart)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('auth_token')))
  const [error, setError] = useState('')
  const isAuthenticated = Boolean(localStorage.getItem('auth_token'))
  const cartCount = items.reduce((total, item) => total + Number(item.quantity || 1), 0)
  const total = useMemo(() => items.reduce((amount, item) => amount + Number(item.price || 0) * Number(item.quantity || 1), 0), [items])

  const saveItems = useCallback((nextItems) => {
    setItems(nextItems)
    if (isAuthenticated) {
      localStorage.removeItem('catalog_cart')
    } else {
      localStorage.setItem('catalog_cart', JSON.stringify(nextItems))
    }
    window.dispatchEvent(new CustomEvent('cart-updated'))
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return

    let ignore = false
    const localItems = readCart()

    ;(async () => {
      try {
        const cart = localItems.length ? await syncCart(localItems) : await fetchCart()
        if (!ignore) saveItems(cart.items || [])
      } catch (requestError) {
        if (!ignore) setError(requestError.response?.data?.message || 'Unable to load your saved cart.')
      } finally {
        if (!ignore) setLoading(false)
      }
    })()

    return () => { ignore = true }
  }, [isAuthenticated, saveItems])

  const updateQuantity = async (item, quantity) => {
    const safeQuantity = Math.min(99, Math.max(1, Number(quantity) || 1))
    saveItems(items.map((current) => String(current.id) === String(item.id) ? { ...current, quantity: safeQuantity } : current))

    if (isAuthenticated && item.cart_item_id) {
      try {
        const cart = await updateCartItem(item.cart_item_id, safeQuantity)
        saveItems(cart.items || [])
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to update the quantity.')
      }
    }
  }

  const removeItem = async (item) => {
    if (isAuthenticated && item.cart_item_id) {
      try {
        const cart = await removeCartItem(item.cart_item_id)
        saveItems(cart.items || [])
        return
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to remove this product.')
        return
      }
    }

    saveItems(items.filter((current) => String(current.id) !== String(item.id)))
  }

  const handleCheckout = () => {
    if (!items.length) return
    navigate('/checkout')
  }

  return (
    <div className="cart-page-shell">
      <PublicHeader cartCount={cartCount} />

      <main className="cart-page-main">
        <div className="cart-page-heading"><div><p className="public-kicker">Your selection</p><h1>Shopping Cart</h1></div><span>{cartCount} {cartCount === 1 ? 'item' : 'items'}</span></div>

        {error && <p className="cart-error" role="alert">{error}</p>}
        {loading ? (
          <section className="cart-empty-state"><h2>Loading your cart...</h2></section>
        ) : !items.length ? (
          <section className="cart-empty-state"><div><CartIcon /></div><h2>Your cart is empty</h2><p>Explore featured products and add something you like.</p><Link to="/#products">Continue shopping</Link></section>
        ) : (
          <div className="cart-layout">
            <section className="cart-items" aria-label="Cart items">
              <div className="cart-table-head"><span>Product</span><span>Price</span><span>Quantity</span><span>Subtotal</span><span>Action</span></div>
              {items.map((item) => (
                <article className="cart-item" key={item.id}>
                  <div className="cart-item-product">
                    <div className="cart-item-image">{getProductImage(item) ? <img src={getProductImage(item)} alt={getProductName(item)} /> : <span>No image</span>}</div>
                    <div><Link to={`/products/${item.id}`}>{getProductName(item)}</Link><small>Product #{item.id}</small></div>
                  </div>
                  <strong>{formatProductPrice(item.price)}</strong>
                  <div className="cart-quantity">
                    <button type="button" onClick={() => updateQuantity(item, Number(item.quantity || 1) - 1)} aria-label={`Decrease ${getProductName(item)} quantity`}>-</button>
                    <input type="number" min="1" max="99" value={item.quantity || 1} onChange={(event) => updateQuantity(item, event.target.value)} aria-label={`${getProductName(item)} quantity`} />
                    <button type="button" onClick={() => updateQuantity(item, Number(item.quantity || 1) + 1)} aria-label={`Increase ${getProductName(item)} quantity`}>+</button>
                  </div>
                  <strong>{formatProductPrice(Number(item.price || 0) * Number(item.quantity || 1))}</strong>
                  <button className="cart-remove-button" type="button" onClick={() => removeItem(item)}>Remove</button>
                </article>
              ))}
              <Link className="cart-continue-link" to="/#products">Continue shopping</Link>
            </section>

            <aside className="cart-summary">
              <h2>Order Summary</h2>
              <div><span>Subtotal</span><strong>{formatProductPrice(total)}</strong></div>
              <div><span>Shipping</span><strong>Free</strong></div>
              <div className="cart-summary-total"><span>Final Amount</span><strong>{formatProductPrice(total)}</strong></div>
              <button type="button" onClick={handleCheckout}>Checkout</button>
              <p>Taxes, if applicable, are calculated during checkout.</p>
            </aside>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}

export default CartPage
