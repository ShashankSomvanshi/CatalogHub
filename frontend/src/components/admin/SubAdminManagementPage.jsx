import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteSubAdmin, fetchSubAdmins } from '../../api/access.js'
import { confirmDelete, showSuccess } from '../../utils/alerts.js'

function SubAdminManagementPage() {
  const pageSizeOptions = [5, 10, 25]
  const [subAdmins, setSubAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadSubAdmins = useCallback(async ({ showLoading = true, resetMessage = true } = {}) => {
    if (showLoading) setLoading(true)
    if (resetMessage) setMessage({ type: '', text: '' })

    try {
      const loadedSubAdmins = await fetchSubAdmins()
      setSubAdmins(loadedSubAdmins)
      setCurrentPage(1)

      if (loadedSubAdmins.length === 0) {
        setMessage({ type: 'info', text: 'No sub admins returned by the admin API yet.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to load sub admins.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadSubAdmins({ showLoading: false, resetMessage: false })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadSubAdmins])

  const handleDelete = async (subAdminId) => {
    if (!await confirmDelete('sub admin')) return

    setLoading(true)

    try {
      await deleteSubAdmin(subAdminId)
      await showSuccess('Sub admin deleted successfully')
      loadSubAdmins()
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Delete failed.' })
    } finally {
      setLoading(false)
    }
  }

  const filteredSubAdmins = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return subAdmins

    return subAdmins.filter((subAdmin) => (
      String(subAdmin.id || '').toLowerCase().includes(query) ||
      String(subAdmin.name || '').toLowerCase().includes(query) ||
      String(subAdmin.email || '').toLowerCase().includes(query) ||
      String(subAdmin.phone_no || '').toLowerCase().includes(query) ||
      String(subAdmin.status || '').toLowerCase().includes(query)
    ))
  }, [searchTerm, subAdmins])

  const totalSubAdmins = filteredSubAdmins.length
  const totalPages = Math.max(1, Math.ceil(totalSubAdmins / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = totalSubAdmins === 0 ? 0 : (safeCurrentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalSubAdmins)
  const subAdminRows = filteredSubAdmins.slice(startIndex, endIndex)
  const getStatusLabel = (status) => status || 'active'

  return (
    <section className="dashboard-main-content admin-main-content">
      <section className="admin-data-section">
        <article className="panel-card data-panel-card">
          <div className="panel-head data-panel-head">
            <div>
              <p className="eyebrow">Database table</p>
              <h3>Sub Admins</h3>
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
                  placeholder="Search sub admins"
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
            <p className="subtext">Loading sub admins...</p>
          ) : subAdminRows.length === 0 ? (
            <p className="subtext text-center">No sub admins found.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Sub Admin</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subAdminRows.map((subAdmin) => (
                    <tr key={subAdmin.id}>
                      <td className="id-cell">#{subAdmin.id}</td>
                      <td><strong>{subAdmin.name || 'Unnamed sub admin'}</strong></td>
                      <td>
                        <div className="contact-cell">
                          <span>{subAdmin.email || 'No email'}</span>
                          <small>{subAdmin.phone_no || 'No phone'}</small>
                        </div>
                      </td>
                      <td><span className={`status-badge ${getStatusLabel(subAdmin.status).toLowerCase()}`}>{getStatusLabel(subAdmin.status)}</span></td>
                      <td className="actions-cell">
                        <div className="action-btn-group">
                          <Link className="mini-btn edit-btn" to={`/admin/sub-admins/${subAdmin.id}/edit`}>Edit</Link>
                          <button type="button" className="mini-btn delete-btn" onClick={() => handleDelete(subAdmin.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="table-pagination">
                <p>
                  Showing <strong>{startIndex + 1}</strong>-<strong>{endIndex}</strong> of <strong>{totalSubAdmins}</strong> sub admins
                </p>

                <div className="pagination-actions">
                  <button type="button" className="mini-btn" disabled={safeCurrentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                    Previous
                  </button>
                  <span>Page {safeCurrentPage} of {totalPages}</span>
                  <button type="button" className="mini-btn" disabled={safeCurrentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
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

export default SubAdminManagementPage
