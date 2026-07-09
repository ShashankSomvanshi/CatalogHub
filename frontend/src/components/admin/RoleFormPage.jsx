import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createSubAdminRole, fetchSubAdminRole, updateSubAdminRole } from '../../api/roles.js'
import { fetchRoleModulePermissions, fetchRoleModules, updateRoleModulePermissions } from '../../api/access.js'
import { showSuccess } from '../../utils/alerts.js'
import SortableHeader from './SortableHeader.jsx'
import useSortableRows from './useSortableRows.js'
import TableLoader from './TableLoader.jsx'

function RoleFormPage({ mode = 'add' }) {
  const { subAdminRoleId } = useParams()
  const navigate = useNavigate()
  const editing = mode === 'edit'
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [modules, setModules] = useState([])
  const { sortedRows, sort, requestSort } = useSortableRows(modules, {
    module: (module) => module.module_name,
    view: (module) => Number(Boolean(module.can_view)),
    create: (module) => Number(Boolean(module.can_create)),
    update: (module) => Number(Boolean(module.can_update)),
    delete: (module) => Number(Boolean(module.can_delete)),
  }, 'module')

  useEffect(() => {
    let ignore = false

    const request = editing
      ? Promise.all([fetchSubAdminRole(subAdminRoleId), fetchRoleModulePermissions(subAdminRoleId)])
      : Promise.all([Promise.resolve(null), fetchRoleModules()])

    request
      .then(([role, permissionData]) => {
        if (!ignore) {
          if (editing) setName(role?.name || '')
          setModules(permissionData.modules || [])
        }
      })
      .catch((error) => { if (!ignore) setMessage(error.response?.data?.message || 'Unable to load this role.') })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [editing, subAdminRoleId])

  const setPermission = (moduleId, key, value) => {
    setModules((current) => current.map((module) => {
      if (module.id !== moduleId) return module
      if (key === 'can_view' && !value) {
        return { ...module, can_view: false, can_create: false, can_update: false, can_delete: false }
      }

      return { ...module, [key]: value, ...(key !== 'can_view' && value ? { can_view: true } : {}) }
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setFieldError('')

    if (!name.trim()) {
      setFieldError('Role name is required.')
      setSaving(false)
      return
    }

    try {
      const permissions = modules.map((module) => ({
        module_id: module.id,
        can_view: Boolean(module.can_view),
        can_create: Boolean(module.can_create),
        can_update: Boolean(module.can_update),
        can_delete: Boolean(module.can_delete),
      }))

      if (editing) {
        await updateSubAdminRole(subAdminRoleId, name)
        await updateRoleModulePermissions(subAdminRoleId, permissions)
      } else {
        await createSubAdminRole(name, permissions)
      }
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
          <div className="admin-form-head">
            <div>
              <h3>{editing ? 'Edit Role' : 'Add Role'}</h3>
              <p className="subtext">{editing ? 'Update the sub-admin role name.' : 'Create a role, then assign its accessible modules.'}</p>
            </div>
            {/* <Link to="/admin/role-permissions" className="ghost-btn">Back to Roles</Link> */}
          </div>
          {message && !fieldError ? <p className="status-message error">{message}</p> : null}
          {loading ? <TableLoader label="Loading role permissions..." /> : (
            <form className="admin-record-form" onSubmit={handleSubmit} noValidate>
              <div className="form-grid single-field-grid"><label><span className="field-label">Role Name <span className="required-mark">*</span></span><input value={name} onChange={(event) => { setName(event.target.value); setFieldError('') }} placeholder="For example: Marketing Manager" aria-invalid={Boolean(fieldError)} />{fieldError && <small className="field-error">{fieldError}</small>}</label></div>
              <div className="role-modules-section">
                  <div className="role-modules-head">
                    <h4>Module access</h4>
                    <p className="subtext">{editing ? 'Update role name and module access together on one page.' : 'Choose the module permissions for this role.'}</p>
                  </div>
                  <div className="table-wrap permission-table-wrap">
                    <table className="data-table permission-table">
                      <thead>
                        <tr>
                          <SortableHeader column="module" label="Module" sort={sort} onSort={requestSort} />
                          <SortableHeader column="view" label="View" sort={sort} onSort={requestSort} />
                          <SortableHeader column="create" label="Create" sort={sort} onSort={requestSort} />
                          <SortableHeader column="update" label="Update" sort={sort} onSort={requestSort} />
                          <SortableHeader column="delete" label="Delete" sort={sort} onSort={requestSort} />
                        </tr>
                      </thead>
                      <tbody>{sortedRows.map((module) => (
                        <tr key={module.id}>
                          <td><strong>{module.module_name}</strong></td>
                          <td><input type="checkbox" checked={Boolean(module.can_view)} onChange={(event) => setPermission(module.id, 'can_view', event.target.checked)} /></td>
                          <td>{module.module_name !== 'Transaction Management' && (<input type="checkbox" checked={Boolean(module.can_create)} onChange={(event) =>setPermission(module.id, 'can_create', event.target.checked)}/>)}</td>
                          <td>{module.module_name !== 'Transaction Management' && (<input type="checkbox" checked={Boolean(module.can_update)} onChange={(event) => setPermission(module.id, 'can_update', event.target.checked)}/>)}</td>
                          <td>{module.module_name !== 'Transaction Management' && (<input type="checkbox" checked={Boolean(module.can_delete)} onChange={(event) => setPermission(module.id, 'can_delete', event.target.checked)}/>)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              <div className="form-actions"><button type="submit" className="submit-btn admin-btn" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save' : 'Create Role'}</button><Link to="/admin/role-permissions" className="ghost-btn">Cancel</Link></div>
            </form>
          )}
        </article>
      </section>
    </section>
  )
}

export default RoleFormPage
