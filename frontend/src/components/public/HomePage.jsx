import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import bannerOne from '../../assets/images/banner-1.webp'
import bannerTwo from '../../assets/images/banner-2.webp'
import bannerThree from '../../assets/images/banner-3.webp'
import bannerFour from '../../assets/images/banner-4.webp'
import { fetchPublicCategories } from '../../api/categories.js'
import { fetchPublicProducts, formatProductPrice, getProductCategoryName, getProductImage, getProductName } from '../../api/products.js'
import { fetchCart } from '../../api/cart.js'
import PublicHeader from './PublicHeader.jsx'

const banners = [bannerOne, bannerTwo, bannerThree, bannerFour]

function getStoredCartCount() {
  try {
    const cart = JSON.parse(localStorage.getItem('catalog_cart') || '[]')
    return Array.isArray(cart) ? cart.reduce((total, item) => total + Number(item.quantity || 1), 0) : 0
  } catch {
    return 0
  }
}

function CategoryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  )
}

function HomePage() {
  const [activeBanner, setActiveBanner] = useState(0)
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [cartCount, setCartCount] = useState(getStoredCartCount)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveBanner((current) => (current + 1) % banners.length)
    }, 5000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const updateCartCount = (event) => {
      setCartCount(typeof event.detail?.count === 'number' ? event.detail.count : getStoredCartCount())
    }
    window.addEventListener('cart-updated', updateCartCount)
    window.addEventListener('storage', updateCartCount)

    if (localStorage.getItem('auth_token')) {
      fetchCart().then((cart) => setCartCount(cart.item_count || 0)).catch(() => {})
    }

    return () => {
      window.removeEventListener('cart-updated', updateCartCount)
      window.removeEventListener('storage', updateCartCount)
    }
  }, [])

  useEffect(() => {
    let ignore = false

    fetchPublicProducts()
      .then((loadedProducts) => {
        if (!ignore) setProducts(loadedProducts)
      })
      .catch(() => {
        if (!ignore) setProducts([])
      })
      .finally(() => {
        if (!ignore) setProductsLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    fetchPublicCategories()
      .then((loadedCategories) => {
        if (!ignore) setCategories(loadedCategories)
      })
      .catch(() => {
        if (!ignore) setCategories([])
      })
      .finally(() => {
        if (!ignore) setCategoriesLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  const showPreviousBanner = () => {
    setActiveBanner((current) => (current - 1 + banners.length) % banners.length)
  }

  const showNextBanner = () => {
    setActiveBanner((current) => (current + 1) % banners.length)
  }

  return (
    <div className="public-home">
      <PublicHeader cartCount={cartCount} />

      <main>
        <section className="public-banner" id="home" aria-label="Featured offers">
          <div className="public-banner-track" style={{ transform: `translateX(-${activeBanner * 100}%)` }}>
            {banners.map((banner, index) => (
              <img key={banner} src={banner} alt={`Featured catalog offer ${index + 1}`} />
            ))}
          </div>

          <button className="public-banner-arrow previous" type="button" onClick={showPreviousBanner} aria-label="Show previous banner">&#8249;</button>
          <button className="public-banner-arrow next" type="button" onClick={showNextBanner} aria-label="Show next banner">&#8250;</button>

          <div className="public-banner-dots" aria-label="Choose banner">
            {banners.map((banner, index) => (
              <button key={banner} type="button" className={index === activeBanner ? 'active' : ''} onClick={() => setActiveBanner(index)} aria-label={`Show banner ${index + 1}`} aria-current={index === activeBanner ? 'true' : undefined} />
            ))}
          </div>
        </section>

        <section className="public-feature-section" id="catalog">
          <div className="public-section-heading">
            <p className="public-kicker">Shop by category</p>
            <h2>Featured Categories</h2>
          </div>
          <div className="public-feature-grid">
            {categoriesLoading ? (
              [1, 2, 3].map((item) => <article className="public-category-skeleton" key={item} aria-hidden="true" />)
            ) : categories.length ? categories.map((category, index) => (
              <article className="public-category-card" key={category.id}>
                <div className="public-category-card-top"><span>{String(index + 1).padStart(2, '0')}</span><span className="public-category-icon"><CategoryIcon /></span></div>
                <h3>{category.category_name || category.name}</h3>
                <p>Explore products selected for this category.</p>
                <Link className="public-category-link" to={`/categories/${category.id}/products`}>View products <span aria-hidden="true">&rarr;</span></Link>
              </article>
            )) : (
              <p className="public-empty-categories">Featured categories will appear here soon.</p>
            )}
          </div>
        </section>

        <section className="public-products-section" id="products">
          <div className="public-section-heading public-products-heading">
            <div><p className="public-kicker">Fresh from the catalog</p><h2>Featured Products</h2></div>
            <Link to="/products">View all products <span aria-hidden="true">&rarr;</span></Link>
          </div>

          <div className="public-product-grid">
            {productsLoading ? (
              [1, 2, 3, 4].map((item) => <article className="public-product-card public-product-skeleton" key={item} aria-hidden="true" />)
            ) : products.length ? products.map((product) => (
              <article className="public-product-card" key={product.id}>
                <div className="public-product-image">
                  {getProductImage(product) ? <Link to={`/products/${product.id}`}><img src={getProductImage(product)} alt={getProductName(product)} /></Link> : <span>No image available</span>}
                </div>
                <div className="public-product-info">
                  <span>{getProductCategoryName(product)}</span>
                  <h3><Link to={`/products/${product.id}`}>{getProductName(product)}</Link></h3>
                  <div><strong>{formatProductPrice(product.price)}</strong><Link to={`/products/${product.id}`}>View</Link></div>
                </div>
              </article>
            )) : (
              <p className="public-empty-categories">Featured products will appear here soon.</p>
            )}
          </div>
        </section>

        <section className="public-contact" id="contact">
          <div><p className="public-kicker">Contact us</p><h2>Ready to bring your catalog together?</h2></div>
          <div className="public-contact-actions">
            <a href="mailto:hello@cataloghub.com">hello@cataloghub.com</a>
            <Link to="/login">Get started</Link>
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <div className="public-footer-main">
          <div className="public-footer-brand">
            <Link className="public-logo public-footer-logo" to="/"><span className="public-logo-mark">C</span><span>Catalog<span>Hub</span></span></Link>
            <p>Simple catalog discovery and management for modern teams and growing businesses.</p>
          </div>

          <div className="public-footer-column">
            <h3>About</h3>
            <a href="#contact">Contact Us</a>
            <a href="#home">About CatalogHub</a>
            <a href="#catalog">Our Catalog</a>
            <Link to="/login">Careers</Link>
          </div>

          <div className="public-footer-column">
            <h3>Help</h3>
            <a href="mailto:hello@cataloghub.com">Support</a>
            <a href="#catalog">Catalog Guide</a>
            <Link to="/login">Account Access</Link>
            <a href="#contact">FAQ</a>
          </div>

          <div className="public-footer-column">
            <h3>Consumer Policy</h3>
            <a href="#home">Terms of Use</a>
            <a href="#home">Privacy</a>
            <a href="#home">Security</a>
            <a href="#home">Sitemap</a>
          </div>

          <div className="public-footer-address">
            <h3>Contact</h3>
            <p>CatalogHub Technologies</p>
            <p>Ambad MIDC, Nashik, Maharashtra</p>
            <p>India - 422010</p>
            <a href="mailto:hello@cataloghub.com">hello@cataloghub.com</a>
            <div className="public-social-links" aria-label="Social links">
              <a href="#home" aria-label="Facebook">f</a>
              <a href="#home" aria-label="X">X</a>
              <a href="#home" aria-label="Instagram">IG</a>
              <a href="#home" aria-label="YouTube">YT</a>
            </div>
          </div>
        </div>

        <div className="public-footer-bottom">
          <div className="public-footer-services">
            <span>Secure access</span>
            <span>Role management</span>
            <span>Help center</span>
          </div>
          <span>&copy; 2026 CatalogHub. All rights reserved.</span>
          <div className="public-payment-tags" aria-label="Supported payments"><span>VISA</span><span>MC</span><span>UPI</span><span>NET</span></div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage
