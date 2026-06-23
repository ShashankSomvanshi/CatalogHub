import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createSubAdminRole, fetchSubAdminRole, updateSubAdminRole } from '../../api/roles.js'
import { showSuccess } from '../../utils/alerts.js'

function RoleFormPage({ mode = 'add' }) {
  const { subAdminRoleId } = useParams()
  const navigate = useNavigate()
  const editing = mode === 'edit'
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [fieldError, setFieldError] = useState('')

  useEffect(() => {
    if (!editing) return
    let ignore = false
    fetchSubAdminRole(subAdminRoleId)
      .then((role) => { if (!ignore) setName(role?.name || '') })
      .catch((error) => { if (!ignore) setMessage(error.response?.data?.message || 'Unable to load this role.') })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [editing, subAdminRoleId])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setFieldError('')

    try {
      if (editing) await updateSubAdminRole(subAdminRoleId, name)
      else await createSubAdminRole(name)
      await showSuccess(`Role ${editing ? 'updated' : 'created'} successfully`)
      navigate('/admin/role-permissions')
    } catch (error) {
      setFieldError(error.response?.data?.errors?.name?.[0] || '')
      setMessage(error.response?.data?.message || `Unable to ${editing ? 'update' : 'create'} role.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="dashboard-main-content admin-main-content">
      <section className="admin-form-section">
        <article className="panel-card admin-form-card role-form-card">
          <div className="admin-form-head"><div><p className="eyebrow">Access management</p><h3>{editing ? 'Edit role' : 'Add new role'}</h3><p className="subtext">{editing ? 'Update the sub-admin role name.' : 'Create a role, then assign its accessible modules.'}</p></div></div>
          {message && !fieldError ? <p className="status-message error">{message}</p> : null}
          {loading ? <p className="subtext">Loading role...</p> : (
            <form className="admin-record-form" onSubmit={handleSubmit} noValidate>
              <div className="form-grid single-field-grid"><label>Role name<input value={name} onChange={(event) => { setName(event.target.value); setFieldError('') }} placeholder="For example: Marketing Manager" required aria-invalid={Boolean(fieldError)} />{fieldError && <small className="field-error">{fieldError}</small>}</label></div>
              <div className="form-actions"><button type="submit" className="submit-btn admin-btn" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Create role'}</button><Link to="/admin/role-permissions" className="ghost-btn">Cancel</Link></div>
            </form>
          )}
        </article>
      </section>
    </section>
  )
}

export default RoleFormPage
