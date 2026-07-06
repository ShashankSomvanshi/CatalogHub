import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTransactions } from '../../api/transactions.js'

const pageSizeOptions = [5, 10, 25]

function formatMoney(amount, currency = 'INR') {
  return Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: currency || 'INR' })
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

function TransactionManagementPage() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [status, setStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    let ignore = false
    fetchTransactions()
      .then((records) => { if (!ignore) setTransactions(records) })
      .catch((error) => { if (!ignore) setMessage(error.response?.data?.message || 'Unable to load transactions.') })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])

  const filteredTransactions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return transactions.filter((transaction) => {
      const matchesStatus = status === 'all' || transaction.status === status
      const matchesSearch = !query || [
        transaction.id,
        transaction.transaction_number,
        transaction.order_id,
        transaction.order?.order_number,
        transaction.order?.customer_name,
        transaction.order?.customer_email,
      ].some((value) => String(value || '').toLowerCase().includes(query))
      return matchesStatus && matchesSearch
    })
  }, [transactions, searchTerm, status])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = filteredTransactions.length ? (safePage - 1) * pageSize : 0
  const rows = filteredTransactions.slice(startIndex, startIndex + pageSize)

  return (
    <section className="dashboard-main-content admin-main-content">
      <section className="admin-data-section">
        <article className="panel-card data-panel-card">
          <div className="panel-head data-panel-head">
            <div><p className="eyebrow">Payments</p><h3>Transactions</h3></div>
            <div className="table-tools">
              <label className="table-search">Search<input type="search" value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setCurrentPage(1) }} placeholder="Order, customer or transaction" /></label>
              <label>Status<select value={status} onChange={(event) => { setStatus(event.target.value); setCurrentPage(1) }}><option value="all">All</option><option value="pending">Pending</option><option value="completed">Completed</option><option value="failed">Failed</option></select></label>
              <label>Rows<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1) }}>{pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
            </div>
          </div>

          {message && <p className="status-message error">{message}</p>}
          {loading ? <p className="subtext">Loading transactions...</p> : rows.length === 0 ? <p className="subtext text-center">No transactions found.</p> : (
            <div className="table-wrap">
              <table className="data-table transaction-table">
                <thead><tr><th>ID</th><th>Order ID</th><th>Order Date</th><th>Customer Name</th><th>Price</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{rows.map((transaction, rowIndex) => (
                  <tr key={transaction.id}>
                    <td className="id-cell">{startIndex + rowIndex + 1}</td>
                    <td><strong>{transaction.order?.order_number || transaction.order_id}</strong></td>
                    <td>{formatDate(transaction.order?.created_at || transaction.created_at)}</td>
                    <td><strong>{transaction.order?.customer_name || 'Guest customer'}</strong></td>
                    <td>{formatMoney(transaction.amount, transaction.currency)}</td>
                    <td><span className={`status-badge ${transaction.status}`}>{transaction.status}</span></td>
                    <td className="actions-cell"><Link className="mini-btn edit-btn" to={`/admin/transactions/${transaction.id}`}>View</Link></td>
                  </tr>
                ))}</tbody>
              </table>
              <div className="table-pagination">
                <p>Showing <strong>{startIndex + 1}</strong>-<strong>{Math.min(startIndex + pageSize, filteredTransactions.length)}</strong> of <strong>{filteredTransactions.length}</strong> transactions</p>
                <div className="pagination-actions"><button type="button" className="mini-btn" disabled={safePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Previous</button><span>Page {safePage} of {totalPages}</span><button type="button" className="mini-btn" disabled={safePage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Next</button></div>
              </div>
            </div>
          )}
        </article>
      </section>
    </section>
  )
}

export default TransactionManagementPage
