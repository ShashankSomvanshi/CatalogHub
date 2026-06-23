import { useLocation, useNavigate } from 'react-router-dom'

function Sidebar({ adminName, adminRole, menuItems, title = 'Admin Panel', subtitle = 'Manage your dashboard with a simple admin workspace.' }) {
  const navigate = useNavigate()
  const location = useLocation()

  const activeItem = location.pathname.startsWith('/admin/users')
    ? 'User Management'
    : location.pathname.startsWith('/admin/categories')
      ? 'Category Management'
      : location.pathname.startsWith('/admin/products')
        ? 'Product Management'
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
    <aside className="sidebar">
      <div>
        <p className="sidebar-brand">CatalogHub</p>
        <h2>{title}</h2>
        <p className="sidebar-subtitle">{subtitle}</p>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item}
            className={`nav-item ${item === activeItem ? 'active' : ''}`}
            type="button"
            onClick={() => handleMenuClick(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <strong>Hello {adminName}</strong>
        <span>{adminRole || 'Administrator'}</span>
      </div>
    </aside>
  )
}

export default Sidebar
