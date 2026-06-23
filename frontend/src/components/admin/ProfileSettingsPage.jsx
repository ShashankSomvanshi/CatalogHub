import { useEffect, useState } from 'react'
import { fetchAdminProfile, updateAdminProfile } from '../../api/profile.js'

function ProfileSettingsPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone_no: '',
    current_password: '',
    password: '',
    password_confirmation: '',
    profile_image: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    let ignore = false

    const loadProfile = async () => {
      setLoading(true)
      setMessage({ type: '', text: '' })

      try {
        const profile = await fetchAdminProfile()

        if (!ignore) {
          setForm((current) => ({
            ...current,
            name: profile.name || '',
            email: profile.email || '',
            phone_no: profile.phone_no || '',
          }))
        }
      } catch (error) {
        if (!ignore) {
          setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to load profile.' })
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      ignore = true
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      if (form.password && form.password !== form.password_confirmation) {
        setMessage({ type: 'error', text: 'Password and confirm password do not match.' })
        setSaving(false)
        return
      }

      const data = await updateAdminProfile({
        name: form.name,
        phone_no: form.phone_no,
        current_password: form.current_password,
        password: form.password,
        password_confirmation: form.password_confirmation,
        profile_image: form.profile_image,
      })

      const profile = data.profile || {}
      const storedUser = JSON.parse(localStorage.getItem('auth_user') || '{}')
      localStorage.setItem('auth_user', JSON.stringify({ ...storedUser, ...profile }))
      window.dispatchEvent(new CustomEvent('auth-user-updated', { detail: profile }))

      setForm((current) => ({
        ...current,
        name: profile.name || current.name,
        phone_no: profile.phone_no || current.phone_no,
        current_password: '',
        password: '',
        password_confirmation: '',
        profile_image: null,
      }))
      setMessage({ type: 'success', text: data.message || 'Profile updated successfully.' })
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Profile update failed.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="dashboard-main-content admin-main-content">
      <section className="admin-form-section">
        <article className="panel-card admin-form-card">
          <div className="admin-form-head">
            <div>
              <p className="eyebrow">Profile settings</p>
              <h3>Account profile</h3>
              <p className="subtext">Update your profile details and password from the user account table.</p>
            </div>
          </div>

          {loading ? (
            <p className="subtext">Loading profile...</p>
          ) : (
            <form className="admin-record-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Enter full name" /></label>
                <label>Email<input type="email" value={form.email} readOnly /></label>
                <label>Phone<input value={form.phone_no} onChange={(event) => setForm({ ...form, phone_no: event.target.value })} placeholder="Enter phone number" /></label>
                <label className="full-field">Profile image<input type="file" accept="image/*" onChange={(event) => setForm({ ...form, profile_image: event.target.files?.[0] || null })} /></label>
                <label>Current password<input type="password" value={form.current_password} onChange={(event) => setForm({ ...form, current_password: event.target.value })} placeholder="Required to change password" /></label>
                <label>New password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Leave blank to keep current password" /></label>
                <label>Confirm password<input type="password" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} placeholder="Re-enter new password" /></label>
              </div>

              {message.text ? <p className={`status-message ${message.type}`}>{message.text}</p> : null}

              <div className="form-actions">
                <button type="submit" className="submit-btn admin-btn" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button>
              </div>
            </form>
          )}
        </article>
      </section>
    </section>
  )
}

export default ProfileSettingsPage
