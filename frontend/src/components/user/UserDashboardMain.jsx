function UserDashboardMain() {
  const summaryCards = [
    { label: 'Recent Orders', value: '12', note: '3 pending shipment', tone: 'accent-purple' },
    { label: 'Support Tickets', value: '3', note: '1 awaiting response', tone: 'accent-blue' },
    { label: 'Profile Status', value: '98%', note: 'Complete and verified', tone: 'accent-green' },
    { label: 'Saved Items', value: '7', note: '2 added this week', tone: 'accent-gold' },
  ]

  return (
    <section className="dashboard-main-content user-main-content">
      <header className="dashboard-intro-card">
        <div>
          <p className="eyebrow">Customer overview</p>
          <h2>Your activity at a glance</h2>
          <p className="subtext">Keep track of orders, support, and your profile in a simple customer panel.</p>
        </div>
        <span className="status-pill">Updated today</span>
      </header>

      <section className="dashboard-card-grid">
        {summaryCards.map((card) => (
          <article key={card.label} className={`stat-card ${card.tone}`}>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
            <span>{card.note}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-section-grid">
        <article className="panel-card">
          <h3>Recent orders</h3>
          <ul className="activity-list">
            <li>Order #1024 delivered successfully.</li>
            <li>Order #1031 is in transit.</li>
            <li>Order #1038 payment confirmed.</li>
          </ul>
        </article>

        <article className="panel-card info-card">
          <h3>Account details</h3>
          <div className="mini-metric"><strong>Verified</strong><span>Email and phone are active</span></div>
          <div className="mini-metric"><strong>Rewards</strong><span>120 points available</span></div>
          <div className="mini-metric"><strong>Support</strong><span>Available 24/7</span></div>
        </article>
      </section>
    </section>
  )
}

export default UserDashboardMain
