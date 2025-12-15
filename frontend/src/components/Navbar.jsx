import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Navbar.css'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) {
    return null
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          FitLink
        </Link>
        <div className="navbar-menu">
          {user.role === 'trainer' ? (
            <>
              <Link to="/trainer">Dashboard</Link>
              <Link to="/trainer/add-client">Add Client</Link>
              <Link to="/workout/builder">Create Workout</Link>
              <Link to="/messages">Messages</Link>
              <Link to="/payments">Payments</Link>
            </>
          ) : (
            <>
              <Link to="/client">Dashboard</Link>
              <Link to="/check-in">Daily Check-in</Link>
              <Link to="/progress">Progress</Link>
              <Link to="/messages">Messages</Link>
              <Link to="/payments">Payments</Link>
            </>
          )}
          <Link to="/profile">Profile</Link>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

