import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Navbar.css'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) {
    return null
  }

  return (
    <nav className="navbar-sidebar">
      <div className="sidebar-container">
        <Link to="/" className="sidebar-logo">
          FitLink
        </Link>
        <div className="sidebar-menu">
          {user.role === 'trainer' ? (
            <>
              <NavLink 
                to="/trainer" 
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                My Space
              </NavLink>
              <NavLink 
                to="/trainer/clients" 
                className={({ isActive, isPending }) => {
                  const active = isActive || location.pathname.startsWith('/trainer/clients')
                  return `sidebar-link ${active ? 'active' : ''}`
                }}
              >
                Clients
              </NavLink>
              <NavLink 
                to="/trainer/requests" 
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                Requests
              </NavLink>
              <NavLink 
                to="/messages" 
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                Messages
              </NavLink>
              <NavLink 
                to="/payments" 
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                Payments
              </NavLink>
            </>
          ) : (
            <>
              <NavLink 
                to="/client" 
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                My Space
              </NavLink>
              <NavLink 
                to="/client/workouts" 
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                Workouts
              </NavLink>
              <NavLink 
                to="/client/progress" 
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                Progress
              </NavLink>
              <NavLink 
                to="/client/nutrition" 
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                Nutrition
              </NavLink>
              <NavLink 
                to="/check-in" 
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                Check-in
              </NavLink>
              <NavLink 
                to="/settings" 
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                Settings
              </NavLink>
            </>
          )}
          <NavLink 
            to="/profile" 
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            Profile
          </NavLink>
        </div>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

