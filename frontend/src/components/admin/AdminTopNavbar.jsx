import { useEffect, useRef, useState } from 'react'
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
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('admin_theme')
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })
  const [profileImage, setProfileImage] = useState(getStoredProfileImage)
  const [imageFailed, setImageFailed] = useState(false)
  const menuRef = useRef(null)
  const initials = (adminName || 'Admin')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const profileImageUrl = getProfileImageUrl(profileImage)

  useEffect(() => {
    document.documentElement.dataset.adminTheme = theme
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('admin_theme', theme)
  }, [theme])

  useEffect(() => {
    const handleProfileUpdate = (event) => {
      setProfileImage(event.detail?.profile_image || getStoredProfileImage())
      setImageFailed(false)
    }

    window.addEventListener('auth-user-updated', handleProfileUpdate)

    return () => window.removeEventListener('auth-user-updated', handleProfileUpdate)
  }, [])

  useEffect(() => {
    if (!menuOpen) return undefined

    const handleOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('pointerdown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  return (
    <header className="topbar admin-topbar">
      <div>
        <p className="eyebrow">Admin overview</p>
        <h1>Welcome, {adminName}</h1>
        <p className="subtext">{adminRole || 'Administrator'}</p>
      </div>

      <div className="topbar-actions">
        {actionButton ? <div className="topbar-action-btn">{actionButton}</div> : null}

        <button
          type="button"
          className="admin-theme-toggle"
          onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>
          )}
        </button>

        <div className="profile-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="profile-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
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
            <span className={`caret ${menuOpen ? 'open' : ''}`}>⌄</span>
          </button>

          <div className={`profile-dropdown ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen}>
              <Link to="/admin/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
              <button type="button" className="logout-btn" onClick={onLogout}>
                Logout
              </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default AdminTopNavbar
