import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAdminProfile, getProfileImageUrl, updateAdminProfile } from '../../api/profile.js'
import { showSuccess } from '../../utils/alerts.js'

function ProfileSettingsPage() {
  const navigate = useNavigate()
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
  const [errors, setErrors] = useState({})
  const [currentImage, setCurrentImage] = useState('')

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
          setCurrentImage(profile.profile_image || '')
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

  const handleCancel = () => {
    navigate(-1)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage({ type: '', text: '' })
    setErrors({})

    const changingPassword = Boolean(form.current_password || form.password || form.password_confirmation)
    const validationErrors = {}

    if (changingPassword && !form.current_password) validationErrors.current_password = 'Enter your current password.'
    if (changingPassword && !form.password) validationErrors.password = 'Enter a new password or leave all password fields blank.'
    if (form.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(form.password)) {
      validationErrors.password = 'Use at least 8 characters with uppercase, lowercase, number, and special character.'
    }
    if (form.password && !form.password_confirmation) validationErrors.password_confirmation = 'Confirm your new password.'
    if (form.password && form.password_confirmation && form.password !== form.password_confirmation) {
      validationErrors.password_confirmation = 'New password and confirmation do not match.'
    }

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)

    try {
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
      setCurrentImage(profile.profile_image || currentImage)

      setForm((current) => ({
        ...current,
        name: profile.name || current.name,
        phone_no: profile.phone_no || current.phone_no,
        current_password: '',
        password: '',
        password_confirmation: '',
        profile_image: null,
      }))
      await showSuccess(data.message || 'Profile updated successfully.')
    } catch (error) {
      const responseErrors = error.response?.data?.errors || {}
      const fieldErrors = Object.fromEntries(Object.entries(responseErrors).map(([field, messages]) => [field, Array.isArray(messages) ? messages[0] : messages]))

      if (error.response?.data?.message === 'Current password is incorrect.') {
        fieldErrors.current_password = error.response.data.message
      }

      if (Object.keys(fieldErrors).length) setErrors(fieldErrors)
      else setMessage({ type: 'error', text: error.response?.data?.message || 'Profile update failed.' })
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
            <form className="admin-record-form" onSubmit={handleSubmit} noValidate>
              <div className="form-grid">
                <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Enter full name" /></label>
                <label>Email<input type="email" value={form.email} readOnly /></label>
                <label>Phone<input value={form.phone_no} onChange={(event) => setForm({ ...form, phone_no: event.target.value })} placeholder="Enter phone number" /></label>
                <label className="full-field">Profile Image<input type="file" accept="image/jpg,image/jpeg,image/png,image/webp" onChange={(event) => setForm({ ...form, profile_image: event.target.files?.[0] || null })} />{getProfileImageUrl(currentImage) ? <span className="profile-image-preview"><img src={getProfileImageUrl(currentImage)} alt="Current profile" /><small>Current profile image</small></span> : null}</label>
                <div className="password-change-note full-field"><strong>Change password (optional)</strong><p>Leave all password fields blank if you do not want to change your password.</p><small>Password must contain at least 8 characters, including uppercase, lowercase, number, and special character.</small></div>
                <div className="password-fields-grid full-field">
                  <label>Current Password<input type="password" value={form.current_password} onChange={(event) => { setForm({ ...form, current_password: event.target.value }); setErrors({ ...errors, current_password: '' }) }} placeholder="Required to change password" aria-invalid={Boolean(errors.current_password)} />{errors.current_password && <small className="admin-field-error">{errors.current_password}</small>}</label>
                  <label>New Password<input type="password" value={form.password} onChange={(event) => { setForm({ ...form, password: event.target.value }); setErrors({ ...errors, password: '' }) }} placeholder="Enter a strong new password" aria-invalid={Boolean(errors.password)} />{errors.password && <small className="admin-field-error">{errors.password}</small>}</label>
                  <label>Confirm Password<input type="password" value={form.password_confirmation} onChange={(event) => { setForm({ ...form, password_confirmation: event.target.value }); setErrors({ ...errors, password_confirmation: '' }) }} placeholder="Re-enter new password" aria-invalid={Boolean(errors.password_confirmation)} />{errors.password_confirmation && <small className="admin-field-error">{errors.password_confirmation}</small>}</label>
                </div>
              </div>

              {message.text ? <p className={`status-message ${message.type}`}>{message.text}</p> : null}

              <div className="form-actions">
                <button type="submit" className="submit-btn admin-btn" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</button>
                <button type="button" className="ghost-btn" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </article>
      </section>
    </section>
  )
}

export default ProfileSettingsPage
