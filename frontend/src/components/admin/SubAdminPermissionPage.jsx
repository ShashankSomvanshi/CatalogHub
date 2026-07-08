import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchRoleModulePermissions, updateRoleModulePermissions } from '../../api/access.js'
import { showSuccess } from '../../utils/alerts.js'
import SortableHeader from './SortableHeader.jsx'
import useSortableRows from './useSortableRows.js'
import TableLoader from './TableLoader.jsx'

function SubAdminPermissionPage() {
  const { subAdminRoleId } = useParams()
  const [role, setRole] = useState(null)
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const { sortedRows, sort, requestSort } = useSortableRows(modules, {
    module: (module) => module.module_name,
    view: (module) => Number(Boolean(module.can_view)),
    create: (module) => Number(Boolean(module.can_create)),
    update: (module) => Number(Boolean(module.can_update)),
    delete: (module) => Number(Boolean(module.can_delete)),
  }, 'module')

  useEffect(() => {
    let ignore = false

    fetchRoleModulePermissions(subAdminRoleId)
      .then((data) => {
        if (!ignore) {
          setRole(data.sub_admin_role)
          setModules(data.modules || [])
        }
      })
      .catch((error) => {
        if (!ignore) setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to load role permissions.' })
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [subAdminRoleId])

  const setPermission = (moduleId, key, value) => {
    setModules((current) => current.map((module) => module.id === moduleId ? { ...module, [key]: value } : module))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const permissions = modules.map((module) => ({
        module_id: module.id,
        can_view: Boolean(module.can_view),
        can_create: Boolean(module.can_create),
        can_update: Boolean(module.can_update),
        can_delete: Boolean(module.can_delete),
      }))

      const data = await updateRoleModulePermissions(subAdminRoleId, permissions)
      setModules(data.modules || modules)
      await showSuccess(data.message || 'Role permissions updated successfully')
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to update role permissions.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="dashboard-main-content admin-main-content">
      <section className="admin-data-section">
        <article className="panel-card data-panel-card">
          <div className="panel-head data-panel-head">
            <div><p className="eyebrow">Access management</p><h3>{role ? `Modules for ${role.name}` : 'Role modules'}</h3></div>
            <Link to="/admin/role-permissions" className="ghost-btn">Back</Link>
          </div>

          {message.text ? <p className={`status-message ${message.type}`}>{message.text}</p> : null}

          {loading ? <TableLoader label="Loading permission modules..." /> : (
            <form onSubmit={handleSubmit}>
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
                      <td><input type="checkbox" checked={Boolean(module.can_create)} onChange={(event) => setPermission(module.id, 'can_create', event.target.checked)} /></td>
                      <td><input type="checkbox" checked={Boolean(module.can_update)} onChange={(event) => setPermission(module.id, 'can_update', event.target.checked)} /></td>
                      <td><input type="checkbox" checked={Boolean(module.can_delete)} onChange={(event) => setPermission(module.id, 'can_delete', event.target.checked)} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="form-actions permission-actions"><button type="submit" className="submit-btn admin-btn" disabled={saving}>{saving ? 'Saving...' : 'Save permissions'}</button></div>
            </form>
          )}
        </article>
      </section>
    </section>
  )
}

export default SubAdminPermissionPage
