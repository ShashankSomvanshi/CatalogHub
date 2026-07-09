import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStoredAdmin, hasPermission } from '../../api/access.js'
import { deleteSubAdminRole, fetchSubAdminRolesPage } from '../../api/roles.js'
import { confirmDelete, showSuccess } from '../../utils/alerts.js'
import SortableHeader from './SortableHeader.jsx'
import useServerSort from './useServerSort.js'
import TableLoader from './TableLoader.jsx'

function RolePermissionManagementPage() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [meta, setMeta] = useState({ total: 0, last_page: 1, from: 0, to: 0 })
  const { sort, requestSort: changeSort } = useServerSort('name')
  const requestSort = (key) => { setCurrentPage(1); changeSort(key) }
  const storedAdmin = getStoredAdmin()
  const canCreate = hasPermission('role_management', 'create', storedAdmin)
  const canUpdate = hasPermission('role_management', 'update', storedAdmin)
  const canDelete = hasPermission('role_management', 'delete', storedAdmin)
  const hasActions = canUpdate || canDelete

  const loadRoles = useCallback(async () => {
    setLoading(true)
    try {
      const page = await fetchSubAdminRolesPage({ page: currentPage, per_page: pageSize, search: searchTerm, sort: sort.key, direction: sort.direction })
      setRoles(page.records)
      setMeta(page.meta)
      setMessage({ type: '', text: '' })
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to load role permissions.' })
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, searchTerm, sort.direction, sort.key])

  useEffect(() => {
    const timer = window.setTimeout(loadRoles, 300)
    return () => window.clearTimeout(timer)
  }, [loadRoles])

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
      await loadRoles()
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
            <div className="table-tools">
              <label>Rows<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1) }}><option value="5">5</option><option value="10">10</option><option value="25">25</option></select></label>
              <div className="table-tools-actions">
                <label className="table-search">Search<input type="search" value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setCurrentPage(1) }} placeholder="Search roles" /></label>
                {canCreate ? <Link to="/admin/role-permissions/new" className="ghost-btn table-add-btn">Add New Role</Link> : null}
              </div>
            </div>
          </div>

          {message.text ? <p className={`status-message ${message.type}`}>{message.text}</p> : null}

          {loading ? (
            <TableLoader label="Loading role permissions..." />
          ) : roles.length === 0 ? (
            <p className="subtext text-center">No sub-admin roles found.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table role-management-table">
                <thead><tr><SortableHeader column="id" label="S.No." sort={sort} onSort={requestSort} /><SortableHeader column="name" label="Sub Admin Role" sort={sort} onSort={requestSort} /><th>Modules</th>{hasActions ? <th className="actions-cell">Actions</th> : null}</tr></thead>
                <tbody>
                  {roles.map((role, index) => (
                    <tr key={role.id}>
                      <td className="id-cell">{(meta.from || 1) + index}</td>
                      <td><strong>{role.name}</strong></td>
                      <td className="description-cell">{permissionSummary(role)}</td>
                      {hasActions ? (
                        <td className="actions-cell"><div className="role-actions">{canUpdate ? <Link className="mini-btn edit-btn icon-action-btn" to={`/admin/role-permissions/${role.id}/edit`} aria-label={`Update ${role.name || 'role'}`} title="Update role and module access"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg></Link> : null}{canDelete ? <button className="mini-btn delete-btn icon-action-btn" type="button" onClick={() => handleDelete(role)} aria-label={`Delete ${role.name || 'role'}`} title="Delete role"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6" /></svg></button> : null}</div></td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="table-pagination">
                <p>Showing <strong>{meta.from || 0}</strong>-<strong>{meta.to || 0}</strong> of <strong>{meta.total || 0}</strong> roles</p>
                <div className="pagination-actions"><button type="button" className="mini-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Previous</button><span>Page {currentPage} of {meta.last_page || 1}</span><button type="button" className="mini-btn" disabled={currentPage >= (meta.last_page || 1)} onClick={() => setCurrentPage((page) => Math.min(meta.last_page || 1, page + 1))}>Next</button></div>
              </div>
            </div>
          )}
        </article>
      </section>
    </section>
  )
}

export default RolePermissionManagementPage
