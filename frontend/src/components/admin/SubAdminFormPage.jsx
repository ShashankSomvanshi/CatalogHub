import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createSubAdmin, fetchSubAdmin, updateSubAdmin } from '../../api/access.js'
import { fetchSubAdminRoles, getRoleId, getRoleName } from '../../api/roles.js'

function SubAdminFormPage({ mode = 'add' }) {
  const isEdit = mode === 'edit'
  const { subAdminId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone_no: '',
    password: '',
    password_confirmation: '',
    status: 'active',
    sub_role_id: '',
  })
  const [subAdminRoles, setSubAdminRoles] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    let ignore = false

    const loadSubAdmin = async () => {
      if (!isEdit) return

      setLoading(true)
      setMessage({ type: '', text: '' })

      try {
        const subAdmin = await fetchSubAdmin(subAdminId)

        if (ignore) return

        setForm({
          name: subAdmin.name || '',
          email: subAdmin.email || '',
          phone_no: subAdmin.phone_no || '',
          password: '',
          password_confirmation: '',
          status: subAdmin.status || 'active',
          sub_role_id: String(subAdmin.sub_role_id || ''),
        })
      } catch (error) {
        if (!ignore) {
          setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to load sub admin.' })
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadSubAdmin()

    return () => {
      ignore = true
    }
  }, [isEdit, subAdminId])

  useEffect(() => {
    fetchSubAdminRoles()
      .then(setSubAdminRoles)
      .catch((error) => setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to load sub admin roles.' }))
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      if (form.password || !isEdit) {
        if (form.password !== form.password_confirmation) {
          setMessage({ type: 'error', text: 'Password and confirm password do not match.' })
          setSaving(false)
          return
        }
      }

      const payload = {
        name: form.name,
        email: form.email,
        phone_no: form.phone_no,
        status: form.status,
        sub_role_id: Number(form.sub_role_id),
      }

      if (form.password) {
        payload.password = form.password
        payload.password_confirmation = form.password_confirmation
      }

      if (isEdit) {
        await updateSubAdmin(subAdminId, payload)
        setMessage({ type: 'success', text: 'Sub admin updated successfully.' })
      } else {
        await createSubAdmin(payload)
        setMessage({ type: 'success', text: 'Sub admin created successfully.' })
      }

      setTimeout(() => navigate('/admin/sub-admins'), 500)
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Sub admin save failed.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="dashboard-main-content admin-main-content">
      <section className="admin-form-section">
        <article className="panel-card admin-form-card">
          <div className="admin-form-head">
            <div>
              <p className="eyebrow">Access management</p>
              <h3>{isEdit ? 'Edit sub admin' : 'New sub admin details'}</h3>
              <p className="subtext">Create staff accounts and manage their active status.</p>
            </div>
          </div>

          {loading ? (
            <p className="subtext">Loading sub admin...</p>
          ) : (
            <form className="admin-record-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Enter full name" required /></label>
                <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.com" required /></label>
                <label>Phone<input value={form.phone_no} onChange={(event) => setForm({ ...form, phone_no: event.target.value })} placeholder="Enter phone number" /></label>
                <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select></label>
                <label>Sub Admin Role<select value={form.sub_role_id} onChange={(event) => setForm({ ...form, sub_role_id: event.target.value })} required>
                  <option value="">Select sub admin role</option>
                  {subAdminRoles.map((role) => (
                    <option key={getRoleId(role)} value={getRoleId(role)}>{getRoleName(role)}</option>
                  ))}
                </select></label>
                <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={isEdit ? 'Leave blank to keep current password' : 'Create password'} required={!isEdit} /></label>
                <label>Confirm password<input type="password" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} placeholder="Re-enter password" required={!isEdit} /></label>
              </div>

              {message.text ? <p className={`status-message ${message.type}`}>{message.text}</p> : null}

              <div className="form-actions">
                <button type="submit" className="submit-btn admin-btn" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update sub admin' : 'Create sub admin'}</button>
              </div>
            </form>
          )}
        </article>
      </section>
    </section>
  )
}

export default SubAdminFormPage
