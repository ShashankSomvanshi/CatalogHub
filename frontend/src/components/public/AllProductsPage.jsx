import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCart } from '../../api/cart.js'
import { fetchAllPublicProducts, formatProductPrice, getProductCategoryName, getProductImage, getProductName } from '../../api/products.js'
import PublicHeader from './PublicHeader.jsx'

function guestCartCount() {
  try {
    const items = JSON.parse(localStorage.getItem('catalog_cart') || '[]')
    return Array.isArray(items) ? items.reduce((total, item) => total + Number(item.quantity || 1), 0) : 0
  } catch { return 0 }
}

function AllProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [cartCount, setCartCount] = useState(guestCartCount)

  useEffect(() => {
    fetchAllPublicProducts()
      .then(setProducts)
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load products.'))
      .finally(() => setLoading(false))

    if (localStorage.getItem('auth_token')) fetchCart().then((cart) => setCartCount(cart.item_count || 0)).catch(() => {})
  }, [])

  useEffect(() => {
    const update = (event) => setCartCount(typeof event.detail?.count === 'number' ? event.detail.count : guestCartCount())
    window.addEventListener('cart-updated', update)
    window.addEventListener('storage', update)
    return () => { window.removeEventListener('cart-updated', update); window.removeEventListener('storage', update) }
  }, [])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return products
    return products.filter((product) => `${getProductName(product)} ${getProductCategoryName(product)} ${product.sku || ''}`.toLowerCase().includes(query))
  }, [products, search])

  return <div className="category-products-shell all-products-shell"><PublicHeader cartCount={cartCount} /><main className="category-products-main"><div className="category-products-breadcrumb"><Link to="/">Home</Link><span>/</span><span>All Products</span></div><section className="category-products-heading all-products-heading"><div><p className="public-kicker">Complete catalog</p><h1>All Products</h1><p>Browse every active product available on CatalogHub.</p></div>{!loading && !error && <strong>{filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}</strong>}</section><div className="all-products-tools"><label>Search products<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by product, category or SKU" /></label></div>{loading ? <div className="public-product-grid">{[1, 2, 3, 4].map((item) => <article className="public-product-card public-product-skeleton" key={item} />)}</div> : error ? <section className="category-products-empty"><h2>Products unavailable</h2><p>{error}</p><Link to="/">Back to home</Link></section> : filteredProducts.length ? <div className="public-product-grid">{filteredProducts.map((product) => <article className="public-product-card" key={product.id}><div className="public-product-image">{getProductImage(product) ? <Link to={`/products/${product.id}`}><img src={getProductImage(product)} alt={getProductName(product)} /></Link> : <span>No image available</span>}</div><div className="public-product-info"><span>{getProductCategoryName(product)} | SKU: {product.sku || 'N/A'}</span><h3><Link to={`/products/${product.id}`}>{getProductName(product)}</Link></h3><p>{product.description || 'View this product for more information.'}</p><div><strong>{formatProductPrice(product.price)}</strong><Link to={`/products/${product.id}`}>View details</Link></div></div></article>)}</div> : <section className="category-products-empty"><h2>No products found</h2><p>Try a different search term.</p></section>}</main><footer className="product-detail-footer"><span>CatalogHub</span><p>Explore the complete catalog.</p><span>&copy; 2026 CatalogHub</span></footer></div>
}

export default AllProductsPage
