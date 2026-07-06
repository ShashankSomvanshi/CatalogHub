import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client.js'
import { fetchProducts, getProductCategoryName, getProductImage, getProductName } from '../../api/products.js'
import { isFullAdmin } from '../../api/access.js'
import { confirmDelete, showSuccess } from '../../utils/alerts.js'

function ProductManagementPage() {
  const canManageProducts = isFullAdmin()
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
    const query = searchTerm.trim().toLowerCase()
    if (!query) return products

    return products.filter((product) => (
      String(product.id || '').toLowerCase().includes(query) ||
      getProductName(product).toLowerCase().includes(query) ||
      getProductCategoryName(product).toLowerCase().includes(query) ||
      String(product.sku || '').toLowerCase().includes(query) ||
      String(product.status || '').toLowerCase().includes(query)
    ))
  }, [products, searchTerm])

  const totalProducts = filteredProducts.length
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = totalProducts === 0 ? 0 : (safeCurrentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalProducts)
  const productRows = filteredProducts.slice(startIndex, endIndex)

  const getStatusLabel = (status) => status || 'active'
  const handleImageError = (event) => {
    event.currentTarget.style.display = 'none'
    event.currentTarget.nextElementSibling?.removeAttribute('hidden')
  }

  const formatPrice = (price) => {
    const amount = Number(price || 0)

    return Number.isNaN(amount) ? price : amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
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
            <p className="subtext">Loading products...</p>
          ) : productRows.length === 0 ? (
            <p className="subtext text-center">No products found.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table product-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Price</th>
                    <th>SKU</th>
                    <th>Image</th>
                    <th>Status</th>
                    {canManageProducts ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {productRows.map((product, rowIndex) => (
                    <tr key={product.id}>
                      <td className="id-cell">{startIndex + rowIndex + 1}</td>
                      <td><strong>{getProductName(product)}</strong></td>
                      <td>{getProductCategoryName(product)}</td>
                      <td className="description-cell">{product.description || 'No description'}</td>
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
                      <td>
                        {canManageProducts ? (
                          <button type="button" role="switch" aria-checked={getStatusLabel(product.status) === 'active'} aria-label={`Mark ${getProductName(product)} as ${getStatusLabel(product.status) === 'active' ? 'inactive' : 'active'}`} className={`status-toggle ${getStatusLabel(product.status) === 'active' ? 'active' : ''}`} disabled={updatingStatusId === product.id} onClick={() => handleStatusToggle(product)}>
                            <span className="status-toggle-track"><span className="status-toggle-knob" /></span><span>{getStatusLabel(product.status)}</span>
                          </button>
                        ) : <span className={`status-badge ${getStatusLabel(product.status).toLowerCase()}`}>{getStatusLabel(product.status)}</span>}
                      </td>
                      {canManageProducts ? <td className="actions-cell">
                        <div className="action-btn-group">
                          <Link className="mini-btn edit-btn" to={`/admin/products/${product.id}/edit`}>
                            Edit
                          </Link>
                          <button type="button" className="mini-btn delete-btn" onClick={() => handleDelete(product.id)}>
                            Delete
                          </button>
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
