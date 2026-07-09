import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { formatRoleLabel } from '../api/access.js'
import shopNowLogo from '../assets/images/shop_now.jpeg'

function SidebarIcon({ item }) {
  const paths = {
    Dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    'User Management': <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    'Category Management': <><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></>,
    'Product Management': <><path d="m21 8-9-5-9 5 9 5 9-5Z" /><path d="m3 8 9 5 9-5M3 12l9 5 9-5M3 16l9 5 9-5" /></>,
    'Role Management': <><circle cx="12" cy="8" r="4" /><path d="M5.5 21a6.5 6.5 0 0 1 13 0M19 8h3M20.5 6.5v3" /></>,
    'Transaction Management': <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
    'Sub Admin Management': <><circle cx="9" cy="8" r="4" /><path d="M2.5 21a6.5 6.5 0 0 1 13 0M18 13v6M15 16h6" /></>,
    'Profile Settings': <><circle cx="12" cy="8" r="4" /><path d="M5.5 21a6.5 6.5 0 0 1 13 0" /></>,
  }

  return <svg className="sidebar-nav-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[item] || paths.Dashboard}</svg>
}

function Sidebar({ adminName, adminRole, menuItems, title = 'Admin Panel', subtitle = 'Manage your dashboard with a simple admin workspace.' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('admin_sidebar_collapsed') === 'true')
  const roleLabel = formatRoleLabel(adminRole)

  useEffect(() => {
    document.documentElement.dataset.adminSidebar = collapsed ? 'collapsed' : 'expanded'
    localStorage.setItem('admin_sidebar_collapsed', String(collapsed))
  }, [collapsed])

  const activeItem = location.pathname.startsWith('/admin/users')
    ? 'User Management'
    : location.pathname.startsWith('/admin/categories')
      ? 'Category Management'
      : location.pathname.startsWith('/admin/products')
      ? 'Product Management'
      : location.pathname.startsWith('/admin/transactions')
        ? 'Transaction Management'
        : location.pathname.startsWith('/admin/role-permissions')
          ? 'Role Management'
          : location.pathname.startsWith('/admin/profile')
            ? 'Profile Settings'
          : location.pathname.startsWith('/admin/sub-admins')
          ? 'Sub Admin Management'
          : location.pathname.startsWith('/admin/dashboard')
            ? 'Dashboard'
            : 'Dashboard'

  const handleMenuClick = (item) => {
    if (item === 'Dashboard') {
      navigate('/admin/dashboard')
      return
    }

    if (item === 'User Management') {
      navigate('/admin/users')
      return
    }

    if (item === 'Category Management') {
      navigate('/admin/categories')
      return
    }

    if (item === 'Product Management') {
      navigate('/admin/products')
      return
    }

    if (item === 'Transaction Management') {
      navigate('/admin/transactions')
      return
    }

    if (item === 'Sub Admin Management') {
      navigate('/admin/sub-admins')
      return
    }

    if (item === 'Role Management') {
      navigate('/admin/role-permissions')
      return
    }

    if (item === 'Profile Settings') {
      navigate('/admin/profile')
    }
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-heading">
        <div className="sidebar-heading-copy">
          <p className="sidebar-brand"><img className="sidebar-brand-logo" src={shopNowLogo} alt="ShopNow" /></p>
          <h2>{title}</h2>
          <p className="sidebar-subtitle">{subtitle}</p>
        </div>
        <button type="button" className="sidebar-toggle" onClick={() => setCollapsed((current) => !current)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={collapsed ? 'm9 18 6-6-6-6' : 'm15 18-6-6 6-6'} /></svg>
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item}
            className={`nav-item ${item === activeItem ? 'active' : ''}`}
            type="button"
            onClick={() => handleMenuClick(item)}
            title={collapsed ? item : undefined}
          >
            <SidebarIcon item={item} />
            <span className="nav-item-label">{item}</span>
          </button>
        ))}
      </nav>

     
    </aside>
  )
}

export default Sidebar
