import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { isFullAdmin } from '../../api/access.js'
import { deleteSubAdminRole, fetchSubAdminRoles } from '../../api/roles.js'
import { confirmDelete, showSuccess } from '../../utils/alerts.js'

function RolePermissionManagementPage() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const canAssign = isFullAdmin()

  useEffect(() => {
    let ignore = false

    fetchSubAdminRoles()
      .then((loadedRoles) => {
        if (!ignore) setRoles(loadedRoles)
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
  }, [])

  const filteredRoles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return roles

    return roles.filter((role) => String(role.name || '').toLowerCase().includes(query))
  }, [roles, searchTerm])

  const permissionSummary = (role) => {
    const modules = role.modules || []

    return modules.length
      ? modules.map((module) => module.module_name).join(', ')
      : 'No modules assigned'
  }

  const handleDelete = async (role) => {
    if (!await confirmDelete(`${role.name} role`)) return
    setMessage({ type: '', text: '' })
    try {
      await deleteSubAdminRole(role.id)
      setRoles((current) => current.filter((item) => String(item.id) !== String(role.id)))
      await showSuccess('Role deleted successfully')
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to delete this role.' })
    }
  }

  return (
    <section className="dashboard-main-content admin-main-content">
      <section className="admin-data-section">
        <article className="panel-card data-panel-card">
          <div className="panel-head data-panel-head">
            <div>
              <p className="eyebrow">Access management</p>
              <h3>Role Management</h3>
            </div>
            <div className="table-tools">
              <label className="table-search">Search<input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search roles" /></label>
            </div>
          </div>

          {message.text ? <p className={`status-message ${message.type}`}>{message.text}</p> : null}

          {loading ? (
            <p className="subtext">Loading role permissions...</p>
          ) : filteredRoles.length === 0 ? (
            <p className="subtext text-center">No sub-admin roles found.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table role-management-table">
                <thead><tr><th>S.No.</th><th>Sub Admin Role</th><th>Modules</th>{canAssign ? <th>Actions</th> : null}</tr></thead>
                <tbody>
                  {filteredRoles.map((role, index) => (
                    <tr key={role.id}>
                      <td className="id-cell">{index + 1}</td>
                      <td><strong>{role.name}</strong></td>
                      <td className="description-cell">{permissionSummary(role)}</td>
                      {canAssign ? (
                        <td className="actions-cell"><div className="role-actions"><Link className="mini-btn edit-btn" to={`/admin/role-permissions/${role.id}`}>Assign Modules</Link><Link className="mini-btn edit-btn" to={`/admin/role-permissions/${role.id}/edit`}>Edit</Link><button className="mini-btn delete-btn" type="button" onClick={() => handleDelete(role)}>Delete</button></div></td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </section>
  )
}

export default RolePermissionManagementPage
