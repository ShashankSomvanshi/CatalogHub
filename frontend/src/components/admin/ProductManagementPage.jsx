import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client.js'
import { fetchProducts, getProductCategoryName, getProductImage, getProductName } from '../../api/products.js'
import { hasPermission } from '../../api/access.js'
import { confirmDelete, showSuccess } from '../../utils/alerts.js'
import SortableHeader from './SortableHeader.jsx'
import useSortableRows from './useSortableRows.js'
import { matchesTableSearch } from '../../utils/tableSearch.js'
import TableLoader from './TableLoader.jsx'

function ProductManagementPage() {
  const storedAdmin = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const canUpdateProducts = hasPermission('products', 'update', storedAdmin)
  const canDeleteProducts = hasPermission('products', 'delete', storedAdmin)
  const pageSizeOptions = [5, 10, 25]
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [updatingStatusId, setUpdatingStatusId] = useState(null)

  const loadProducts = useCallback(async ({ showLoading = true, resetMessage = true } = {}) => {
    if (showLoading) setLoading(true)
    if (resetMessage) setMessage({ type: '', text: '' })

    try {
      const loadedProducts = await fetchProducts()
      setProducts(loadedProducts)
      setCurrentPage(1)

      if (loadedProducts.length === 0) {
        setMessage({ type: 'info', text: 'No products returned by the admin API yet.' })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Unable to load products.',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadProducts({ showLoading: false, resetMessage: false })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadProducts])

  const handleDelete = async (productId) => {
    if (!await confirmDelete('product')) return

    setLoading(true)

    try {
      await api.delete(`/api/admin/products/${productId}`)
      await showSuccess('Product deleted successfully')
      loadProducts()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Delete failed.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusToggle = async (product) => {
    const nextStatus = getStatusLabel(product.status) === 'active' ? 'inactive' : 'active'
    setUpdatingStatusId(product.id)
    setMessage({ type: '', text: '' })

    try {
      await api.put(`/api/admin/products/${product.id}`, { status: nextStatus })
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, status: nextStatus } : item))
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to update product status.' })
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => matchesTableSearch([
      product.id,
      getProductName(product),
      getProductCategoryName(product),
      product.description,
      product.price,
      product.sku,
      product.status,
    ], searchTerm))
  }, [products, searchTerm])

  const { sortedRows, sort, requestSort } = useSortableRows(filteredProducts, {
    id: (product) => Number(product.id),
    product: (product) => getProductName(product),
    category: (product) => getProductCategoryName(product),
    description: (product) => product.description,
    price: (product) => Number(product.price),
    sku: (product) => product.sku,
  }, 'product')

  const totalProducts = sortedRows.length
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = totalProducts === 0 ? 0 : (safeCurrentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalProducts)
  const productRows = sortedRows.slice(startIndex, endIndex)

  const getStatusLabel = (status) => status || 'active'
  const handleImageError = (event) => {
    event.currentTarget.style.display = 'none'
    event.currentTarget.nextElementSibling?.removeAttribute('hidden')
  }

  const formatPrice = (price) => {
    const amount = Number(price || 0)

    return Number.isNaN(amount) ? price : amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
  }

  const getDescriptionPreview = (description) => {
    const plainText = String(description || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!plainText) return 'No description'

    return plainText.length > 120 ? `${plainText.slice(0, 117)}...` : plainText
  }

  return (
    <section className="dashboard-main-content admin-main-content">
      <section className="admin-data-section">
        <article className="panel-card data-panel-card">
          <div className="panel-head data-panel-head">
            <div>
              <h3>Products</h3>
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
                  placeholder="Search products"
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
            <TableLoader label="Loading products..." />
          ) : productRows.length === 0 ? (
            <p className="subtext text-center">No products found.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table product-table">
                <thead>
                  <tr>
                    <SortableHeader column="id" label="ID" sort={sort} onSort={requestSort} />
                    <SortableHeader column="product" label="Product" sort={sort} onSort={requestSort} />
                    <SortableHeader column="category" label="Category" sort={sort} onSort={requestSort} />
                    <SortableHeader column="description" label="Description" sort={sort} onSort={requestSort} />
                    <SortableHeader column="price" label="Price" sort={sort} onSort={requestSort} />
                    <SortableHeader column="sku" label="SKU" sort={sort} onSort={requestSort} />
                    <th>Image</th>
                    {(canUpdateProducts || canDeleteProducts) ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {productRows.map((product, rowIndex) => (
                    <tr key={product.id}>
                      <td className="id-cell">{startIndex + rowIndex + 1}</td>
                      <td><strong>{getProductName(product)}</strong></td>
                      <td>{getProductCategoryName(product)}</td>
                      <td className="description-cell">{getDescriptionPreview(product.description)}</td>
                      <td>{formatPrice(product.price)}</td>
                      <td>{product.sku || 'No SKU'}</td>
                      <td>
                        {getProductImage(product) ? (
                          <>
                            <img className="product-thumb" src={getProductImage(product)} alt={getProductName(product)} onError={handleImageError} />
                            <span className="subtext" hidden>No image</span>
                          </>
                        ) : (
                          <span className="subtext">No image</span>
                        )}
                      </td>
                      {(canUpdateProducts || canDeleteProducts) ? <td className="actions-cell">
                        <div className="action-btn-group user-action-group">
                          {canUpdateProducts ? (
                            <button type="button" role="switch" aria-checked={getStatusLabel(product.status) === 'active'} aria-label={`Mark ${getProductName(product)} as ${getStatusLabel(product.status) === 'active' ? 'inactive' : 'active'}`} className={`status-toggle ${getStatusLabel(product.status) === 'active' ? 'active' : ''}`} disabled={updatingStatusId === product.id} onClick={() => handleStatusToggle(product)}>
                              <span className="status-toggle-track"><span className="status-toggle-knob" /></span><span>{getStatusLabel(product.status)}</span>
                            </button>
                          ) : (
                            <span className={`status-badge ${getStatusLabel(product.status).toLowerCase()}`}>{getStatusLabel(product.status)}</span>
                          )}
                          {canUpdateProducts ? (
                            <Link className="mini-btn edit-btn icon-action-btn" to={`/admin/products/${product.id}/edit`} aria-label={`Update ${getProductName(product)}`} title="Update product">
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
                            </Link>
                          ) : null}
                          {canDeleteProducts ? (
                            <button type="button" className="mini-btn delete-btn icon-action-btn" onClick={() => handleDelete(product.id)} aria-label={`Delete ${getProductName(product)}`} title="Delete product">
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
                  Showing <strong>{startIndex + 1}</strong>-<strong>{endIndex}</strong> of <strong>{totalProducts}</strong> products
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

export default ProductManagementPage
