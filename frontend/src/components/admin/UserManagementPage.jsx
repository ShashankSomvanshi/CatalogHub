import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client.js'
import { hasPermission } from '../../api/access.js'
import { fetchRoles, getRoleId, getRoleName } from '../../api/roles.js'
import { confirmDelete, showSuccess, showToast } from '../../utils/alerts.js'
import SortableHeader from './SortableHeader.jsx'
import useSortableRows from './useSortableRows.js'
import { matchesTableSearch } from '../../utils/tableSearch.js'
import TableLoader from './TableLoader.jsx'

function UserManagementPage() {
  const storedAdmin = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const canUpdateUsers = hasPermission('users', 'update', storedAdmin)
  const canDeleteUsers = hasPermission('users', 'delete', storedAdmin)
  const pageSizeOptions = [5, 10, 25]
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [roles, setRoles] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [updatingStatusId, setUpdatingStatusId] = useState(null)

  const normalizeUsers = (payload) => {
    const findUserArray = (value) => {
      if (Array.isArray(value)) {
        return value.some((item) => item && typeof item === 'object' && ('id' in item || 'name' in item || 'email' in item))
          ? value
          : null
      }

      if (!value || typeof value !== 'object') return null

      for (const key of ['users', 'data', 'items', 'result', 'records']) {
        const found = findUserArray(value[key])
        if (found) return found
      }

      return null
    }

    if (Array.isArray(payload)) return payload

    const direct = ['data', 'users', 'items', 'result', 'records']
      .map((key) => payload?.[key])
      .find((value) => Array.isArray(value))

    if (direct) return direct

    const nested = findUserArray(payload)
    if (nested) return nested

    return []
  }

  const fetchUsers = useCallback(async ({ showLoading = true, resetMessage = true } = {}) => {
    if (showLoading) {
      setLoading(true)
    }

    if (resetMessage) {
      setMessage({ type: '', text: '' })
    }

    try {
      const response = await api.get('/api/admin/users')
     

      const parsedUsers = normalizeUsers(response.data)
      setUsers(parsedUsers)
      setCurrentPage(1)

      if (parsedUsers.length === 0) {
        setMessage({ type: 'info', text: 'No users returned by the admin API yet.' })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Unable to load users.',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchUsers({ showLoading: false, resetMessage: false })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchUsers])

  useEffect(() => {
    let ignore = false

    const loadRoles = async () => {
      try {
        const loadedRoles = await fetchRoles()

        if (!ignore) {
          setRoles(loadedRoles)
        }
      } catch (error) {
        if (!ignore) {
          setMessage({
            type: 'error',
            text: error.response?.data?.message || 'Unable to load roles.',
          })
        }
      }
    }

    loadRoles()

    return () => {
      ignore = true
    }
  }, [])

  const handleDelete = async (userId) => {
    if (!await confirmDelete('user')) return

    setLoading(true)

    try {
      await api.delete(`/api/admin/users/${userId}`)
      await showSuccess('User deleted successfully')
      fetchUsers()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Delete failed.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusToggle = async (user) => {
    const nextStatus = getStatusLabel(user.status) === 'active' ? 'inactive' : 'active'
    setUpdatingStatusId(user.id)
    setMessage({ type: '', text: '' })

    try {
      await api.put(`/api/admin/users/${user.id}`, { status: nextStatus })
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status: nextStatus } : item))
      await showToast(`User marked ${nextStatus}.`)
    } catch (error) {
      await showToast(error.response?.data?.message || 'Unable to update user status.', 'error')
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchedRole = roles.find((role) => getRoleId(role) === String(user.role_id))
      const roleLabel = user.sub_role_name || user.role_name || user.role || (matchedRole ? getRoleName(matchedRole) : '')

      return matchesTableSearch([
        user.id,
        user.name,
        user.email,
        user.phone,
        user.phone_no,
        user.city,
        user.state,
        roleLabel,
        user.status,
        user.created_at,
      ], searchTerm)
    })
  }, [roles, searchTerm, users])

  const { sortedRows, sort, requestSort } = useSortableRows(filteredUsers, {
    serial: (user) => Number(user.id),
    user: (user) => user.name,
    contact: (user) => user.email,
    city: (user) => user.city,
    state: (user) => user.state,
    role: (user) => {
      const matchedRole = roles.find((role) => getRoleId(role) === String(user.role_id))
      return user.sub_role_name || user.role_name || user.role || (matchedRole ? getRoleName(matchedRole) : '')
    },
    created: (user) => new Date(user.created_at).getTime(),
  }, 'user')

  const totalUsers = sortedRows.length
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = totalUsers === 0 ? 0 : (safeCurrentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalUsers)

  const usersRows = useMemo(
    () => sortedRows.slice(startIndex, endIndex),
    [endIndex, sortedRows, startIndex],
  )

  const getRoleLabel = (user) => {
    const matchedRole = roles.find((role) => getRoleId(role) === String(user.role_id))

    return user.sub_role_name || user.role_name || user.role || (matchedRole ? getRoleName(matchedRole) : `Role ${user.role_id || ''}`.trim())
  }
  const getStatusLabel = (status) => status || 'active'
  const formatDate = (date) => {
    if (!date) return 'Not available'

    return new Intl.DateTimeFormat('en', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date))
  }

  return (
    <section className="dashboard-main-content admin-main-content">

      <section className="admin-data-section">
        <article className="panel-card data-panel-card">
          <div className="panel-head data-panel-head">
            <div>
              <h3>Users</h3>
            </div>

            <div className="table-tools">
              <label className="table-search">
                Search
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Search users"
                />
              </label>

              <label>
                Rows
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value))
                    setCurrentPage(1)
                  }}
                >
                  {pageSizeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {message.text ? <p className={`status-message ${message.type}`}>{message.text}</p> : null}

          {loading ? (
            <TableLoader label="Loading users..." />
          ) : usersRows.length === 0 ? (
            <p className="subtext text-center">No users match your search.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table user-table">
                <thead>
                  <tr>
                    <SortableHeader column="serial" label="S.No." sort={sort} onSort={requestSort} />
                    <SortableHeader column="user" label="User" sort={sort} onSort={requestSort} />
                    <SortableHeader column="contact" label="Contact" sort={sort} onSort={requestSort} />
                    <SortableHeader column="city" label="City" sort={sort} onSort={requestSort} />
                    <SortableHeader column="state" label="State" sort={sort} onSort={requestSort} />
                    <SortableHeader column="role" label="Role" sort={sort} onSort={requestSort} />
                    <SortableHeader column="created" label="Created" sort={sort} onSort={requestSort} />
                    <th className='text-center'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersRows.map((user, rowIndex) => (
                    <tr key={user.id}>
                      <td className="id-cell">{startIndex + rowIndex + 1}</td>
                      <td>
                        <div className="user-cell">
                          <div>
                            <strong>{user.name || 'Unnamed user'}</strong>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-cell">
                          <span>{user.email || 'No email'}</span>
                        </div>
                      </td>
                      <td>{user.city || '—'}</td>
                      <td>{user.state || '—'}</td>
                      <td><span className="role-badge">{getRoleLabel(user)}</span></td>
                      <td>{formatDate(user.created_at)}</td>
                      <td className="actions-cell">
                        <div className="action-btn-group user-action-group">
                          {canUpdateUsers ? (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={getStatusLabel(user.status) === 'active'}
                            aria-label={`Mark ${user.name || 'user'} as ${getStatusLabel(user.status) === 'active' ? 'inactive' : 'active'}`}
                            className={`status-toggle ${getStatusLabel(user.status) === 'active' ? 'active' : ''}`}
                            disabled={updatingStatusId === user.id}
                            onClick={() => handleStatusToggle(user)}
                          >
                            <span className="status-toggle-track"><span className="status-toggle-knob" /></span>
                            <span>{getStatusLabel(user.status)}</span>
                          </button>
                        ) : (
                          <span className={`status-badge ${getStatusLabel(user.status).toLowerCase()}`}>{getStatusLabel(user.status)}</span>
                        )}
                          {canUpdateUsers ? (
                            <Link className="mini-btn edit-btn icon-action-btn" to={`/admin/users/${user.id}/edit`} aria-label={`Update ${user.name || 'user'}`} title="Update user">
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
                            </Link>
                          ) : null}
                          {canDeleteUsers ? (
                            <button type="button" className="mini-btn delete-btn icon-action-btn" onClick={() => handleDelete(user.id)} aria-label={`Delete ${user.name || 'user'}`} title="Delete user">
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6" /></svg>
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="table-pagination">
                <p>
                  Showing <strong>{startIndex + 1}</strong>-<strong>{endIndex}</strong> of <strong>{totalUsers}</strong> users
                </p>

                <div className="pagination-actions">
                  <button
                    type="button"
                    className="mini-btn"
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </button>
                  <span>Page {safeCurrentPage} of {totalPages}</span>
                  <button
                    type="button"
                    className="mini-btn"
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </article>

      </section>
    </section>
  )
}

export default UserManagementPage
