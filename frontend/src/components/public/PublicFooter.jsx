import { Link } from 'react-router-dom'

function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer-main">
        <div className="public-footer-brand">
          <Link className="public-logo public-footer-logo" to="/"><span className="public-logo-mark">C</span><span>Catalog<span>Hub</span></span></Link>
          <p>Simple catalog discovery and management for modern teams and growing businesses.</p>
        </div>

        <div className="public-footer-column">
          <h3>About</h3>
          <Link to="/contact">Contact Us</Link>
          <Link to="/about">About CatalogHub</Link>
          <Link to="/products">Our Catalog</Link>
          <Link to="/login">Careers</Link>
        </div>

        <div className="public-footer-column">
          <h3>Help</h3>
          <a href="mailto:hello@cataloghub.com">Support</a>
          <Link to="/products">Catalog Guide</Link>
          <Link to="/login">Account Access</Link>
          <Link to="/contact">FAQ</Link>
        </div>

        <div className="public-footer-column">
          <h3>Consumer Policy</h3>
          <Link to="/">Terms of Use</Link>
          <Link to="/">Privacy</Link>
          <Link to="/">Security</Link>
          <Link to="/">Sitemap</Link>
        </div>

        <div className="public-footer-address">
          <h3>Contact</h3>
          <p>CatalogHub Technologies</p>
          <p>Ambad MIDC, Nashik, Maharashtra</p>
          <p>India - 422010</p>
          <a href="mailto:hello@cataloghub.com">hello@cataloghub.com</a>
          <div className="public-social-links" aria-label="Social links">
            <Link to="/" aria-label="Facebook">f</Link>
            <Link to="/" aria-label="X">X</Link>
            <Link to="/" aria-label="Instagram">IG</Link>
            <Link to="/" aria-label="YouTube">YT</Link>
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
  )
}

export default PublicFooter
