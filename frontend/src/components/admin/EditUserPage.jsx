import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../Sidebar.jsx'
import AdminTopNavbar from './AdminTopNavbar.jsx'
import DashboardFooter from '../DashboardFooter.jsx'
import { api } from '../../api/client.js'
import { getAdminMenuItems } from '../../api/access.js'
import { fetchRoles, fetchSubAdminRoles, getRoleId, getRoleName } from '../../api/roles.js'
import { showSuccess } from '../../utils/alerts.js'

function findUserArray(payload) {
  if (Array.isArray(payload)) return payload

  if (!payload || typeof payload !== 'object') return []

  for (const key of ['users', 'data', 'items', 'result', 'records']) {
    const users = findUserArray(payload[key])
    if (users.length > 0) return users
  }

  return []
}

function EditUserPage() {
  const { userId } = useParams()
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
    role_id: '',
    sub_role_id: '',
    status: 'active',
  })
  const [roles, setRoles] = useState([])
  const [subAdminRoles, setSubAdminRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

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

  useEffect(() => {
    let ignore = false

    const loadData = async () => {
      setLoading(true)
      setRolesLoading(true)
      setMessage({ type: '', text: '' })

      try {
        const [usersResponse, loadedRoles, loadedSubAdminRoles] = await Promise.all([
          api.get('/api/admin/users'),
          fetchRoles(),
          fetchSubAdminRoles(),
        ])

        if (ignore) return

        const selectedUser = findUserArray(usersResponse.data).find((user) => String(user.id) === String(userId))

        if (!selectedUser) {
          setMessage({ type: 'error', text: 'User not found.' })
          return
        }

        setRoles(loadedRoles)
        setSubAdminRoles(loadedSubAdminRoles)
        setForm({
          name: selectedUser.name || '',
          email: selectedUser.email || '',
          phone: selectedUser.phone || selectedUser.phone_no || '',
          password: '',
          confirm_password: '',
          role_id: String(selectedUser.role_id || selectedUser.role || getRoleId(loadedRoles[0]) || ''),
          sub_role_id: String(selectedUser.sub_role_id || ''),
          status: selectedUser.status || 'active',
        })
      } catch (error) {
        if (!ignore) {
          setMessage({
            type: 'error',
            text: error.response?.data?.message || 'Unable to load user details.',
          })
        }
      } finally {
        if (!ignore) {
          setLoading(false)
          setRolesLoading(false)
        }
      }
    }

    loadData()

    return () => {
      ignore = true
    }
  }, [userId])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      if (form.password || form.confirm_password) {
        if (form.password !== form.confirm_password) {
          setMessage({ type: 'error', text: 'Password and confirm password do not match.' })
          setSaving(false)
          return
        }
      }

      const payload = {
        name: form.name,
        email: form.email,
        phone_no: form.phone,
        role_id: Number(form.role_id),
        status: form.status,
      }

      if (Number(form.role_id) === 2) {
        payload.sub_role_id = Number(form.sub_role_id)
      }

      if (form.password.trim()) {
        payload.password = form.password
        payload.password_confirmation = form.confirm_password
      }

      await api.put(`/api/admin/users/${userId}`, payload)
      await showSuccess('User updated successfully')
      navigate('/admin/users')
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Update failed.',
      })
    } finally {
      setSaving(false)
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
                  <h3>Edit user</h3>
                  <p className="subtext">Update account details and role access.</p>
                </div>
              </div>

              {message.text ? <p className={`status-message ${message.type}`}>{message.text}</p> : null}

              {loading ? (
                <p className="subtext">Loading user details...</p>
              ) : (
                <form className="admin-record-form" onSubmit={handleSubmit}>
                  <div className="form-grid">
                    <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Enter full name" required /></label>
                    <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.com" required /></label>
                    <label>Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Enter phone number" /></label>
                    <label>Role<select value={form.role_id} onChange={(event) => setForm({ ...form, role_id: event.target.value, sub_role_id: event.target.value === '2' ? form.sub_role_id : '' })} disabled={rolesLoading || roles.length === 0}>
                      {roles.length === 0 ? (
                        <option value={form.role_id}>{rolesLoading ? 'Loading roles...' : 'No roles found'}</option>
                      ) : roles.map((role) => (
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
                    <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select></label>
                    <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Leave blank to keep current password" /></label>
                    <label>Confirm password<input type="password" value={form.confirm_password} onChange={(event) => setForm({ ...form, confirm_password: event.target.value })} placeholder="Re-enter new password" /></label>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="submit-btn admin-btn" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
                    <Link to="/admin/users" className="ghost-btn">Cancel</Link>
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

export default EditUserPage
