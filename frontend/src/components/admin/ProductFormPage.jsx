import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Editor } from '@tinymce/tinymce-react'
import Sidebar from '../Sidebar.jsx'
import AdminTopNavbar from './AdminTopNavbar.jsx'
import DashboardFooter from '../DashboardFooter.jsx'
import { api } from '../../api/client.js'
import { getAdminMenuItems } from '../../api/access.js'
import { fetchCategories } from '../../api/categories.js'
import { fetchProduct, getProductImage, getProductName } from '../../api/products.js'
import { showSuccess } from '../../utils/alerts.js'

function getInitialAdminTheme() {
  const savedTheme = localStorage.getItem('admin_theme')
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme

  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function ProductFormPage({ mode = 'add' }) {
  const tinyApiKey = 'wyjbuedjqlj65nvr3zsrfbjbfnoodeikatnivhfumzwmrpzi'
  const isEdit = mode === 'edit'
  const { productId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
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
  const [errors, setErrors] = useState({})
  const [currentImage, setCurrentImage] = useState('')
  const [editorTheme, setEditorTheme] = useState(getInitialAdminTheme)
  const queryReturnTo = new URLSearchParams(location.search).get('returnTo')
  const requestedReturnTo = location.state?.returnTo || queryReturnTo || '/admin/products'
  const productsReturnPath = typeof requestedReturnTo === 'string' && requestedReturnTo.startsWith('/admin/products')
    ? requestedReturnTo
    : '/admin/products'

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
    const handleThemeChange = (event) => setEditorTheme(event.detail?.theme === 'light' ? 'light' : 'dark')
    window.addEventListener('admin-theme-change', handleThemeChange)

    return () => window.removeEventListener('admin-theme-change', handleThemeChange)
  }, [])

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
          setCurrentImage(getProductImage(product) || '')
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

  const validateForm = () => {
    const nextErrors = {}
    const descriptionText = form.description.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim()
    if (!form.product_name.trim()) nextErrors.product_name = 'Product name is required.'
    if (!form.category_id) nextErrors.category_id = 'Category is required.'
    if (!String(form.price).trim()) nextErrors.price = 'Price is required.'
    else if (Number(form.price) < 0) nextErrors.price = 'Price cannot be negative.'
    if (!form.sku.trim()) nextErrors.sku = 'SKU is required.'
    if (!descriptionText) nextErrors.description = 'Description is required.'
    return nextErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validateForm()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const payload = buildPayload()
      const config = { headers: { 'Content-Type': 'multipart/form-data' } }

      if (isEdit) {
        await api.put(`/api/admin/products/${productId}`, payload, config)
      } else {
        await api.post('/api/admin/products', payload, config)
      }

      await showSuccess(`Product ${isEdit ? 'updated' : 'created'} successfully`)
      navigate(productsReturnPath)
    } catch (error) {
      const apiErrors = error.response?.data?.errors || {}
      const nextApiErrors = {}
      if (apiErrors.product_name?.[0] || apiErrors.name?.[0]) nextApiErrors.product_name = apiErrors.product_name?.[0] || apiErrors.name?.[0]
      if (apiErrors.category_id?.[0]) nextApiErrors.category_id = apiErrors.category_id[0]
      if (apiErrors.price?.[0]) nextApiErrors.price = apiErrors.price[0]
      if (apiErrors.sku?.[0]) nextApiErrors.sku = apiErrors.sku[0]
      if (apiErrors.description?.[0]) nextApiErrors.description = apiErrors.description[0]
      if (Object.keys(nextApiErrors).length > 0) setErrors(nextApiErrors)
      else setMessage({
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
        <AdminTopNavbar adminName={adminName} adminRole={adminRole} onLogout={handleLogout} title={`Product / ${isEdit ? 'Edit' : 'Add'}`} />

        <section className="dashboard-main-content admin-main-content">
          <section className="admin-form-section">
            <article className="panel-card admin-form-card">
              <div className="admin-form-head">
                <div>
                  <h3>{isEdit ? 'Edit Product' : 'Add Product'}</h3>
                  <p className="subtext">{isEdit ? 'Update product details and catalog status.' : 'Create a product record for your catalog.'}</p>
                </div>
                {/* <Link to="/admin/products" className="ghost-btn">Back to Products</Link> */}
              </div>

              {message.text ? <p className={`status-message ${message.type}`}>{message.text}</p> : null}

              {loading ? (
                <p className="subtext">Loading product details...</p>
              ) : (
                <form className="admin-record-form" onSubmit={handleSubmit} noValidate>
                  <div className="form-grid">
                    <label><span className="field-label">Product Name <span className="required-mark">*</span></span><input value={form.product_name} onChange={(event) => { setForm({ ...form, product_name: event.target.value }); setErrors({ ...errors, product_name: '' }) }} placeholder="Enter product name" aria-invalid={Boolean(errors.product_name)} />{errors.product_name && <small className="admin-field-error">{errors.product_name}</small>}</label>
                    <label><span className="field-label">Category <span className="required-mark">*</span></span><select value={form.category_id} onChange={(event) => { setForm({ ...form, category_id: event.target.value }); setErrors({ ...errors, category_id: '' }) }} disabled={activeCategories.length === 0} aria-invalid={Boolean(errors.category_id)}>
                      {activeCategories.length === 0 ? (
                        <option value="">No active categories found</option>
                      ) : activeCategories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name || category.category_name}</option>
                      ))}
                    </select>{errors.category_id && <small className="admin-field-error">{errors.category_id}</small>}</label>
                    <label><span className="field-label">Price ($) <span className="required-mark">*</span></span><input type="number" min="0" step="0.01" value={form.price} onChange={(event) => { setForm({ ...form, price: event.target.value }); setErrors({ ...errors, price: '' }) }} placeholder="0.00" aria-invalid={Boolean(errors.price)} />{errors.price && <small className="admin-field-error">{errors.price}</small>}</label>
                    <label><span className="field-label">SKU <span className="required-mark">*</span></span><input value={form.sku} onChange={(event) => { setForm({ ...form, sku: event.target.value }); setErrors({ ...errors, sku: '' }) }} placeholder="Enter SKU" aria-invalid={Boolean(errors.sku)} />{errors.sku && <small className="admin-field-error">{errors.sku}</small>}</label>
                    <label><span className="field-label">Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select></label>
                    <label>
                      <span className="field-label">Product Image</span>
                      <input type="file" accept="image/*" onChange={(event) => setForm({ ...form, product_image: event.target.files?.[0] || null })} />
                    </label>
                    {isEdit && currentImage ? (
                      <div className="product-current-image">
                        <span className="product-current-image-label">Current image</span>
                        <div className="product-image-preview">
                          <img src={currentImage} alt={getProductName(form) || 'Current product'} />
                        </div>
                      </div>
                    ) : null}
                    <label className="full-field">
                      <span className="field-label">Description <span className="required-mark">*</span></span>
                      <div className={`tinymce-field ${errors.description ? 'invalid' : ''}`}>
                        <Editor
                          key={editorTheme}
                          apiKey={tinyApiKey}
                          value={form.description}
                          onEditorChange={(value) => {
                            setForm({ ...form, description: value })
                            setErrors({ ...errors, description: '' })
                          }}
                          init={{
                            height: 380,
                            menubar: false,
                            branding: false,
                            resize: false,
                            skin: editorTheme === 'light' ? 'oxide' : 'oxide-dark',
                            content_css: editorTheme === 'light' ? 'default' : 'dark',
                            placeholder: 'Enter product description',
                            tinymceai_token_provider: async () => {
                              await fetch(`https://demo.api.tiny.cloud/1/${tinyApiKey}/auth/random`, {
                                method: 'POST',
                                credentials: 'include',
                              })

                              return {
                                token: await fetch(`https://demo.api.tiny.cloud/1/${tinyApiKey}/jwt/tinymceai`, {
                                  credentials: 'include',
                                }).then((response) => response.text()),
                              }
                            },
                            plugins: [
                              'accordion', 'advlist', 'anchor', 'autolink', 'autoresize', 'autosave',
                              'charmap', 'code', 'codesample', 'directionality', 'emoticons', 'fullscreen',
                              'help', 'image', 'importcss', 'insertdatetime', 'link', 'lists', 'media',
                              'nonbreaking', 'pagebreak', 'preview', 'quickbars', 'save', 'searchreplace',
                              'table', 'visualblocks', 'visualchars', 'wordcount',
                              'tinymceai',
                            ],
                            toolbar: 'undo redo | blocks | bold italic underline | forecolor backcolor | alignleft aligncenter alignright | bullist numlist | link image media table | tinymceai-chat tinymceai-quickactions tinymceai-review | removeformat code preview fullscreen',
                            content_style: `body { font-family: Inter, sans-serif; font-size: 14px; color: ${editorTheme === 'light' ? '#0f172a' : '#f8fafc'}; background: ${editorTheme === 'light' ? '#ffffff' : '#0f172a'}; }`,
                          }}
                        />
                      </div>
                      {errors.description && <small className="admin-field-error">{errors.description}</small>}
                    </label>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="submit-btn admin-btn" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save' : 'Create Product'}</button>
                    <Link to={productsReturnPath} className="ghost-btn">Cancel</Link>
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
