import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Sidebar from '../Sidebar.jsx'
import AdminTopNavbar from './AdminTopNavbar.jsx'
import DashboardFooter from '../DashboardFooter.jsx'
import { api } from '../../api/client.js'
import { getAdminMenuItems } from '../../api/access.js'
import { showSuccess } from '../../utils/alerts.js'

function AddCategoryPage() {
  const navigate = useNavigate()
  const storedAdmin = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const adminName = storedAdmin?.name || 'Admin'
  const adminRole = storedAdmin?.role || storedAdmin?.role_name || 'Administrator'
  const menuItems = getAdminMenuItems(storedAdmin)
  const [form, setForm] = useState({ name: '', status: 'active' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [errors, setErrors] = useState({})

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('access_token_expires_at')
    localStorage.removeItem('refresh_token_expires_at')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_role')
    window.location.href = '/admin'
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Category name is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      await api.post('/api/admin/categories', {
        name: form.name,
        status: form.status,
      })
      await showSuccess('Category created successfully')
      navigate('/admin/categories')
    } catch (error) {
      const nameError = error.response?.data?.errors?.name?.[0]
      if (nameError) setErrors({ name: nameError })
      else setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Category creation failed.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="admin-dashboard-shell admin-panel-shell">
      <Sidebar adminName={adminName} adminRole={adminRole} menuItems={menuItems} title="Admin Panel" subtitle="Manage users, categories, products, and permissions." />

      <section className="dashboard-main admin-panel-main">
        <AdminTopNavbar adminName={adminName} adminRole={adminRole} onLogout={handleLogout} title="Category / Add" />

        <section className="dashboard-main-content admin-main-content">
          <section className="admin-form-section">
            <article className="panel-card admin-form-card">
              <div className="admin-form-head">
                <div>
                  <h3>Add Category</h3>
                  <p className="subtext">Create a category record for catalog organization.</p>
                </div>
                {/* <Link to="/admin/categories" className="ghost-btn">Back to Categories</Link> */}
              </div>

              <form className="admin-record-form" onSubmit={handleSubmit} noValidate>
                <div className="form-grid">
                  <label><span className="field-label">Name <span className="required-mark">*</span></span><input value={form.name} onChange={(event) => { setForm({ ...form, name: event.target.value }); setErrors({ ...errors, name: '' }) }} placeholder="Enter category name" aria-invalid={Boolean(errors.name)} />{errors.name && <small className="admin-field-error">{errors.name}</small>}</label>
                  <label><span className="field-label">Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select></label>
                </div>

                {message.text ? <p className={`status-message ${message.type}`}>{message.text}</p> : null}

                <div className="form-actions">
                  <button type="submit" className="submit-btn admin-btn" disabled={loading}>{loading ? 'Creating...' : 'Create Category'}</button>
                  <Link to="/admin/categories" className="ghost-btn">Cancel</Link>
                </div>
              </form>
            </article>
          </section>
        </section>

        <DashboardFooter />
      </section>
    </main>
  )
}

export default AddCategoryPage
