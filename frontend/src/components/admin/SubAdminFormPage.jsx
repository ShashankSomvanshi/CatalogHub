import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createSubAdmin, fetchSubAdmin, updateSubAdmin } from '../../api/access.js'
import { fetchSubAdminRoles, getRoleId, getRoleName } from '../../api/roles.js'
import { showSuccess } from '../../utils/alerts.js'

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
  const [errors, setErrors] = useState({})

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

  const validateForm = () => {
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Name is required.'
    if (!form.email.trim()) nextErrors.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = 'Enter a valid email address.'
    if (!form.sub_role_id) nextErrors.sub_role_id = 'Sub admin role is required.'
    if (!isEdit || form.password || form.password_confirmation) {
      if (!form.password) nextErrors.password = isEdit ? 'Enter a new password.' : 'Password is required.'
      if (!form.password_confirmation) nextErrors.password_confirmation = isEdit ? 'Confirm the new password.' : 'Confirm password is required.'
      else if (form.password !== form.password_confirmation) nextErrors.password_confirmation = 'Password and confirm password do not match.'
    }
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
      } else {
        await createSubAdmin(payload)
      }
      await showSuccess(`Sub admin ${isEdit ? 'updated' : 'created'} successfully.`)
      navigate('/admin/sub-admins')
    } catch (error) {
      const apiErrors = error.response?.data?.errors || {}
      const nextApiErrors = {}
      if (apiErrors.name?.[0]) nextApiErrors.name = apiErrors.name[0]
      if (apiErrors.email?.[0]) nextApiErrors.email = apiErrors.email[0]
      if (apiErrors.sub_role_id?.[0]) nextApiErrors.sub_role_id = apiErrors.sub_role_id[0]
      if (apiErrors.password?.[0]) nextApiErrors.password = apiErrors.password[0]
      if (apiErrors.password_confirmation?.[0]) nextApiErrors.password_confirmation = apiErrors.password_confirmation[0]
      if (Object.keys(nextApiErrors).length > 0) setErrors(nextApiErrors)
      else setMessage({ type: 'error', text: error.response?.data?.message || 'Sub admin save failed.' })
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
              <h3>{isEdit ? 'Edit sub admin' : 'New sub admin details'}</h3>
              <p className="subtext">Create staff accounts and manage their active status.</p>
            </div>
          </div>

          {loading ? (
            <p className="subtext">Loading sub admin...</p>
          ) : (
            <form className="admin-record-form" onSubmit={handleSubmit} noValidate>
              <div className="form-grid">
                <label><span className="field-label">Name <span className="required-mark">*</span></span><input value={form.name} onChange={(event) => { setForm({ ...form, name: event.target.value }); setErrors({ ...errors, name: '' }) }} placeholder="Enter full name" aria-invalid={Boolean(errors.name)} />{errors.name && <small className="admin-field-error">{errors.name}</small>}</label>
                <label><span className="field-label">Email <span className="required-mark">*</span></span><input type="text" inputMode="email" value={form.email} onChange={(event) => { setForm({ ...form, email: event.target.value }); setErrors({ ...errors, email: '' }) }} placeholder="name@example.com" aria-invalid={Boolean(errors.email)} />{errors.email && <small className="admin-field-error">{errors.email}</small>}</label>
                <label><span className="field-label">Phone</span><input value={form.phone_no} onChange={(event) => setForm({ ...form, phone_no: event.target.value })} placeholder="Enter phone number" /></label>
                <label><span className="field-label">Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select></label>
                <label><span className="field-label">Sub Admin Role <span className="required-mark">*</span></span><select value={form.sub_role_id} onChange={(event) => { setForm({ ...form, sub_role_id: event.target.value }); setErrors({ ...errors, sub_role_id: '' }) }} aria-invalid={Boolean(errors.sub_role_id)}>
                  <option value="">Select sub admin role</option>
                  {subAdminRoles.map((role) => (
                    <option key={getRoleId(role)} value={getRoleId(role)}>{getRoleName(role)}</option>
                  ))}
                </select>{errors.sub_role_id && <small className="admin-field-error">{errors.sub_role_id}</small>}</label>
                <label><span className="field-label">Password {!isEdit ? <span className="required-mark">*</span> : null}</span><input type="password" value={form.password} onChange={(event) => { setForm({ ...form, password: event.target.value }); setErrors({ ...errors, password: '' }) }} placeholder={isEdit ? 'Leave blank to keep current password' : 'Create password'} aria-invalid={Boolean(errors.password)} />{errors.password && <small className="admin-field-error">{errors.password}</small>}</label>
                <label><span className="field-label">Confirm Password {!isEdit ? <span className="required-mark">*</span> : null}</span><input type="password" value={form.password_confirmation} onChange={(event) => { setForm({ ...form, password_confirmation: event.target.value }); setErrors({ ...errors, password_confirmation: '' }) }} placeholder="Re-enter password" aria-invalid={Boolean(errors.password_confirmation)} />{errors.password_confirmation && <small className="admin-field-error">{errors.password_confirmation}</small>}</label>
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
