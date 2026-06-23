function DashboardMainContent() {
  return (
    <>
      <section className="dashboard-grid">
        <article className="stat-card accent-purple">
          <p>Total Users</p>
          <strong>1,248</strong>
          <span>+12% this month</span>
        </article>
        <article className="stat-card accent-blue">
          <p>Products</p>
          <strong>486</strong>
          <span>24 added this week</span>
        </article>
        <article className="stat-card accent-green">
          <p>Orders</p>
          <strong>320</strong>
          <span>8 pending approval</span>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel-card large-panel">
          <div className="panel-head">
            <h3>Recent Activity</h3>
            <button type="button" className="ghost-btn">View all</button>
          </div>
          <ul className="activity-list">
            <li>New category "Electronics" created by Admin.</li>
            <li>Product stock updated for 18 items.</li>
            <li>Role permissions changed for the support team.</li>
          </ul>
        </article>

        <article className="panel-card">
          <h3>Quick Tips</h3>
          <p>Keep product details updated, verify permissions monthly, and review user activity weekly.</p>
        </article>
      </section>
    </>
  )
}

export default DashboardMainContent
