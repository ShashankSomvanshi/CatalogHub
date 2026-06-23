import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProfileImageUrl } from '../../api/profile.js'

function getStoredProfileImage() {
  try {
    return JSON.parse(localStorage.getItem('auth_user') || '{}')?.profile_image || ''
  } catch {
    return ''
  }
}

function AdminTopNavbar({ adminName, adminRole, onLogout, actionButton }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileImage, setProfileImage] = useState(getStoredProfileImage)
  const [imageFailed, setImageFailed] = useState(false)
  const initials = (adminName || 'Admin')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const profileImageUrl = getProfileImageUrl(profileImage)

  useEffect(() => {
    const handleProfileUpdate = (event) => {
      setProfileImage(event.detail?.profile_image || getStoredProfileImage())
      setImageFailed(false)
    }

    window.addEventListener('auth-user-updated', handleProfileUpdate)

    return () => window.removeEventListener('auth-user-updated', handleProfileUpdate)
  }, [])

  return (
    <header className="topbar admin-topbar">
      <div>
        <p className="eyebrow">Admin overview</p>
        <h1>Welcome, {adminName}</h1>
        <p className="subtext">{adminRole || 'Administrator'}</p>
      </div>

      <div className="topbar-actions">
        {actionButton ? <div className="topbar-action-btn">{actionButton}</div> : null}

        <div className="profile-menu-wrap">
          <button
            type="button"
            className="profile-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {profileImageUrl && !imageFailed ? (
              <img
                className="profile-avatar profile-avatar-image"
                src={profileImageUrl}
                alt={`${adminName} profile`}
                onError={() => setImageFailed(true)}
              />
            ) : (
              <span className="profile-avatar">{initials}</span>
            )}
            <span className="profile-meta">
              <strong>{adminName}</strong>
              <small>{adminRole || 'Administrator'}</small>
            </span>
            <span className="caret">⌄</span>
          </button>

          {menuOpen ? (
            <div className="profile-dropdown">
              <Link to="/admin/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
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

export default AdminTopNavbar
