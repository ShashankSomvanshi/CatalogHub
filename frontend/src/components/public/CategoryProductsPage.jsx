import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProductsByCategory, formatProductPrice, getProductImage, getProductName } from '../../api/products.js'
import PublicHeader from './PublicHeader.jsx'

function getCartCount() {
  try {
    const cart = JSON.parse(localStorage.getItem('catalog_cart') || '[]')
    return Array.isArray(cart) ? cart.reduce((total, item) => total + Number(item.quantity || 1), 0) : 0
  } catch {
    return 0
  }
}

function CategoryProductsPage() {
  const { categoryId } = useParams()
  const [category, setCategory] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cartCount, setCartCount] = useState(getCartCount)

  useEffect(() => {
    let ignore = false
    fetchProductsByCategory(categoryId)
      .then((data) => {
        if (!ignore) {
          setCategory(data.category)
          setProducts(data.products)
        }
      })
      .catch((requestError) => {
        if (!ignore) setError(requestError.response?.data?.message || 'Unable to load this category.')
      })
      .finally(() => { if (!ignore) setLoading(false) })

    return () => { ignore = true }
  }, [categoryId])

  useEffect(() => {
    const updateCount = (event) => setCartCount(typeof event.detail?.count === 'number' ? event.detail.count : getCartCount())
    window.addEventListener('cart-updated', updateCount)
    window.addEventListener('storage', updateCount)
    return () => {
      window.removeEventListener('cart-updated', updateCount)
      window.removeEventListener('storage', updateCount)
    }
  }, [])

  const categoryName = category?.category_name || category?.name || 'Category'

  return (
    <div className="category-products-shell">
      <PublicHeader cartCount={cartCount} />

      <main className="category-products-main">
        <div className="category-products-breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/#catalog">Categories</Link><span>/</span><span>{categoryName}</span></div>
        <section className="category-products-heading"><div><p className="public-kicker">Browse the collection</p><h1>{categoryName}</h1><p>Explore all available products in this category.</p></div>{!loading && !error && <strong>{products.length} {products.length === 1 ? 'product' : 'products'}</strong>}</section>

        {loading ? (
          <div className="public-product-grid">{[1, 2, 3, 4].map((item) => <article className="public-product-card public-product-skeleton" key={item} />)}</div>
        ) : error ? (
          <section className="category-products-empty"><h2>Category unavailable</h2><p>{error}</p><Link to="/">Back to home</Link></section>
        ) : products.length ? (
          <div className="public-product-grid">{products.map((product) => <article className="public-product-card" key={product.id}><div className="public-product-image">{getProductImage(product) ? <Link to={`/products/${product.id}`}><img src={getProductImage(product)} alt={getProductName(product)} /></Link> : <span>No image available</span>}</div><div className="public-product-info"><span>SKU: {product.sku || 'N/A'}</span><h3><Link to={`/products/${product.id}`}>{getProductName(product)}</Link></h3><p>{product.description || 'View this product for more information.'}</p><div><strong>{formatProductPrice(product.price)}</strong><Link to={`/products/${product.id}`}>View details</Link></div></div></article>)}</div>
        ) : (
          <section className="category-products-empty"><h2>No products found</h2><p>There are currently no active products in {categoryName}.</p><Link to="/">Browse other categories</Link></section>
        )}
      </main>

      <footer className="product-detail-footer"><span>CatalogHub</span><p>Simple catalog shopping for modern customers.</p><span>&copy; 2026 CatalogHub</span></footer>
    </div>
  )
}

export default CategoryProductsPage
