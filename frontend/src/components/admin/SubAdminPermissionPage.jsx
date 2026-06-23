import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchRoleModulePermissions, updateRoleModulePermissions } from '../../api/access.js'
import { showSuccess } from '../../utils/alerts.js'

function SubAdminPermissionPage() {
  const { subAdminRoleId } = useParams()
  const [role, setRole] = useState(null)
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

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

  const setModuleSelected = (moduleId, selected) => {
    setModules((current) => current.map((module) => module.id === moduleId ? { ...module, selected } : module))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const moduleIds = modules.filter((module) => module.selected).map((module) => module.id)
      const data = await updateRoleModulePermissions(subAdminRoleId, moduleIds)
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

          {loading ? <p className="subtext">Loading modules...</p> : (
            <form onSubmit={handleSubmit}>
              <div className="table-wrap">
                <table className="data-table permission-table">
                  <thead><tr><th>Module</th><th>Access</th></tr></thead>
                  <tbody>{modules.map((module) => (
                    <tr key={module.id}>
                      <td><strong>{module.module_name}</strong></td>
                      <td><input type="checkbox" checked={Boolean(module.selected)} onChange={(event) => setModuleSelected(module.id, event.target.checked)} /></td>
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
