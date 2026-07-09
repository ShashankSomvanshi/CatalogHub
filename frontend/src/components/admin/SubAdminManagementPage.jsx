import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteSubAdmin, fetchSubAdmins } from '../../api/access.js'
import { confirmDelete, showSuccess } from '../../utils/alerts.js'
import SortableHeader from './SortableHeader.jsx'
import useServerSort from './useServerSort.js'
import TableLoader from './TableLoader.jsx'

function SubAdminManagementPage() {
  const pageSizeOptions = [5, 10, 25]
  const [subAdmins, setSubAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [meta, setMeta] = useState({ total: 0, last_page: 1, from: 0, to: 0 })
  const { sort, requestSort: changeSort } = useServerSort('name')
  const requestSort = (key) => { setCurrentPage(1); changeSort(key) }

  const loadSubAdmins = useCallback(async ({ showLoading = true, resetMessage = true } = {}) => {
    if (showLoading) setLoading(true)
    if (resetMessage) setMessage({ type: '', text: '' })

    try {
      const page = await fetchSubAdmins({ page: currentPage, per_page: pageSize, search: searchTerm, sort: sort.key, direction: sort.direction })
      setSubAdmins(page.records)
      setMeta(page.meta)

      if (page.records.length === 0) {
        setMessage({ type: 'info', text: 'No sub admins returned by the admin API yet.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to load sub admins.' })
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, searchTerm, sort.direction, sort.key])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadSubAdmins()
    }, 300)

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

  const totalSubAdmins = meta.total || 0
  const totalPages = meta.last_page || 1
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = meta.from ? meta.from - 1 : 0
  const endIndex = meta.to || 0
  const subAdminRows = subAdmins
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
            <TableLoader label="Loading sub-admins..." />
          ) : subAdminRows.length === 0 ? (
            <p className="subtext text-center">No sub admins found.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table sub-admin-table">
                <thead>
                  <tr>
                    <SortableHeader column="id" label="ID" sort={sort} onSort={requestSort} />
                    <SortableHeader column="name" label="Sub Admin" sort={sort} onSort={requestSort} />
                    <SortableHeader column="contact" label="Contact" sort={sort} onSort={requestSort} />
                    <SortableHeader column="status" label="Status" sort={sort} onSort={requestSort} />
                    <th className="actions-cell">Actions</th>
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
                          <Link className="mini-btn edit-btn icon-action-btn" to={`/admin/sub-admins/${subAdmin.id}/edit`} aria-label={`Update ${subAdmin.name || 'sub admin'}`} title="Update sub admin"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg></Link>
                          <button type="button" className="mini-btn delete-btn icon-action-btn" onClick={() => handleDelete(subAdmin.id)} aria-label={`Delete ${subAdmin.name || 'sub admin'}`} title="Delete sub admin"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6" /></svg></button>
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
