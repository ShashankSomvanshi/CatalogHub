import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStoredAdmin, hasPermission } from '../../api/access.js'
import { deleteSubAdminRole, fetchSubAdminRoles } from '../../api/roles.js'
import { confirmDelete, showSuccess } from '../../utils/alerts.js'
import SortableHeader from './SortableHeader.jsx'
import useSortableRows from './useSortableRows.js'
import { matchesTableSearch } from '../../utils/tableSearch.js'
import TableLoader from './TableLoader.jsx'

function RolePermissionManagementPage() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const storedAdmin = getStoredAdmin()
  const canUpdate = hasPermission('role_management', 'update', storedAdmin)
  const canDelete = hasPermission('role_management', 'delete', storedAdmin)
  const hasActions = canUpdate || canDelete

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
    return roles.filter((role) => matchesTableSearch([
      role.id,
      role.name,
      ...(role.modules || []).map((module) => module.module_name),
    ], searchTerm))
  }, [roles, searchTerm])

  const { sortedRows, sort, requestSort } = useSortableRows(filteredRoles, {
    id: (role) => Number(role.id),
    name: (role) => role.name,
    modules: (role) => (role.modules || []).map((module) => module.module_name).join(', '),
  }, 'name')

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
              <h3>Role Management</h3>
            </div>
            <div className="table-tools">
              <label className="table-search">Search<input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search roles" /></label>
            </div>
          </div>

          {message.text ? <p className={`status-message ${message.type}`}>{message.text}</p> : null}

          {loading ? (
            <TableLoader label="Loading role permissions..." />
          ) : sortedRows.length === 0 ? (
            <p className="subtext text-center">No sub-admin roles found.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table role-management-table">
                <thead><tr><SortableHeader column="id" label="S.No." sort={sort} onSort={requestSort} /><SortableHeader column="name" label="Sub Admin Role" sort={sort} onSort={requestSort} /><SortableHeader column="modules" label="Modules" sort={sort} onSort={requestSort} />{hasActions ? <th className='text-end'>Actions</th> : null}</tr></thead>
                <tbody>
                  {sortedRows.map((role, index) => (
                    <tr key={role.id}>
                      <td className="id-cell">{index + 1}</td>
                      <td><strong>{role.name}</strong></td>
                      <td className="description-cell">{permissionSummary(role)}</td>
                      {hasActions ? (
                        <td className="actions-cell"><div className="role-actions">{canUpdate ? <Link className="mini-btn edit-btn icon-action-btn" to={`/admin/role-permissions/${role.id}/edit`} aria-label={`Update ${role.name || 'role'}`} title="Update role and module access"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg></Link> : null}{canDelete ? <button className="mini-btn delete-btn icon-action-btn" type="button" onClick={() => handleDelete(role)} aria-label={`Delete ${role.name || 'role'}`} title="Delete role"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6" /></svg></button> : null}</div></td>
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
