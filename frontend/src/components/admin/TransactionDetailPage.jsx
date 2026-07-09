import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProductImage } from '../../api/products.js'
import { fetchTransaction, updateTransactionOrderStatus } from '../../api/transactions.js'

const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

function formatMoney(amount) {
  return Number(amount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

function DetailField({ label, children }) {
  return <div><span>{label}</span><strong>{children || '—'}</strong></div>
}

function getStatusLogs(order = {}) {
  return order.status_logs || order.statusLogs || []
}

function getStatusFormFromTransaction(record) {
  const latestLog = getStatusLogs(record?.order)[0]
  return {
    status: latestLog?.status || record?.order?.status || 'pending',
    note: latestLog?.note || '',
  }
}

function TransactionDetailPage() {
  const { transactionId } = useParams()
  const [transaction, setTransaction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingStatus, setSavingStatus] = useState(false)
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState({ type: '', text: '' })
  const [statusForm, setStatusForm] = useState({ status: 'pending', note: '' })
  const [statusNoteError, setStatusNoteError] = useState('')
  const [logsOpen, setLogsOpen] = useState(false)

  useEffect(() => {
    let ignore = false
    fetchTransaction(transactionId)
      .then((record) => {
        if (ignore) return
        setTransaction(record)
        setStatusForm(getStatusFormFromTransaction(record))
      })
      .catch((error) => { if (!ignore) setMessage(error.response?.data?.message || 'Unable to load transaction details.') })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [transactionId])

  const handleOrderStatusSave = async (event) => {
    event.preventDefault()
    if (!statusForm.note.trim()) {
      setStatusNoteError('Please fill out this field.')
      return
    }
    setSavingStatus(true)
    setStatusNoteError('')
    setNotice({ type: '', text: '' })

    try {
      const updatedTransaction = await updateTransactionOrderStatus(transactionId, statusForm.status, statusForm.note.trim())
      if (updatedTransaction) {
        setTransaction(updatedTransaction)
        setStatusForm(getStatusFormFromTransaction(updatedTransaction))
      }
      setNotice({ type: 'success', text: 'Order status updated.' })
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Unable to update order status.' })
    } finally {
      setSavingStatus(false)
    }
  }

  if (loading) return <section className="dashboard-main-content admin-main-content"><p className="subtext">Loading transaction...</p></section>
  if (!transaction) return <section className="dashboard-main-content admin-main-content"><p className="status-message error">{message || 'Transaction not found.'}</p><Link className="ghost-btn" to="/admin/transactions">Back</Link></section>

  const order = transaction.order || {}
  const statusLogs = getStatusLogs(order)
  return (
    <section className="dashboard-main-content admin-main-content transaction-detail-page">
      <div className="transaction-detail-heading"><div><p className="eyebrow">Transaction details</p><h2>{transaction.transaction_number}</h2></div><Link className="ghost-btn" to="/admin/transactions">Back</Link></div>
      {notice.text ? <p className={`status-message ${notice.type}`}>{notice.text}</p> : null}

      <div className="transaction-detail-grid">
        <article className="panel-card transaction-summary-card"><h3>Payment summary</h3><div className="transaction-detail-fields"><DetailField label="Transaction ID">{transaction.transaction_number}</DetailField><DetailField label="Order ID">{order.order_number}</DetailField><DetailField label="Order date">{formatDate(order.created_at)}</DetailField><DetailField label="Amount">{formatMoney(transaction.amount)}</DetailField><DetailField label="Gateway">{transaction.payment_gateway}</DetailField><DetailField label="Payment method">{transaction.payment_method}</DetailField><DetailField label="Payment status"><span className={`status-badge ${transaction.status}`}>{transaction.status}</span></DetailField></div></article>

        <article className="panel-card transaction-summary-card"><h3>Customer and order</h3><div className="transaction-detail-fields"><DetailField label="Customer name">{order.customer_name}</DetailField><DetailField label="Email">{order.customer_email}</DetailField><DetailField label="Phone">{order.customer_phone}</DetailField><DetailField label="Payment status"><span className={`status-badge ${order.payment_status}`}>{order.payment_status}</span></DetailField></div><form className="order-status-form" onSubmit={handleOrderStatusSave} noValidate><div className="order-status-form-heading"><span>Order status</span></div><select className={`order-status-select ${statusForm.status || ''}`} value={statusForm.status} onChange={(event) => setStatusForm((current) => ({ ...current, status: event.target.value }))} disabled={savingStatus} aria-label="Order status">{orderStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select><label><span>Status note <span className="required-mark">*</span></span><textarea name="status_note" value={statusForm.note} onChange={(event) => { setStatusForm((current) => ({ ...current, note: event.target.value })); setStatusNoteError('') }} onInvalid={(event) => { event.preventDefault(); setStatusNoteError('Please fill out this field.') }} placeholder="Add a note for this status update" rows="3" required={false} aria-invalid={Boolean(statusNoteError)} aria-describedby={statusNoteError ? 'status-note-error' : undefined} />{statusNoteError ? <small className="order-status-field-error" id="status-note-error">{statusNoteError}</small> : null}</label><div className="order-status-actions"><button type="submit" disabled={savingStatus} formNoValidate>{savingStatus ? 'Saving...' : 'Save Status'}</button><button type="button" onClick={() => setLogsOpen(true)}>Preview logs</button></div></form></article>

        <article className="panel-card transaction-address-card"><h3>Addresses</h3><div><section><span>Billing address</span><p>{order.billing_address}</p><strong>{[order.billing_city, order.billing_state, order.billing_pincode].filter(Boolean).join(', ')}</strong></section><section><span>Shipping address</span><p>{order.shipping_address}</p><strong>{[order.shipping_city, order.shipping_state, order.shipping_pincode].filter(Boolean).join(', ')}</strong></section></div></article>

        <article className="panel-card transaction-products-card"><h3>Products</h3><div className="transaction-product-list">{(order.items || []).map((item) => {
          const image = getProductImage(item.product)
          return <div className="transaction-product-row" key={item.id}>{image ? <img src={image} alt="" /> : <span className="transaction-product-placeholder" /> }<div><strong>{item.product_name}</strong><small>{item.sku || 'No SKU'} · Qty {item.quantity}</small></div><span>{formatMoney(item.unit_price)} × {item.quantity}</span><strong>{formatMoney(item.subtotal)}</strong></div>
        })}</div><div className="transaction-totals"><p><span>Subtotal</span><strong>{formatMoney(order.subtotal)}</strong></p><p><span>Total</span><strong>{formatMoney(order.final_amount)}</strong></p></div></article>
      </div>
      {logsOpen ? (
        <div className="status-log-modal-backdrop" role="presentation" onMouseDown={() => setLogsOpen(false)}>
          <section className="status-log-modal" role="dialog" aria-modal="true" aria-labelledby="status-log-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="status-log-modal-heading"><h3 id="status-log-title">Order status logs</h3><button type="button" onClick={() => setLogsOpen(false)} aria-label="Close status logs">&times;</button></div>
            {statusLogs.length ? (
              <div className="status-log-table-wrap">
                <table className="status-log-table">
                  <thead><tr><th>Date</th><th>Status</th><th>Note</th></tr></thead>
                  <tbody>{statusLogs.map((log) => <tr key={log.id}><td>{formatDate(log.date)}</td><td><span className={`status-badge ${log.status}`}>{log.status}</span></td><td>{log.note || '—'}</td></tr>)}</tbody>
                </table>
              </div>
            ) : (
              <p className="subtext">No status logs yet.</p>
            )}
          </section>
        </div>
      ) : null}
    </section>
  )
}

export default TransactionDetailPage
