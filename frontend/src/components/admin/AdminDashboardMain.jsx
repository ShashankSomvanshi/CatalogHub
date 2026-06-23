import { useEffect, useState } from 'react'
import { fetchDashboardSummary } from '../../api/dashboard.js'
import { getProductCategoryName, getProductName } from '../../api/products.js'

function formatDate(value) {
  if (!value) return 'No date'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function AdminDashboardMain() {
  const [dashboard, setDashboard] = useState({
    totals: { users: 0, categories: 0, products: 0 },
    recentUsers: [],
    recentProducts: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      try {
        const data = await fetchDashboardSummary()

        if (active) {
          setDashboard(data)
          setError('')
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.response?.data?.message || 'Unable to load dashboard data.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [])

  const summaryCards = [
    { label: 'Total Users', value: dashboard.totals.users, note: 'All registered users', tone: 'accent-purple' },
    { label: 'Total Categories', value: dashboard.totals.categories, note: 'Catalog category records', tone: 'accent-blue' },
    { label: 'Total Products', value: dashboard.totals.products, note: 'Products in database', tone: 'accent-green' },
  ]

  return (
    <section className="dashboard-main-content admin-main-content">
      {error ? <p className="status-message error">{error}</p> : null}

      <section className="dashboard-card-grid">
        {summaryCards.map((card) => (
          <article key={card.label} className={`stat-card ${card.tone}`}>
            <p>{card.label}</p>
            <strong>{loading ? '...' : card.value.toLocaleString()}</strong>
            <span>{card.note}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-section-grid">
        <article className="panel-card">
          <div className="panel-head">
            <h3>Recent 5 Users</h3>
          </div>
          {loading ? (
            <p className="dashboard-empty-text">Loading users...</p>
          ) : dashboard.recentUsers.length ? (
            <ul className="dashboard-record-list">
              {dashboard.recentUsers.map((user) => (
                <li key={user.id}>
                  <div>
                    <strong>{user.name || 'Unnamed user'}</strong>
                    <span>{user.email || 'No email'}</span>
                  </div>
                  <small>{user.role_name || user.role || user.status || formatDate(user.created_at)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dashboard-empty-text">No users found.</p>
          )}
        </article>

        <article className="panel-card">
          <div className="panel-head">
            <h3>Recent 10 Products</h3>
          </div>
          {loading ? (
            <p className="dashboard-empty-text">Loading products...</p>
          ) : dashboard.recentProducts.length ? (
            <ul className="dashboard-record-list">
              {dashboard.recentProducts.map((product) => (
                <li key={product.id}>
                  <div>
                    <strong>{getProductName(product)}</strong>
                    <span>{getProductCategoryName(product) || product.sku || 'No category'}</span>
                  </div>
                  <small>{product.status || formatDate(product.created_at)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dashboard-empty-text">No products found.</p>
          )}
        </article>
      </section>
    </section>
  )
}

export default AdminDashboardMain
