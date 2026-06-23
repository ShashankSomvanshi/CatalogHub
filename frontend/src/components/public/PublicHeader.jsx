import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCart } from '../../api/cart.js'
import { api } from '../../api/client.js'
import { getProfileImageUrl } from '../../api/profile.js'

function readUser() {
  try { return JSON.parse(localStorage.getItem('auth_user') || 'null') } catch { return null }
}

function readStoredCartCount() {
  try {
    const cart = JSON.parse(localStorage.getItem('catalog_cart') || '[]')
    return Array.isArray(cart) ? cart.reduce((total, item) => total + Number(item.quantity || 1), 0) : 0
  } catch {
    return 0
  }
}

function PublicHeader({ cartCount }) {
  const [user, setUser] = useState(readUser)
  const [headerCartCount, setHeaderCartCount] = useState(readStoredCartCount)
  const [open, setOpen] = useState(false)
  const authenticated = Boolean(localStorage.getItem('auth_token') && user)
  const visibleCartCount = typeof cartCount === 'number' ? cartCount : headerCartCount
  const initials = (user?.name || 'User').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const image = getProfileImageUrl(user?.profile_image)

  useEffect(() => {
    const updateUser = () => setUser(readUser())
    window.addEventListener('auth-user-updated', updateUser)
    return () => window.removeEventListener('auth-user-updated', updateUser)
  }, [])

  useEffect(() => {
    let ignore = false

    const loadCartCount = () => {
      if (localStorage.getItem('auth_token')) {
        fetchCart()
          .then((cart) => {
            if (!ignore) setHeaderCartCount(cart.item_count || 0)
          })
          .catch(() => {
            if (!ignore) setHeaderCartCount(readStoredCartCount())
          })
        return
      }

      setHeaderCartCount(readStoredCartCount())
    }

    const updateCartCount = (event) => {
      if (typeof event.detail?.count === 'number') {
        setHeaderCartCount(event.detail.count)
        return
      }

      loadCartCount()
    }

    loadCartCount()
    window.addEventListener('cart-updated', updateCartCount)
    window.addEventListener('storage', updateCartCount)

    return () => {
      ignore = true
      window.removeEventListener('cart-updated', updateCartCount)
      window.removeEventListener('storage', updateCartCount)
    }
  }, [authenticated])

  const logout = async () => {
    try { await api.post('/api/logout', { refresh_token: localStorage.getItem('refresh_token') }) } catch { /* Clear local session even if the token expired. */ }
    ;['auth_token', 'refresh_token', 'access_token_expires_at', 'refresh_token_expires_at', 'auth_user', 'auth_role'].forEach((key) => localStorage.removeItem(key))
    window.location.href = '/'
  }

  return <header className="public-header"><nav className="public-navbar" aria-label="Main navigation"><Link className="public-logo" to="/"><span className="public-logo-mark">C</span><span>Catalog<span>Hub</span></span></Link><div className="public-nav-links"><Link to="/">Home</Link><Link to="/about">About Us</Link><Link to="/contact">Contact Us</Link><Link className="public-cart-button" to="/cart" aria-label={`Cart with ${visibleCartCount} items`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.1 9.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 7H6" /><circle cx="9" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /></svg><span className="public-cart-count">{visibleCartCount}</span></Link>{authenticated ? <div className="public-user-menu"><button type="button" onClick={() => setOpen((value) => !value)}>{image ? <img src={image} alt="" /> : <span>{initials}</span>}<strong>{user.name}</strong><i aria-hidden="true">&#8964;</i></button>{open && <div><Link to="/profile" onClick={() => setOpen(false)}>Profile</Link><button type="button" onClick={logout}>Logout</button></div>}</div> : <Link className="public-login-link" to="/login">Login</Link>}</div></nav></header>
}

export default PublicHeader
