import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import DashboardFooter from './components/DashboardFooter.jsx'
import AdminTopNavbar from './components/admin/AdminTopNavbar.jsx'
import AdminDashboardMain from './components/admin/AdminDashboardMain.jsx'
import UserManagementPage from './components/admin/UserManagementPage.jsx'
import AddNewUserPage from './components/admin/AddNewUserPage.jsx'
import EditUserPage from './components/admin/EditUserPage.jsx'
import CategoryManagementPage from './components/admin/CategoryManagementPage.jsx'
import AddCategoryPage from './components/admin/AddCategoryPage.jsx'
import EditCategoryPage from './components/admin/EditCategoryPage.jsx'
import ProductManagementPage from './components/admin/ProductManagementPage.jsx'
import TransactionManagementPage from './components/admin/TransactionManagementPage.jsx'
import TransactionDetailPage from './components/admin/TransactionDetailPage.jsx'
import ProductFormPage from './components/admin/ProductFormPage.jsx'
import SubAdminManagementPage from './components/admin/SubAdminManagementPage.jsx'
import SubAdminFormPage from './components/admin/SubAdminFormPage.jsx'
import SubAdminPermissionPage from './components/admin/SubAdminPermissionPage.jsx'
import RolePermissionManagementPage from './components/admin/RolePermissionManagementPage.jsx'
import RoleFormPage from './components/admin/RoleFormPage.jsx'
import ProfileSettingsPage from './components/admin/ProfileSettingsPage.jsx'
import { api, getAuthToken, getAuthUser, getRefreshToken, prepareSanctumSession } from './api/client.js'
import { getAdminMenuItems, hasPermission, isFullAdmin } from './api/access.js'
import HomePage from './components/public/HomePage.jsx'
import ProductDetailPage from './components/public/ProductDetailPage.jsx'
import CartPage from './components/public/CartPage.jsx'
import CheckoutPage from './components/public/CheckoutPage.jsx'
import PaymentResultPage from './components/public/PaymentResultPage.jsx'
import CategoryProductsPage from './components/public/CategoryProductsPage.jsx'
import CustomerProfilePage from './components/public/CustomerProfilePage.jsx'
import MyOrdersPage from './components/public/MyOrdersPage.jsx'
import AllProductsPage from './components/public/AllProductsPage.jsx'
import AboutPage from './components/public/AboutPage.jsx'
import ContactPage from './components/public/ContactPage.jsx'
import shoppingBackground from './assets/images/shopping-2.jpg'
import './App.css'

function saveAuthData(data, role = 'user') {
  const token = getAuthToken(data)
  if (token) {
    localStorage.setItem('auth_token', token)
  } else {
    localStorage.removeItem('auth_token')
  }

  const refreshToken = getRefreshToken(data)
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken)
  } else {
    localStorage.removeItem('refresh_token')
  }

  if (data?.access_token_expires_at) {
    localStorage.setItem('access_token_expires_at', data.access_token_expires_at)
  }

  if (data?.refresh_token_expires_at) {
    localStorage.setItem('refresh_token_expires_at', data.refresh_token_expires_at)
  }

  const user = getAuthUser(data)
  if (user) {
    localStorage.setItem('auth_user', JSON.stringify(user))
  }

  localStorage.setItem('auth_role', role)
}

function isAdminAccount(admin = {}) {
  return isFullAdmin(admin) || admin?.role === 'sub_admin' || Number(admin?.role_id) === 2
}

function AdminAccessRoute({ module, children }) {
  const storedAdmin = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const hasToken = Boolean(localStorage.getItem('auth_token'))

  if (!hasToken || !isAdminAccount(storedAdmin)) {
    return <Navigate to="/admin" replace />
  }

  if (module && !hasPermission(module, 'view', storedAdmin)) {
    return <Navigate to="/admin/dashboard" replace />
  }

  return children
}

function HomeRoute() {
  const storedUser = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const hasToken = Boolean(localStorage.getItem('auth_token'))

  if (hasToken && isAdminAccount(storedUser)) {
    return <Navigate to={hasPermission('users', 'view', storedUser) ? '/admin/users' : '/admin/dashboard'} replace />
  }

  return <HomePage />
}

function PublicOnlyRoute({ children }) {
  const storedUser = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const hasToken = Boolean(localStorage.getItem('auth_token'))

  if (hasToken && isAdminAccount(storedUser)) {
    return <Navigate to={hasPermission('users', 'view', storedUser) ? '/admin/users' : '/admin/dashboard'} replace />
  }

  return children
}

function CustomerRoute({ children }) {
  const storedUser = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const hasToken = Boolean(localStorage.getItem('auth_token'))

  if (!hasToken) {
    localStorage.setItem('return_to', window.location.pathname)
    return <Navigate to="/login" replace />
  }

  if (isAdminAccount(storedUser)) return <Navigate to="/admin/dashboard" replace />

  return children
}

function PublicLoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const cartCount = (() => {
    try {
      const cart = JSON.parse(localStorage.getItem('catalog_cart') || '[]')
      return Array.isArray(cart) ? cart.reduce((total, item) => total + Number(item.quantity || 1), 0) : 0
    } catch {
      return 0
    }
  })()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      await prepareSanctumSession()

      const response = await api.post('/api/login', {
        email: form.email,
        password: form.password,
      })

      saveAuthData(response.data, 'user')
      if (!getAuthToken(response.data)) {
        setMessage({ type: 'error', text: 'Login succeeded, but the API response did not include an auth token.' })
        return
      }

      const returnTo = localStorage.getItem('return_to')
      localStorage.removeItem('return_to')
      window.location.href = returnTo || '/'
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Login failed. Check your Laravel backend and local URL.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="public-login-page">
      <header className="public-header">
        <nav className="public-navbar" aria-label="Main navigation">
          <Link className="public-logo" to="/" aria-label="CatalogHub home"><span className="public-logo-mark">C</span><span>Catalog<span>Hub</span></span></Link>
          <div className="public-nav-links"><Link to="/">Home</Link><Link to="/#contact">Contact Us</Link><Link className="public-cart-button" to="/cart" aria-label={`Cart with ${cartCount} items`} title="Cart"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.1 9.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 7H6" /><circle cx="9" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /></svg><span className="public-cart-count">{cartCount}</span></Link><Link className="public-login-link" to="/login">Login</Link></div>
        </nav>
      </header>

      <main className="public-login-main">
        <section className="public-login-layout">
          <article className="public-login-intro" style={{ '--login-bg-image': `url(${shoppingBackground})` }}>
            <p className="public-kicker">Welcome to CatalogHub</p>
            <h1>Everything you love, one login away.</h1>
            <p>Sign in to continue shopping, manage your cart, and keep track of your CatalogHub orders.</p>
            <div className="public-login-benefits"><div><strong>Easy shopping</strong><span>Discover products across every category.</span></div><div><strong>Saved cart</strong><span>Keep your selections available across visits.</span></div><div><strong>Secure checkout</strong><span>Complete your orders with confidence.</span></div></div>
          </article>

          <article className="public-login-card">
            <p className="public-kicker">Customer login</p>
            <h2>Welcome back</h2>
            <p className="subtext">Enter your account details to continue.</p>
            <form className="auth-form" onSubmit={handleSubmit}>
              <label>Email address<input type="email" placeholder="you@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
              <label>Password<input type="password" placeholder="Enter your password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
              {message.text ? <p className={`status-message ${message.type}`}>{message.text}</p> : null}
              <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
            </form>
            <p className="helper-link">New to CatalogHub? <Link to="/register">Create an account</Link></p>
            <div className="public-login-admin-link"><span>Managing the catalog?</span><Link to="/admin">Admin login</Link></div>
          </article>
        </section>
      </main>

      <footer className="public-footer">
        <div className="public-footer-main">
          <div className="public-footer-brand"><Link className="public-logo public-footer-logo" to="/"><span className="public-logo-mark">C</span><span>Catalog<span>Hub</span></span></Link><p>Simple catalog discovery and management for modern teams and growing businesses.</p></div>
          <div className="public-footer-column"><h3>About</h3><Link to="/#contact">Contact Us</Link><Link to="/">About CatalogHub</Link><Link to="/#catalog">Our Catalog</Link><Link to="/login">Careers</Link></div>
          <div className="public-footer-column"><h3>Help</h3><a href="mailto:hello@cataloghub.com">Support</a><Link to="/#catalog">Catalog Guide</Link><Link to="/login">Account Access</Link><Link to="/#contact">FAQ</Link></div>
          <div className="public-footer-column"><h3>Consumer Policy</h3><Link to="/">Terms of Use</Link><Link to="/">Privacy</Link><Link to="/">Security</Link><Link to="/">Sitemap</Link></div>
          <div className="public-footer-address"><h3>Contact</h3><p>CatalogHub Technologies</p><p>Ambad MIDC, Nashik, Maharashtra</p><p>India - 422010</p><a href="mailto:hello@cataloghub.com">hello@cataloghub.com</a><div className="public-social-links"><Link to="/">f</Link><Link to="/">X</Link><Link to="/">IG</Link><Link to="/">YT</Link></div></div>
        </div>
        <div className="public-footer-bottom"><div className="public-footer-services"><span>Secure access</span><span>Role management</span><span>Help center</span></div><span>&copy; 2026 CatalogHub. All rights reserved.</span><div className="public-payment-tags"><span>VISA</span><span>MC</span><span>UPI</span><span>NET</span></div></div>
      </footer>
    </div>
  )
}

function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    profile_pic: null,
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      if (form.password !== form.confirm_password) {
        setLoading(false)
        setMessage({ type: 'error', text: 'Passwords do not match.' })
        return
      }

      await prepareSanctumSession()

      const payload = new FormData()
      payload.append('name', form.name)
      payload.append('email', form.email)
      payload.append('phone_no', form.phone)
      payload.append('password', form.password)
      payload.append('password_confirmation', form.confirm_password)
      if (form.profile_pic) payload.append('profile_image', form.profile_pic)

      const response = await api.post('/api/register', payload, { headers: { 'Content-Type': 'multipart/form-data' } })

      saveAuthData(response.data, 'user')
      setMessage({ type: 'success', text: 'Registration successful. You can now log in.' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Registration failed. Check your Laravel backend route.',
      })
    } finally {
      setLoading(false)
    }
  }

  const cartCount = (() => {
    try {
      const cart = JSON.parse(localStorage.getItem('catalog_cart') || '[]')
      return Array.isArray(cart) ? cart.reduce((total, item) => total + Number(item.quantity || 1), 0) : 0
    } catch { return 0 }
  })()

  return (
    <div className="public-login-page public-register-page">
      <header className="public-header"><nav className="public-navbar" aria-label="Main navigation"><Link className="public-logo" to="/"><span className="public-logo-mark">C</span><span>Catalog<span>Hub</span></span></Link><div className="public-nav-links"><Link to="/">Home</Link><Link to="/#contact">Contact Us</Link><Link className="public-cart-button" to="/cart" aria-label={`Cart with ${cartCount} items`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.1 9.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 7H6" /><circle cx="9" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /></svg><span className="public-cart-count">{cartCount}</span></Link><Link className="public-login-link" to="/login">Login</Link></div></nav></header>

      <main className="public-login-main public-register-main">
        <section className="public-login-layout public-register-layout">
          <article className="public-login-intro public-register-intro"><p className="public-kicker">Join CatalogHub</p><h1>Create your account and start exploring.</h1><p>Register once to save your cart, enjoy a smoother checkout, and keep your orders connected to your account.</p><div className="public-login-benefits"><div><strong>Quick registration</strong><span>Create your customer account in a few simple steps.</span></div><div><strong>Personal profile</strong><span>Add your details and an optional profile picture.</span></div><div><strong>Order access</strong><span>Keep your shopping activity organized in one place.</span></div></div></article>

          <article className="public-login-card public-register-card">
            <p className="public-kicker">Customer registration</p><h2>Create your account</h2><p className="subtext">Enter your details to get started with CatalogHub.</p>
            <form className="auth-form public-register-form" onSubmit={handleSubmit}>
              <label>Full name<input type="text" placeholder="John Doe" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
              <label>Email address<input type="email" placeholder="john@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
              <label>Phone number<input type="text" placeholder="Enter phone number" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /></label>
              <label>Password<input type="password" placeholder="Minimum 8 characters" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
              <label>Confirm password<input type="password" placeholder="Re-enter password" minLength="8" value={form.confirm_password} onChange={(event) => setForm({ ...form, confirm_password: event.target.value })} required /></label>
              <label className="register-file-field">Profile picture <span>Optional, JPG, PNG or WebP</span><input type="file" accept="image/jpg,image/jpeg,image/png,image/webp" onChange={(event) => setForm({ ...form, profile_pic: event.target.files?.[0] || null })} /></label>
              {message.text ? <p className={`status-message ${message.type}`}>{message.text}</p> : null}
              <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
            </form>
            <p className="helper-link">Already have an account? <Link to="/login">Sign in</Link></p>
          </article>
        </section>
      </main>

      <footer className="public-footer"><div className="public-footer-main"><div className="public-footer-brand"><Link className="public-logo public-footer-logo" to="/"><span className="public-logo-mark">C</span><span>Catalog<span>Hub</span></span></Link><p>Simple catalog discovery and management for modern teams and growing businesses.</p></div><div className="public-footer-column"><h3>About</h3><Link to="/#contact">Contact Us</Link><Link to="/">About CatalogHub</Link><Link to="/#catalog">Our Catalog</Link><Link to="/login">Careers</Link></div><div className="public-footer-column"><h3>Help</h3><a href="mailto:hello@cataloghub.com">Support</a><Link to="/#catalog">Catalog Guide</Link><Link to="/login">Account Access</Link><Link to="/#contact">FAQ</Link></div><div className="public-footer-column"><h3>Consumer Policy</h3><Link to="/">Terms of Use</Link><Link to="/">Privacy</Link><Link to="/">Security</Link><Link to="/">Sitemap</Link></div><div className="public-footer-address"><h3>Contact</h3><p>CatalogHub Technologies</p><p>Ambad MIDC, Nashik, Maharashtra</p><p>India - 422010</p><a href="mailto:hello@cataloghub.com">hello@cataloghub.com</a></div></div><div className="public-footer-bottom"><div className="public-footer-services"><span>Secure access</span><span>Role management</span><span>Help center</span></div><span>&copy; 2026 CatalogHub. All rights reserved.</span><div className="public-payment-tags"><span>VISA</span><span>MC</span><span>UPI</span><span>NET</span></div></div></footer>
    </div>
  )
}

function AdminLoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      await prepareSanctumSession()

      const response = await api.post('/api/admin/login', {
        email: form.email,
        password: form.password,
      })

      saveAuthData(response.data, 'admin')
      if (!getAuthToken(response.data)) {
        setMessage({ type: 'error', text: 'Admin login succeeded, but the API response did not include an auth token.' })
        return
      }

      const loggedInAdmin = response.data?.user || {}
      window.location.href = hasPermission('users', 'view', loggedInAdmin) ? '/admin/users' : '/admin/dashboard'
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Admin login failed. Check your Laravel backend.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page admin-page">
      <section className="auth-shell">
        <article className="auth-visual admin-visual">
          <p className="brand-chip">Admin Portal</p>
          <h1>Secure admin access for your Laravel backend.</h1>
          <p className="lead-text">
            This separate route keeps the admin sign-in experience distinct and easy to
            manage for your support and operations team.
          </p>

          <ul className="feature-list">
            <li>Protected admin-only entry point</li>
            <li>Dedicated route at /admin</li>
            <li>Ready for Laravel API authentication</li>
          </ul>
        </article>

        <article className="auth-card admin-card">
          <p className="eyebrow">Admin login</p>
          <h2>Admin sign in</h2>
          <p className="subtext">Use your admin credentials to access the management area.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Admin email
              <input
                type="email"
                placeholder="admin@example.com"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
              />
            </label>

            {message.text ? <p className={`status-message ${message.type}`}>{message.text}</p> : null}

            <button type="submit" className="submit-btn admin-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in as admin'}
            </button>
          </form>

          <p className="helper-link">
            <Link to="/login">Back to user login</Link>
          </p>
        </article>
      </section>
    </main>
  )
}

function AdminUsersPage() {
  const storedAdmin = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const adminName = storedAdmin?.name || 'Admin'
  const adminRole = storedAdmin?.role || storedAdmin?.role_name || 'Administrator'

  const menuItems = getAdminMenuItems(storedAdmin)

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('access_token_expires_at')
    localStorage.removeItem('refresh_token_expires_at')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_role')
    window.location.href = '/admin'
  }

  return (
    <main className="admin-dashboard-shell admin-panel-shell">
      <Sidebar
        adminName={adminName}
        adminRole={adminRole}
        menuItems={menuItems}
        title="Admin Panel"
        subtitle="Manage users, categories, products, and permissions."
      />

      <section className="dashboard-main admin-panel-main">
        <AdminTopNavbar
          adminName={adminName}
          adminRole={adminRole}
          onLogout={handleLogout}
          actionButton={isFullAdmin(storedAdmin) ? <Link to="/admin/users/new" className="ghost-btn">Add New User</Link> : null}
        />
        <UserManagementPage />
        <DashboardFooter />
      </section>
    </main>
  )
}

function AdminCategoriesPage() {
  const storedAdmin = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const adminName = storedAdmin?.name || 'Admin'
  const adminRole = storedAdmin?.role || storedAdmin?.role_name || 'Administrator'

  const menuItems = getAdminMenuItems(storedAdmin)

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('access_token_expires_at')
    localStorage.removeItem('refresh_token_expires_at')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_role')
    window.location.href = '/admin'
  }

  return (
    <main className="admin-dashboard-shell admin-panel-shell">
      <Sidebar
        adminName={adminName}
        adminRole={adminRole}
        menuItems={menuItems}
        title="Admin Panel"
        subtitle="Manage users, categories, products, and permissions."
      />

      <section className="dashboard-main admin-panel-main">
        <AdminTopNavbar
          adminName={adminName}
          adminRole={adminRole}
          onLogout={handleLogout}
          actionButton={isFullAdmin(storedAdmin) ? <Link to="/admin/categories/new" className="ghost-btn">Add Category</Link> : null}
        />
        <CategoryManagementPage />
        <DashboardFooter />
      </section>
    </main>
  )
}

function AdminProductsPage() {
  const storedAdmin = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const adminName = storedAdmin?.name || 'Admin'
  const adminRole = storedAdmin?.role || storedAdmin?.role_name || 'Administrator'

  const menuItems = getAdminMenuItems(storedAdmin)

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('access_token_expires_at')
    localStorage.removeItem('refresh_token_expires_at')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_role')
    window.location.href = '/admin'
  }

  return (
    <main className="admin-dashboard-shell admin-panel-shell">
      <Sidebar
        adminName={adminName}
        adminRole={adminRole}
        menuItems={menuItems}
        title="Admin Panel"
        subtitle="Manage users, categories, products, and permissions."
      />

      <section className="dashboard-main admin-panel-main">
        <AdminTopNavbar
          adminName={adminName}
          adminRole={adminRole}
          onLogout={handleLogout}
          actionButton={isFullAdmin(storedAdmin) ? <Link to="/admin/products/new" className="ghost-btn">Add Product</Link> : null}
        />
        <ProductManagementPage />
        <DashboardFooter />
      </section>
    </main>
  )
}

function AdminTransactionsPage({ detail = false }) {
  const storedAdmin = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const adminName = storedAdmin?.name || 'Admin'
  const adminRole = storedAdmin?.role || storedAdmin?.role_name || 'Administrator'
  const menuItems = getAdminMenuItems(storedAdmin)

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('access_token_expires_at')
    localStorage.removeItem('refresh_token_expires_at')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_role')
    window.location.href = '/admin'
  }

  return (
    <main className="admin-dashboard-shell admin-panel-shell">
      <Sidebar adminName={adminName} adminRole={adminRole} menuItems={menuItems} title="Admin Panel" subtitle="Review customer orders and payment transactions." />
      <section className="dashboard-main admin-panel-main">
        <AdminTopNavbar adminName={adminName} adminRole={adminRole} onLogout={handleLogout} />
        {detail ? <TransactionDetailPage /> : <TransactionManagementPage />}
        <DashboardFooter />
      </section>
    </main>
  )
}

function AdminDashboard() {
  const storedAdmin = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const adminName = storedAdmin?.name || 'Admin'
  const adminRole = storedAdmin?.role || storedAdmin?.role_name || 'Administrator'

  const menuItems = getAdminMenuItems(storedAdmin)

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('access_token_expires_at')
    localStorage.removeItem('refresh_token_expires_at')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_role')
    window.location.href = '/admin'
  }

  return (
    <main className="admin-dashboard-shell admin-panel-shell">
      <Sidebar
        adminName={adminName}
        adminRole={adminRole}
        menuItems={menuItems}
        title="Admin Panel"
        subtitle="Manage users, categories, products, and permissions."
      />

      <section className="dashboard-main admin-panel-main">
        <AdminTopNavbar adminName={adminName} adminRole={adminRole} onLogout={handleLogout} />
        <AdminDashboardMain />
        <DashboardFooter />
      </section>
    </main>
  )
}

function AdminSubAdminsPage({ mode = 'list' }) {
  const storedAdmin = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const adminName = storedAdmin?.name || 'Admin'
  const adminRole = storedAdmin?.role || storedAdmin?.role_name || 'Administrator'
  const menuItems = getAdminMenuItems(storedAdmin)

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('access_token_expires_at')
    localStorage.removeItem('refresh_token_expires_at')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_role')
    window.location.href = '/admin'
  }

  const actionButton = mode === 'list'
    ? <Link to="/admin/sub-admins/new" className="ghost-btn">Add Sub Admin</Link>
    : <Link to="/admin/sub-admins" className="ghost-btn">Back to Sub Admins</Link>

  const renderContent = () => {
    if (mode === 'permissions') return <SubAdminPermissionPage />
    if (mode === 'add') return <SubAdminFormPage mode="add" />
    if (mode === 'edit') return <SubAdminFormPage mode="edit" />

    return <SubAdminManagementPage />
  }

  return (
    <main className="admin-dashboard-shell admin-panel-shell">
      <Sidebar
        adminName={adminName}
        adminRole={adminRole}
        menuItems={menuItems}
        title="Admin Panel"
        subtitle="Manage users, categories, products, and permissions."
      />

      <section className="dashboard-main admin-panel-main">
        <AdminTopNavbar
          adminName={adminName}
          adminRole={adminRole}
          onLogout={handleLogout}
          actionButton={actionButton}
        />
        {renderContent()}
        <DashboardFooter />
      </section>
    </main>
  )
}

function AdminRolePermissionsPage({ mode = 'list' }) {
  const storedAdmin = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const adminName = storedAdmin?.name || 'Admin'
  const adminRole = storedAdmin?.role || storedAdmin?.role_name || 'Administrator'
  const menuItems = getAdminMenuItems(storedAdmin)

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('access_token_expires_at')
    localStorage.removeItem('refresh_token_expires_at')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_role')
    window.location.href = '/admin'
  }

  return (
    <main className="admin-dashboard-shell admin-panel-shell">
      <Sidebar
        adminName={adminName}
        adminRole={adminRole}
        menuItems={menuItems}
        title="Admin Panel"
        subtitle="Manage users, categories, products, and permissions."
      />

      <section className="dashboard-main admin-panel-main">
        <AdminTopNavbar
          adminName={adminName}
          adminRole={adminRole}
          onLogout={handleLogout}
          actionButton={mode === 'list'
            ? (isFullAdmin(storedAdmin) ? <Link to="/admin/role-permissions/new" className="ghost-btn">Add New Role</Link> : null)
            : <Link to="/admin/role-permissions" className="ghost-btn">Back to Roles</Link>}
        />
        {mode === 'permissions' ? <SubAdminPermissionPage /> : mode === 'add' ? <RoleFormPage mode="add" /> : mode === 'edit' ? <RoleFormPage mode="edit" /> : <RolePermissionManagementPage />}
        <DashboardFooter />
      </section>
    </main>
  )
}

function AdminProfilePage() {
  const storedAdmin = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const adminName = storedAdmin?.name || 'Admin'
  const adminRole = storedAdmin?.role || storedAdmin?.role_name || 'Administrator'
  const menuItems = getAdminMenuItems(storedAdmin)

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('access_token_expires_at')
    localStorage.removeItem('refresh_token_expires_at')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_role')
    window.location.href = '/admin'
  }

  return (
    <main className="admin-dashboard-shell admin-panel-shell">
      <Sidebar
        adminName={adminName}
        adminRole={adminRole}
        menuItems={menuItems}
        title="Admin Panel"
        subtitle="Manage users, categories, products, and permissions."
      />

      <section className="dashboard-main admin-panel-main">
        <AdminTopNavbar adminName={adminName} adminRole={adminRole} onLogout={handleLogout} />
        <ProfileSettingsPage />
        <DashboardFooter />
      </section>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/about" element={<PublicOnlyRoute><AboutPage /></PublicOnlyRoute>} />
        <Route path="/contact" element={<PublicOnlyRoute><ContactPage /></PublicOnlyRoute>} />
        <Route path="/login" element={<PublicOnlyRoute><PublicLoginPage /></PublicOnlyRoute>} />
        <Route path="/products/:productId" element={<PublicOnlyRoute><ProductDetailPage /></PublicOnlyRoute>} />
        <Route path="/products" element={<PublicOnlyRoute><AllProductsPage /></PublicOnlyRoute>} />
        <Route path="/categories/:categoryId/products" element={<PublicOnlyRoute><CategoryProductsPage /></PublicOnlyRoute>} />
        <Route path="/cart" element={<PublicOnlyRoute><CartPage /></PublicOnlyRoute>} />
        <Route path="/checkout" element={<PublicOnlyRoute><CheckoutPage /></PublicOnlyRoute>} />
        <Route path="/payment/success" element={<PublicOnlyRoute><PaymentResultPage /></PublicOnlyRoute>} />
        <Route path="/payment/cancel" element={<PublicOnlyRoute><PaymentResultPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
        <Route path="/user/dashboard" element={<CustomerRoute><MyOrdersPage /></CustomerRoute>} />
        <Route path="/my-orders" element={<CustomerRoute><MyOrdersPage /></CustomerRoute>} />
        <Route path="/profile" element={<PublicOnlyRoute><CustomerProfilePage /></PublicOnlyRoute>} />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminAccessRoute><AdminDashboard /></AdminAccessRoute>} />
        <Route path="/admin/users" element={<AdminAccessRoute module="users"><AdminUsersPage /></AdminAccessRoute>} />
        <Route path="/admin/users/new" element={<AdminAccessRoute module="users"><AddNewUserPage /></AdminAccessRoute>} />
        <Route path="/admin/users/:userId/edit" element={<AdminAccessRoute module="users"><EditUserPage /></AdminAccessRoute>} />
        <Route path="/admin/categories" element={<AdminCategoriesPage />} />
        <Route path="/admin/categories/new" element={<AddCategoryPage />} />
        <Route path="/admin/categories/:categoryId/edit" element={<EditCategoryPage />} />
        <Route path="/admin/products" element={<AdminProductsPage />} />
        <Route path="/admin/products/new" element={<ProductFormPage mode="add" />} />
        <Route path="/admin/products/:productId/edit" element={<ProductFormPage mode="edit" />} />
        <Route path="/admin/transactions" element={<AdminAccessRoute module="transactions"><AdminTransactionsPage /></AdminAccessRoute>} />
        <Route path="/admin/transactions/:transactionId" element={<AdminAccessRoute module="transactions"><AdminTransactionsPage detail /></AdminAccessRoute>} />
        <Route path="/admin/sub-admins" element={<AdminSubAdminsPage />} />
        <Route path="/admin/sub-admins/new" element={<AdminSubAdminsPage mode="add" />} />
        <Route path="/admin/sub-admins/:subAdminId/edit" element={<AdminSubAdminsPage mode="edit" />} />
        <Route path="/admin/sub-admins/:subAdminId/permissions" element={<AdminSubAdminsPage mode="permissions" />} />
        <Route path="/admin/role-permissions" element={<AdminRolePermissionsPage />} />
        <Route path="/admin/role-permissions/new" element={<AdminRolePermissionsPage mode="add" />} />
        <Route path="/admin/role-permissions/:subAdminRoleId/edit" element={<AdminRolePermissionsPage mode="edit" />} />
        <Route path="/admin/role-permissions/:subAdminRoleId" element={<AdminRolePermissionsPage mode="permissions" />} />
        <Route path="/admin/profile" element={<AdminProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
