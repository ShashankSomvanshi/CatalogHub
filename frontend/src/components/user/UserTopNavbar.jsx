import { useState } from 'react'

function UserTopNavbar({ userName, userRole, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const initials = (userName || 'User')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="topbar user-topbar">
      <div>
        <p className="eyebrow">User overview</p>
        <h1>Hello, {userName}</h1>
        <p className="subtext">{userRole || 'Customer'}</p>
      </div>

      <div className="topbar-actions">
        <div className="profile-menu-wrap">
          <button
            type="button"
            className="profile-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span className="profile-avatar">{initials}</span>
            <span className="profile-meta">
              <strong>{userName}</strong>
              <small>{userRole || 'Customer'}</small>
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

export default UserTopNavbar
