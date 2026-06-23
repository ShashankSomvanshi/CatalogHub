import { Link } from 'react-router-dom'
import PublicHeader from './PublicHeader.jsx'
import PublicFooter from './PublicFooter.jsx'

function AboutPage() {
  return <div className="public-info-shell"><PublicHeader /><main className="public-info-main"><section className="about-hero"><div><p className="public-kicker">About CatalogHub</p><h1>A simpler way to discover and manage products.</h1><p>CatalogHub brings categories, products, customer accounts, carts, and orders into one clear experience for shoppers and growing teams.</p><div className="about-actions"><Link to="/products">Explore products</Link><Link to="/contact">Talk to us</Link></div></div><div className="about-hero-shape"><span>Catalog</span><strong>Connected</strong><small>Customers, products and teams</small></div></section><section className="about-values"><div><p className="public-kicker">What guides us</p><h2>Built for clarity and useful everyday work.</h2></div><div className="about-value-grid"><article><span>01</span><h3>Easy discovery</h3><p>Customers can browse active categories and products without unnecessary complexity.</p></article><article><span>02</span><h3>Secure access</h3><p>Role-based permissions help each team member access only the modules they need.</p></article><article><span>03</span><h3>Smooth ordering</h3><p>Cart, direct checkout, addresses, and order history work together in one system.</p></article></div></section></main><PublicFooter /></div>
}

export default AboutPage
