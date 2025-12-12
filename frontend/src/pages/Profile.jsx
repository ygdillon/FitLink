import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './Profile.css'

function Profile() {
  const { user, fetchUser } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    certifications: '',
    specialties: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        certifications: user.certifications?.join(', ') || '',
        specialties: user.specialties?.join(', ') || ''
      })
    }
  }, [user])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const updateData = {
        ...formData,
        certifications: formData.certifications.split(',').map(s => s.trim()).filter(s => s),
        specialties: formData.specialties.split(',').map(s => s.trim()).filter(s => s)
      }
      await api.put('/profile', updateData)
      await fetchUser()
      setMessage('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h1>Profile Settings</h1>
        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          {user.role === 'trainer' && (
            <>
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows="4"
                />
              </div>
              <div className="form-group">
                <label>Certifications (comma-separated)</label>
                <input
                  type="text"
                  name="certifications"
                  value={formData.certifications}
                  onChange={handleChange}
                  placeholder="NASM, ACE, etc."
                />
              </div>
              <div className="form-group">
                <label>Specialties (comma-separated)</label>
                <input
                  type="text"
                  name="specialties"
                  value={formData.specialties}
                  onChange={handleChange}
                  placeholder="Weight Loss, Strength Training, etc."
                />
              </div>
            </>
          )}
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Profile

