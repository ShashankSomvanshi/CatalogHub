import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProductImage } from '../../api/products.js'
import { fetchTransaction } from '../../api/transactions.js'

function formatMoney(amount, currency = 'INR') {
  return Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: currency || 'INR' })
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

function DetailField({ label, children }) {
  return <div><span>{label}</span><strong>{children || '—'}</strong></div>
}

function TransactionDetailPage() {
  const { transactionId } = useParams()
  const [transaction, setTransaction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let ignore = false
    fetchTransaction(transactionId)
      .then((record) => { if (!ignore) setTransaction(record) })
      .catch((error) => { if (!ignore) setMessage(error.response?.data?.message || 'Unable to load transaction details.') })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [transactionId])

  if (loading) return <section className="dashboard-main-content admin-main-content"><p className="subtext">Loading transaction...</p></section>
  if (!transaction) return <section className="dashboard-main-content admin-main-content"><p className="status-message error">{message || 'Transaction not found.'}</p><Link className="ghost-btn" to="/admin/transactions">Back to transactions</Link></section>

  const order = transaction.order || {}
  return (
    <section className="dashboard-main-content admin-main-content transaction-detail-page">
      <div className="transaction-detail-heading"><div><p className="eyebrow">Transaction details</p><h2>{transaction.transaction_number}</h2></div><Link className="ghost-btn" to="/admin/transactions">Back to transactions</Link></div>

      <div className="transaction-detail-grid">
        <article className="panel-card transaction-summary-card"><h3>Payment summary</h3><div className="transaction-detail-fields"><DetailField label="Transaction ID">{transaction.transaction_number}</DetailField><DetailField label="Order ID">{order.order_number}</DetailField><DetailField label="Order date">{formatDate(order.created_at)}</DetailField><DetailField label="Amount">{formatMoney(transaction.amount, transaction.currency)}</DetailField><DetailField label="Gateway">{transaction.payment_gateway}</DetailField><DetailField label="Payment method">{transaction.payment_method}</DetailField><DetailField label="Payment status"><span className={`status-badge ${transaction.status}`}>{transaction.status}</span></DetailField><DetailField label="Paid at">{formatDate(transaction.paid_at)}</DetailField></div></article>

        <article className="panel-card transaction-summary-card"><h3>Customer and order</h3><div className="transaction-detail-fields"><DetailField label="Customer name">{order.customer_name}</DetailField><DetailField label="Email">{order.customer_email}</DetailField><DetailField label="Phone">{order.customer_phone}</DetailField><DetailField label="Order status"><span className={`status-badge ${order.status}`}>{order.status}</span></DetailField><DetailField label="Payment status"><span className={`status-badge ${order.payment_status}`}>{order.payment_status}</span></DetailField></div></article>

        <article className="panel-card transaction-address-card"><h3>Addresses</h3><div><section><span>Billing address</span><p>{order.billing_address}</p><strong>{order.billing_pincode}</strong></section><section><span>Shipping address</span><p>{order.shipping_address}</p><strong>{order.shipping_pincode}</strong></section></div></article>

        <article className="panel-card transaction-products-card"><h3>Products</h3><div className="transaction-product-list">{(order.items || []).map((item) => {
          const image = getProductImage(item.product)
          return <div className="transaction-product-row" key={item.id}>{image ? <img src={image} alt="" /> : <span className="transaction-product-placeholder" /> }<div><strong>{item.product_name}</strong><small>{item.sku || 'No SKU'} · Qty {item.quantity}</small></div><span>{formatMoney(item.unit_price, transaction.currency)} × {item.quantity}</span><strong>{formatMoney(item.subtotal, transaction.currency)}</strong></div>
        })}</div><div className="transaction-totals"><p><span>Subtotal</span><strong>{formatMoney(order.subtotal, transaction.currency)}</strong></p><p><span>Shipping</span><strong>{formatMoney(order.shipping_amount, transaction.currency)}</strong></p><p><span>Total</span><strong>{formatMoney(order.final_amount, transaction.currency)}</strong></p></div></article>
      </div>
    </section>
  )
}

export default TransactionDetailPage
