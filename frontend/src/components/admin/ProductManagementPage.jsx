import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client.js'
import { fetchProductsPage, getProductCategoryName, getProductImage, getProductName } from '../../api/products.js'
import { hasPermission } from '../../api/access.js'
import { confirmDelete, showSuccess } from '../../utils/alerts.js'
import SortableHeader from './SortableHeader.jsx'
import useServerSort from './useServerSort.js'
import TableLoader from './TableLoader.jsx'

function ProductManagementPage() {
  const storedAdmin = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const canCreateProducts = hasPermission('products', 'create', storedAdmin)
  const canUpdateProducts = hasPermission('products', 'update', storedAdmin)
  const canDeleteProducts = hasPermission('products', 'delete', storedAdmin)
  const pageSizeOptions = [5, 10, 25]
  const [searchParams, setSearchParams] = useSearchParams()
  const readPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
  }
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [productFilterInput, setProductFilterInput] = useState(() => searchParams.get('product_search') || '')
  const [categoryFilterInput, setCategoryFilterInput] = useState(() => searchParams.get('category_search') || '')
  const [skuFilterInput, setSkuFilterInput] = useState(() => searchParams.get('sku_search') || '')
  const [productSearch, setProductSearch] = useState(() => searchParams.get('product_search') || '')
  const [categorySearch, setCategorySearch] = useState(() => searchParams.get('category_search') || '')
  const [skuSearch, setSkuSearch] = useState(() => searchParams.get('sku_search') || '')
  const [currentPage, setCurrentPage] = useState(() => readPositiveInt(searchParams.get('page'), 1))
  const [pageSize, setPageSize] = useState(() => {
    const requestedSize = readPositiveInt(searchParams.get('per_page'), 10)
    return pageSizeOptions.includes(requestedSize) ? requestedSize : 10
  })
  const [updatingStatusId, setUpdatingStatusId] = useState(null)
  const [meta, setMeta] = useState({ total: 0, last_page: 1, from: 0, to: 0 })
  const { sort, requestSort } = useServerSort(searchParams.get('sort') || 'product', searchParams.get('direction') === 'desc' ? 'desc' : 'asc')

  const loadProducts = useCallback(async ({ showLoading = true, resetMessage = true } = {}) => {
    if (showLoading) setLoading(true)
    if (resetMessage) setMessage({ type: '', text: '' })

    try {
      const page = await fetchProductsPage({
        page: currentPage,
        per_page: pageSize,
        product_search: productSearch,
        category_search: categorySearch,
        sku_search: skuSearch,
        sort: sort.key,
        direction: sort.direction,
      })
      setProducts(page.records)
      setMeta(page.meta)

      if (page.records.length === 0) {
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
  }, [categorySearch, currentPage, pageSize, productSearch, skuSearch, sort.direction, sort.key])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadProducts()
    }, 300)

    return () => window.clearTimeout(timer)
  }, [loadProducts])

  useEffect(() => {
    const nextParams = new URLSearchParams()
    if (currentPage > 1) nextParams.set('page', String(currentPage))
    if (pageSize !== 10) nextParams.set('per_page', String(pageSize))
    if (productSearch) nextParams.set('product_search', productSearch)
    if (categorySearch) nextParams.set('category_search', categorySearch)
    if (skuSearch) nextParams.set('sku_search', skuSearch)
    if (sort.key !== 'product') nextParams.set('sort', sort.key)
    if (sort.direction !== 'asc') nextParams.set('direction', sort.direction)
    setSearchParams(nextParams, { replace: true })
  }, [categorySearch, currentPage, pageSize, productSearch, setSearchParams, skuSearch, sort.direction, sort.key])

  const handleSearch = () => {
    setProductSearch(productFilterInput.trim())
    setCategorySearch(categoryFilterInput.trim())
    setSkuSearch(skuFilterInput.trim())
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setProductFilterInput('')
    setCategoryFilterInput('')
    setSkuFilterInput('')
    setProductSearch('')
    setCategorySearch('')
    setSkuSearch('')
    setCurrentPage(1)
  }

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

  const totalProducts = meta.total || 0
  const totalPages = meta.last_page || 1
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = meta.from ? meta.from - 1 : 0
  const endIndex = meta.to || 0
  const productRows = products
  const listSearchParams = new URLSearchParams()
  if (currentPage > 1) listSearchParams.set('page', String(currentPage))
  if (pageSize !== 10) listSearchParams.set('per_page', String(pageSize))
  if (productSearch) listSearchParams.set('product_search', productSearch)
  if (categorySearch) listSearchParams.set('category_search', categorySearch)
  if (skuSearch) listSearchParams.set('sku_search', skuSearch)
  if (sort.key !== 'product') listSearchParams.set('sort', sort.key)
  if (sort.direction !== 'asc') listSearchParams.set('direction', sort.direction)
  const listQuery = listSearchParams.toString()
  const productsReturnPath = `/admin/products${listQuery ? `?${listQuery}` : ''}`

  const getStatusLabel = (status) => status || 'active'
  const handleImageError = (event) => {
    event.currentTarget.style.display = 'none'
    event.currentTarget.nextElementSibling?.removeAttribute('hidden')
  }

  const formatPrice = (price) => {
    const amount = Number(price || 0)

    return Number.isNaN(amount) ? price : amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
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
            <div className="table-tools">
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

              <div className="table-tools-actions product-filter-tools">
                <label className="table-search" aria-label="Search product">
                  <input
                    type="search"
                    value={productFilterInput}
                    onChange={(event) => setProductFilterInput(event.target.value)}
                    placeholder="Search Product"
                  />
                </label>

                <label className="table-search" aria-label="Search category">
                  <input
                    type="search"
                    value={categoryFilterInput}
                    onChange={(event) => setCategoryFilterInput(event.target.value)}
                    placeholder="Search Category"
                  />
                </label>

                <label className="table-search" aria-label="Search SKU">
                  <input
                    type="search"
                    value={skuFilterInput}
                    onChange={(event) => setSkuFilterInput(event.target.value)}
                    placeholder="Search SKU"
                  />
                </label>

                <button type="button" className="mini-btn table-filter-btn table-filter-search-btn" onClick={handleSearch}>Search</button>
                <button type="button" className="mini-btn table-filter-btn" onClick={handleClearFilters}>Clear</button>

                {canCreateProducts ? <Link to="/admin/products/new" className="ghost-btn table-add-btn">Add Product</Link> : null}
              </div>
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
                    {(canUpdateProducts || canDeleteProducts) ? <th className="actions-cell">Actions</th> : null}
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
                            <Link className="mini-btn edit-btn icon-action-btn" to={`/admin/products/${product.id}/edit?returnTo=${encodeURIComponent(productsReturnPath)}`} state={{ returnTo: productsReturnPath }} aria-label={`Update ${getProductName(product)}`} title="Update product">
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
