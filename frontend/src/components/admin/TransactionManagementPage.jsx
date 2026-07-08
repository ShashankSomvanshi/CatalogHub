import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTransactions } from '../../api/transactions.js'
import SortableHeader from './SortableHeader.jsx'
import useSortableRows from './useSortableRows.js'
import { matchesTableSearch } from '../../utils/tableSearch.js'
import TableLoader from './TableLoader.jsx'

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
    return transactions.filter((transaction) => {
      const matchesStatus = status === 'all' || transaction.status === status
      const matchesSearch = matchesTableSearch([
        transaction.id,
        transaction.transaction_number,
        transaction.order_id,
        transaction.order?.order_number,
        transaction.order?.customer_name,
        transaction.order?.customer_email,
        transaction.amount,
        transaction.status,
        transaction.order?.created_at || transaction.created_at,
      ], searchTerm)
      return matchesStatus && matchesSearch
    })
  }, [transactions, searchTerm, status])

  const { sortedRows, sort, requestSort } = useSortableRows(filteredTransactions, {
    id: (transaction) => Number(transaction.id),
    order: (transaction) => transaction.order?.order_number || transaction.order_id,
    date: (transaction) => new Date(transaction.order?.created_at || transaction.created_at).getTime(),
    customer: (transaction) => transaction.order?.customer_name,
    price: (transaction) => Number(transaction.amount),
    status: (transaction) => transaction.status,
  }, 'date')

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = sortedRows.length ? (safePage - 1) * pageSize : 0
  const rows = sortedRows.slice(startIndex, startIndex + pageSize)

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
          {loading ? <TableLoader label="Loading transactions..." /> : rows.length === 0 ? <p className="subtext text-center">No transactions found.</p> : (
            <div className="table-wrap">
              <table className="data-table transaction-table">
                <thead><tr><SortableHeader column="id" label="ID" sort={sort} onSort={requestSort} /><SortableHeader column="order" label="Order ID" sort={sort} onSort={requestSort} /><SortableHeader column="date" label="Order Date" sort={sort} onSort={requestSort} /><SortableHeader column="customer" label="Customer Name" sort={sort} onSort={requestSort} /><SortableHeader column="price" label="Price" sort={sort} onSort={requestSort} /><SortableHeader column="status" label="Status" sort={sort} onSort={requestSort} /><th>Action</th></tr></thead>
                <tbody>{rows.map((transaction, rowIndex) => (
                  <tr key={transaction.id}>
                    <td className="id-cell">{startIndex + rowIndex + 1}</td>
                    <td><strong>{transaction.order?.order_number || transaction.order_id}</strong></td>
                    <td>{formatDate(transaction.order?.created_at || transaction.created_at)}</td>
                    <td><strong>{transaction.order?.customer_name || 'Guest customer'}</strong></td>
                    <td>{formatMoney(transaction.amount, transaction.currency)}</td>
                    <td><span className={`status-badge ${transaction.status}`}>{transaction.status}</span></td>
                    <td className="actions-cell">
                      <Link className="mini-btn edit-btn icon-action-btn" to={`/admin/transactions/${transaction.id}`} aria-label={`View transaction ${transaction.order?.order_number || transaction.id}`} title="View transaction">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                      </Link>
                    </td>
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
