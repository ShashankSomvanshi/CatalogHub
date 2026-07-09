import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyOrders } from '../../api/orders.js'
import { getProductImage } from '../../api/products.js'
import PublicFooter from './PublicFooter.jsx'
import PublicHeader from './PublicHeader.jsx'

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

function MyOrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let ignore = false
    fetchMyOrders()
      .then((records) => { if (!ignore) setOrders(records) })
      .catch((error) => { if (!ignore) setMessage(error.response?.data?.message || 'Unable to load your orders.') })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])

  const visibleOrders = useMemo(() => (
    filter === 'all' ? orders : orders.filter((order) => order.status === filter)
  ), [filter, orders])

  return (
    <div className="my-orders-shell">
      <PublicHeader />
      <main className="my-orders-main">
        <div className="category-products-breadcrumb"><Link to="/">Home</Link><span>/</span><span>My Orders</span></div>
        <header className="my-orders-heading">
          <div><p className="public-kicker">Your account</p><h3>My Orders</h3><p>Track your purchases, payments, and delivery progress.</p></div>
          <label>Status<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All orders</option><option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></label>
        </header>

        {message && <p className="cart-error" role="alert">{message}</p>}
        {loading ? <section className="my-orders-empty"><h2>Loading your orders...</h2></section> : visibleOrders.length === 0 ? (
          <section className="my-orders-empty"><h2>{orders.length ? 'No orders match this filter' : 'You have not placed any orders yet'}</h2><p>When you place an order, you can track it here.</p><Link to="/products">Start shopping</Link></section>
        ) : (
          <section className="my-orders-list">{visibleOrders.map((order) => (
            <article className="my-order-card" key={order.id}>
              <header><div><span>Order number</span><strong>{order.order_number}</strong></div><div><span>Placed on</span><strong>{formatDate(order.created_at)}</strong></div><div><span>Total</span><strong>{formatMoney(order.final_amount)}</strong></div><div className="my-order-statuses"><span className={`order-status ${order.status}`}>{order.status}</span><span className={`payment-status ${order.payment_status}`}>Payment: {order.payment_status}</span></div></header>
              <div className="my-order-products">{(order.items || []).map((item) => {
                const image = getProductImage(item.product)
                return <div className="my-order-product" key={item.id}>{image ? <img src={image} alt="" /> : <span className="my-order-image-placeholder" />}<div><strong>{item.product_name}</strong><small>{item.sku || 'No SKU'} · Quantity: {item.quantity}</small></div><strong>{formatMoney(item.subtotal)}</strong></div>
              })}</div>
              <footer><div><span>Delivery address</span><p>{[order.shipping_address, order.shipping_city, order.shipping_state, order.shipping_pincode].filter(Boolean).join(', ')}</p></div><div className="my-order-totals"><span>Subtotal: {formatMoney(order.subtotal)}</span><span>Shipping: {formatMoney(order.shipping_amount)}</span></div></footer>
            </article>
          ))}</section>
        )}
      </main>
      <PublicFooter />
    </div>
  )
}

export default MyOrdersPage
