import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import './Clients.css'

function Clients() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchClients()
  }, [])


  const fetchClients = async () => {
    try {
      setError(null)
      const response = await api.get('/trainer/clients')
      setClients(response.data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
      setError(error.response?.data?.message || 'Failed to load clients')
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="clients-container" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '2rem' }}>
        <div style={{ padding: '2rem', textAlign: 'center', fontSize: '18px' }}>Loading clients...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="clients-container" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '2rem' }}>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#e74c3c' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '1rem' }}>Error loading clients</h2>
          <p style={{ fontSize: '16px', marginBottom: '1rem' }}>{error}</p>
          <button 
            onClick={fetchClients} 
            style={{ 
              padding: '0.75rem 1.5rem', 
              border: 'none', 
              borderRadius: '4px', 
              backgroundColor: '#3498db', 
              color: 'white', 
              cursor: 'pointer', 
              fontSize: '1rem',
              marginTop: '1rem' 
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="clients-container" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <div className="clients-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#2c3e50', margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>My Clients</h1>
        <div className="header-actions" style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/trainer/add-client')}
            className="btn-primary"
            style={{ padding: '0.75rem 1.5rem', border: 'none', borderRadius: '4px', backgroundColor: '#3498db', color: 'white', cursor: 'pointer', fontSize: '1rem' }}
          >
            + Add New Client
          </button>
          <button 
            onClick={() => {/* TODO: Implement find clients */}}
            className="btn-secondary"
            style={{ padding: '0.75rem 1.5rem', border: 'none', borderRadius: '4px', backgroundColor: '#95a5a6', color: 'white', cursor: 'pointer', fontSize: '1rem' }}
          >
            Find Clients
          </button>
        </div>
      </div>

      {/* Add/Find Clients Section */}
      <div className="add-find-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        <div className="action-card" style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#2c3e50', marginBottom: '0.5rem' }}>Add New Client</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>Invite a new client and complete their onboarding to get started with personalized training.</p>
          <button 
            onClick={() => navigate('/trainer/add-client')}
            className="btn-action"
            style={{ backgroundColor: '#3498db', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', cursor: 'pointer' }}
          >
            Add Client →
          </button>
        </div>
        <div className="action-card" style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#2c3e50', marginBottom: '0.5rem' }}>Find Clients</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>Discover potential clients looking for trainers. Connect and grow your client base.</p>
          <button 
            onClick={() => {/* TODO: Implement find clients feature */}}
            className="btn-action"
            disabled
            style={{ backgroundColor: '#95a5a6', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', cursor: 'not-allowed', opacity: 0.6 }}
          >
            Coming Soon
          </button>
        </div>
      </div>

      {/* Clients List */}
      <div className="clients-list-section" style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ color: '#2c3e50', margin: 0 }}>Current Clients ({filteredClients.length})</h2>
          <div className="filters" style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', minWidth: '200px' }}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
              style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', background: 'white', cursor: 'pointer' }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {filteredClients.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '4rem 2rem', color: '#666' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No clients found.</p>
            {clients.length === 0 ? (
              <p>Get started by adding your first client!</p>
            ) : (
              <p>Try adjusting your search or filter.</p>
            )}
          </div>
        ) : (
          <div className="clients-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {filteredClients.map(client => (
              <div 
                key={client.id} 
                className="client-card"
                onClick={() => navigate(`/trainer/clients/${client.id}`)}
                style={{ background: '#f8f9fa', borderRadius: '8px', padding: '1.5rem', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3498db'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div className="client-card-header">
                  <div className="client-avatar">
                    {client.name?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div className="client-info">
                    <h3>{client.name}</h3>
                    <p className="client-email">{client.email}</p>
                  </div>
                  <span className={`status-badge ${client.status || 'active'}`}>
                    {client.status || 'active'}
                  </span>
                </div>
                
                <div className="client-card-body">
                  {client.primary_goal && (
                    <div className="client-goal">
                      <strong>Goal:</strong> {client.primary_goal.replace('_', ' ')}
                    </div>
                  )}
                  {client.goal_target && (
                    <div className="client-target">
                      <strong>Target:</strong> {client.goal_target}
                    </div>
                  )}
                  {client.training_preference && (
                    <div className="client-preference">
                      <strong>Training:</strong> {client.training_preference}
                    </div>
                  )}
                </div>

                <div className="client-card-footer">
                  <div className="client-meta">
                    {client.onboarding_completed && (
                      <span className="badge-complete">✓ Onboarded</span>
                    )}
                    {client.checked_in_today > 0 && (
                      <span className="badge-checkin">✓ Checked in today</span>
                    )}
                    {client.start_date && (
                      <span className="client-date">
                        Started: {new Date(client.start_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Clients

