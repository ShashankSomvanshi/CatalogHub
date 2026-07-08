import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client.js'
import { fetchCategories } from '../../api/categories.js'
import { hasPermission } from '../../api/access.js'
import { confirmDelete, showSuccess } from '../../utils/alerts.js'
import SortableHeader from './SortableHeader.jsx'
import useSortableRows from './useSortableRows.js'
import { matchesTableSearch } from '../../utils/tableSearch.js'
import TableLoader from './TableLoader.jsx'

function CategoryManagementPage() {
  const storedAdmin = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const canUpdateCategories = hasPermission('categories', 'update', storedAdmin)
  const canDeleteCategories = hasPermission('categories', 'delete', storedAdmin)
  const pageSizeOptions = [5, 10, 25]
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [updatingStatusId, setUpdatingStatusId] = useState(null)

  const loadCategories = useCallback(async ({ showLoading = true, resetMessage = true } = {}) => {
    if (showLoading) setLoading(true)
    if (resetMessage) setMessage({ type: '', text: '' })

    try {
      const loadedCategories = await fetchCategories()
      setCategories(loadedCategories)
      setCurrentPage(1)

      if (loadedCategories.length === 0) {
        setMessage({ type: 'info', text: 'No categories returned by the admin API yet.' })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Unable to load categories.',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCategories({ showLoading: false, resetMessage: false })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadCategories])

  const handleDelete = async (categoryId) => {
    if (!await confirmDelete('category')) return

    setLoading(true)

    try {
      await api.delete(`/api/admin/categories/${categoryId}`)
      await showSuccess('Category deleted successfully')
      loadCategories()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Delete failed.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusToggle = async (category) => {
    const nextStatus = getStatusLabel(category.status) === 'active' ? 'inactive' : 'active'
    setUpdatingStatusId(category.id)
    setMessage({ type: '', text: '' })

    try {
      await api.put(`/api/admin/categories/${category.id}`, { status: nextStatus })
      setCategories((current) => current.map((item) => item.id === category.id ? { ...item, status: nextStatus } : item))
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to update category status.' })
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => matchesTableSearch([
      category.id,
      category.name || category.category_name,
      category.status,
      category.created_at,
    ], searchTerm))
  }, [categories, searchTerm])

  const { sortedRows, sort, requestSort } = useSortableRows(filteredCategories, {
    id: (category) => Number(category.id),
    name: (category) => category.name || category.category_name,
    created: (category) => new Date(category.created_at).getTime(),
  }, 'name')

  const totalCategories = sortedRows.length
  const totalPages = Math.max(1, Math.ceil(totalCategories / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = totalCategories === 0 ? 0 : (safeCurrentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalCategories)

  const categoryRows = useMemo(
    () => sortedRows.slice(startIndex, endIndex),
    [endIndex, sortedRows, startIndex],
  )

  const getCategoryName = (category) => category.name || category.category_name || 'Unnamed category'
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
              <h3>Categories</h3>
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
                  placeholder="Search categories"
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
            <TableLoader label="Loading categories..." />
          ) : categoryRows.length === 0 ? (
            <p className="subtext text-center">No categories found.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table category-table">
                <thead>
                  <tr>
                    <SortableHeader column="id" label="ID" sort={sort} onSort={requestSort} />
                    <SortableHeader column="name" label="Name" sort={sort} onSort={requestSort} />
                    <SortableHeader column="created" label="Created" sort={sort} onSort={requestSort} />
                    {canUpdateCategories || canDeleteCategories ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {categoryRows.map((category, rowIndex) => (
                    <tr key={category.id}>
                      <td className="id-cell">{startIndex + rowIndex + 1}</td>
                      <td>
                        <div className="user-cell">
                          <div>
                            <strong>{getCategoryName(category)}</strong>
                            
                          </div>
                        </div>
                      </td>
                      <td>{formatDate(category.created_at)}</td>
                      {(canUpdateCategories || canDeleteCategories) ? <td className="actions-cell">
                        <div className="action-btn-group user-action-group category-action-group">
                          {canUpdateCategories ? (
                            <button type="button" role="switch" aria-checked={getStatusLabel(category.status) === 'active'} aria-label={`Mark ${getCategoryName(category)} as ${getStatusLabel(category.status) === 'active' ? 'inactive' : 'active'}`} className={`status-toggle ${getStatusLabel(category.status) === 'active' ? 'active' : ''}`} disabled={updatingStatusId === category.id} onClick={() => handleStatusToggle(category)}>
                              <span className="status-toggle-track"><span className="status-toggle-knob" /></span><span>{getStatusLabel(category.status)}</span>
                            </button>
                          ) : (
                            <span className={`status-badge ${getStatusLabel(category.status).toLowerCase()}`}>{getStatusLabel(category.status)}</span>
                          )}
                          {canUpdateCategories ? (
                            <Link className="mini-btn edit-btn icon-action-btn" to={`/admin/categories/${category.id}/edit`} aria-label={`Update ${getCategoryName(category)}`} title="Update category">
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
                            </Link>
                          ) : null}
                          {canDeleteCategories ? (
                            <button type="button" className="mini-btn delete-btn icon-action-btn" onClick={() => handleDelete(category.id)} aria-label={`Delete ${getCategoryName(category)}`} title="Delete category">
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6" /></svg>
                            </button>
                          ) : null}
                        </div>
                      </td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="table-pagination">
                <p>
                  Showing <strong>{startIndex + 1}</strong>-<strong>{endIndex}</strong> of <strong>{totalCategories}</strong> categories
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

export default CategoryManagementPage
