import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../Sidebar.jsx'
import AdminTopNavbar from './AdminTopNavbar.jsx'
import DashboardFooter from '../DashboardFooter.jsx'
import { api } from '../../api/client.js'
import { getAdminMenuItems } from '../../api/access.js'
import { fetchCategories } from '../../api/categories.js'
import { fetchProduct, getProductName } from '../../api/products.js'
import { showSuccess } from '../../utils/alerts.js'

function ProductFormPage({ mode = 'add' }) {
  const isEdit = mode === 'edit'
  const { productId } = useParams()
  const navigate = useNavigate()
  const storedAdmin = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const adminName = storedAdmin?.name || 'Admin'
  const adminRole = storedAdmin?.role || storedAdmin?.role_name || 'Administrator'
  const menuItems = getAdminMenuItems(storedAdmin)
  const [form, setForm] = useState({
    product_name: '',
    category_id: '',
    description: '',
    price: '',
    sku: '',
    product_image: null,
    status: 'active',
  })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const activeCategories = categories.filter((category) => (category.status || 'active').toLowerCase() === 'active')

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('access_token_expires_at')
    localStorage.removeItem('refresh_token_expires_at')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_role')
    window.location.href = '/admin'
  }

  useEffect(() => {
    let ignore = false

    const loadData = async () => {
      setLoading(isEdit)
      setMessage({ type: '', text: '' })

      try {
        const loadedCategories = await fetchCategories()
        if (ignore) return

        setCategories(loadedCategories)
        const loadedActiveCategories = loadedCategories.filter((category) => (category.status || 'active').toLowerCase() === 'active')

        if (isEdit) {
          const product = await fetchProduct(productId)
          if (ignore) return

          if (!product) {
            setMessage({ type: 'error', text: 'Product not found.' })
            return
          }

          setForm({
            product_name: getProductName(product),
            category_id: String(product.category_id || product.category?.id || loadedActiveCategories[0]?.id || ''),
            description: product.description || '',
            price: product.price || '',
            sku: product.sku || '',
            product_image: null,
            status: product.status || 'active',
          })
        } else if (loadedActiveCategories.length > 0) {
          setForm((currentForm) => ({
            ...currentForm,
            category_id: currentForm.category_id || String(loadedActiveCategories[0].id),
          }))
        }
      } catch (error) {
        if (!ignore) {
          setMessage({
            type: 'error',
            text: error.response?.data?.message || 'Unable to load product form data.',
          })
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadData()

    return () => {
      ignore = true
    }
  }, [isEdit, productId])

  const buildPayload = () => {
    const payload = new FormData()
    payload.append('product_name', form.product_name)
    payload.append('name', form.product_name)
    payload.append('category_id', form.category_id)
    payload.append('description', form.description)
    payload.append('price', form.price)
    payload.append('sku', form.sku)
    payload.append('status', form.status)

    if (form.product_image) {
      payload.append('product_image', form.product_image)
      payload.append('image', form.product_image)
    }

    return payload
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      if (!form.category_id) {
        setMessage({ type: 'error', text: 'Please create or activate a category before saving a product.' })
        setSaving(false)
        return
      }

      const payload = buildPayload()
      const config = { headers: { 'Content-Type': 'multipart/form-data' } }

      if (isEdit) {
        await api.put(`/api/admin/products/${productId}`, payload, config)
      } else {
        await api.post('/api/admin/products', payload, config)
      }

      await showSuccess(`Product ${isEdit ? 'updated' : 'created'} successfully`)
      navigate('/admin/products')
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || `${isEdit ? 'Update' : 'Product creation'} failed.`,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="admin-dashboard-shell admin-panel-shell">
      <Sidebar adminName={adminName} adminRole={adminRole} menuItems={menuItems} title="Admin Panel" subtitle="Manage users, categories, products, and permissions." />

      <section className="dashboard-main admin-panel-main">
        <AdminTopNavbar adminName={adminName} adminRole={adminRole} onLogout={handleLogout} actionButton={<Link to="/admin/products" className="ghost-btn">Back to Products</Link>} />

        <section className="dashboard-main-content admin-main-content">
          <section className="admin-form-section">
            <article className="panel-card admin-form-card">
              <div className="admin-form-head">
                <div>
                  <p className="eyebrow">Product database</p>
                  <h3>{isEdit ? 'Edit product' : 'Add product'}</h3>
                  <p className="subtext">{isEdit ? 'Update product details and catalog status.' : 'Create a product record for your catalog.'}</p>
                </div>
              </div>

              {message.text ? <p className={`status-message ${message.type}`}>{message.text}</p> : null}

              {loading ? (
                <p className="subtext">Loading product details...</p>
              ) : (
                <form className="admin-record-form" onSubmit={handleSubmit}>
                  <div className="form-grid">
                    <label>Product name<input value={form.product_name} onChange={(event) => setForm({ ...form, product_name: event.target.value })} placeholder="Enter product name" required /></label>
                    <label>Category<select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} disabled={activeCategories.length === 0} required>
                      {activeCategories.length === 0 ? (
                        <option value="">No active categories found</option>
                      ) : activeCategories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name || category.category_name}</option>
                      ))}
                    </select></label>
                    <label>Price<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="0.00" required /></label>
                    <label>SKU<input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} placeholder="Enter SKU" required /></label>
                    <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select></label>
                    <label>Product image<input type="file" accept="image/*" onChange={(event) => setForm({ ...form, product_image: event.target.files?.[0] || null })} /></label>
                    <label className="full-field">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Enter product description" rows="4" required /></label>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="submit-btn admin-btn" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create product'}</button>
                    <Link to="/admin/products" className="ghost-btn">Cancel</Link>
                  </div>
                </form>
              )}
            </article>
          </section>
        </section>

        <DashboardFooter />
      </section>
    </main>
  )
}

export default ProductFormPage
