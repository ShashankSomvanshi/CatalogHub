import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Sidebar from '../Sidebar.jsx'
import AdminTopNavbar from './AdminTopNavbar.jsx'
import DashboardFooter from '../DashboardFooter.jsx'
import { api } from '../../api/client.js'
import { getAdminMenuItems } from '../../api/access.js'
import { fetchRoles, fetchSubAdminRoles, getRoleId, getRoleName } from '../../api/roles.js'
import { showSuccess } from '../../utils/alerts.js'

function AddNewUserPage() {
  const navigate = useNavigate()
  const storedAdmin = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const adminName = storedAdmin?.name || 'Admin'
  const adminRole = storedAdmin?.role || storedAdmin?.role_name || 'Administrator'
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    role_id: '3',
    sub_role_id: '',
    status: 'active',
    profile_pic: null,
  })
  const [loading, setLoading] = useState(false)
  const [rolesLoading, setRolesLoading] = useState(true)
  const [roles, setRoles] = useState([])
  const [subAdminRoles, setSubAdminRoles] = useState([])
  const [message, setMessage] = useState({ type: '', text: '' })

  const menuItems = getAdminMenuItems(storedAdmin)

  useEffect(() => {
    let ignore = false

    const loadRoles = async () => {
      setRolesLoading(true)

      try {
        const [loadedRoles, loadedSubAdminRoles] = await Promise.all([
          fetchRoles(),
          fetchSubAdminRoles(),
        ])
        if (ignore) return

        const assignableRoles = loadedRoles.filter((role) => (
          getRoleId(role) !== '1' && getRoleName(role).trim().toLowerCase() !== 'admin'
        ))

        setRoles(assignableRoles)
        setSubAdminRoles(loadedSubAdminRoles)
        if (assignableRoles.length) {
          setForm((current) => assignableRoles.some((role) => getRoleId(role) === current.role_id)
            ? current
            : { ...current, role_id: getRoleId(assignableRoles[0]) })
        }
      } catch (error) {
        if (!ignore) {
          setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to load roles.' })
        }
      } finally {
        if (!ignore) setRolesLoading(false)
      }
    }

    loadRoles()

    return () => {
      ignore = true
    }
  }, [])

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
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      if (form.password !== form.confirm_password) {
        setMessage({ type: 'error', text: 'Password and confirm password do not match.' })
        setLoading(false)
        return
      }

      const payload = {
        name: form.name,
        email: form.email,
        phone_no: form.phone,
        password: form.password,
        password_confirmation: form.confirm_password,
        role_id: Number(form.role_id),
        status: form.status,
      }

      if (Number(form.role_id) === 2) {
        payload.sub_role_id = Number(form.sub_role_id)
      }

      if (form.profile_pic) {
        payload.profile_image = form.profile_pic
      }

      if (form.profile_pic) {
        const formData = new FormData()
        Object.entries(payload).forEach(([key, value]) => formData.append(key, value))
        await api.post('/api/admin/users', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        await api.post('/api/admin/users', payload)
      }
      await showSuccess('User created successfully')
      navigate('/admin/users')
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'User creation failed.',
      })
    } finally {
      setLoading(false)
    }
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
          actionButton={<Link to="/admin/users" className="ghost-btn">Back to Users</Link>}
        />

        <section className="dashboard-main-content admin-main-content">
          <section className="admin-form-section">
            <article className="panel-card admin-form-card">
              <div className="admin-form-head">
                <div>
                  <h3>New user details</h3>
                  <p className="subtext">Create an account and assign its role.</p>
                </div>
              </div>

              <form className="admin-record-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Enter full name" required /></label>
                  <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.com" required /></label>
                  <label>Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Enter phone number" /></label>
                  <label>Type<select value={form.role_id} onChange={(event) => setForm({ ...form, role_id: event.target.value, sub_role_id: event.target.value === '2' ? form.sub_role_id : '' })} disabled={rolesLoading || roles.length === 0} required>
                    {roles.length === 0 ? <option value={form.role_id}>{rolesLoading ? 'Loading roles...' : 'No roles found'}</option> : roles.map((role) => (
                      <option key={getRoleId(role)} value={getRoleId(role)}>{getRoleName(role)}</option>
                    ))}
                  </select></label>
                  {form.role_id === '2' ? (
                    <label>Sub Admin Role<select value={form.sub_role_id} onChange={(event) => setForm({ ...form, sub_role_id: event.target.value })} required>
                      <option value="">Select sub admin role</option>
                      {subAdminRoles.map((role) => (
                        <option key={getRoleId(role)} value={getRoleId(role)}>{getRoleName(role)}</option>
                      ))}
                    </select></label>
                  ) : null}
                  <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Create password" required /></label>
                  <label>Confirm password<input type="password" value={form.confirm_password} onChange={(event) => setForm({ ...form, confirm_password: event.target.value })} placeholder="Re-enter password" required /></label>
                  <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select></label>
                  <label className="full-field">Profile picture<input type="file" accept="image/*" onChange={(event) => setForm({ ...form, profile_pic: event.target.files?.[0] || null })} /></label>
                </div>

                {message.text ? <p className={`status-message ${message.type}`}>{message.text}</p> : null}

                <div className="form-actions">
                  <button type="submit" className="submit-btn admin-btn" disabled={loading}>{loading ? 'Creating...' : 'Create user'}</button>
                  <Link to="/admin/users" className="ghost-btn">Cancel</Link>
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

export default AddNewUserPage
