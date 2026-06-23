function TopNavbar({ adminName, adminRole, menuOpen, setMenuOpen, onLogout }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Overview</p>
        <h1>Hello {adminName}</h1>
      </div>

      <div className="topbar-actions">
        <label className="search-box">
          <span>🔎</span>
          <input type="search" placeholder="Search here..." />
        </label>

        <div className="profile-menu-wrap">
          <button
            type="button"
            className="profile-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span className="profile-avatar">A</span>
            <span className="profile-meta">
              <strong>{adminName}</strong>
              <small>{adminRole || 'Administrator'}</small>
            </span>
            <span className="caret">⌄</span>
          </button>

          {menuOpen ? (
            <div className="profile-dropdown">
              <button type="button">Profile</button>
              <button type="button">Settings</button>
              <button type="button" className="logout-btn" onClick={onLogout}>
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default TopNavbar
