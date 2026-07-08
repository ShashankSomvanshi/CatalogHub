import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PublicHeader from './PublicHeader.jsx'
import PublicFooter from './PublicFooter.jsx'
import { fetchUserProfile, getProfileImageUrl, updateUserProfile } from '../../api/profile.js'
import { showSuccess } from '../../utils/alerts.js'

function CustomerProfilePage() {
  const [form, setForm] = useState({ name: '', email: '', phone_no: '', current_password: '', password: '', password_confirmation: '', profile_image: null })
  const [currentImage, setCurrentImage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchUserProfile().then((profile) => {
      setForm((current) => ({ ...current, name: profile.name || '', email: profile.email || '', phone_no: profile.phone_no || '' }))
      setCurrentImage(profile.profile_image || '')
    }).catch((error) => setMessage(error.response?.data?.message || 'Unable to load your profile.')).finally(() => setLoading(false))
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Full name is required.'
    if (form.password || form.password_confirmation || form.current_password) {
      if (!form.current_password) nextErrors.current_password = 'Current password is required.'
      if (!form.password) nextErrors.password = 'New password is required.'
      else if (form.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.'
      if (!form.password_confirmation) nextErrors.password_confirmation = 'Confirm your new password.'
      else if (form.password !== form.password_confirmation) nextErrors.password_confirmation = 'Password and confirmation do not match.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setSaving(true); setMessage('')
    try {
      const data = await updateUserProfile(form)
      const profile = data.profile
      const stored = JSON.parse(localStorage.getItem('auth_user') || '{}')
      localStorage.setItem('auth_user', JSON.stringify({ ...stored, ...profile }))
      window.dispatchEvent(new CustomEvent('auth-user-updated'))
      setCurrentImage(profile.profile_image || currentImage)
      setForm((current) => ({ ...current, name: profile.name, phone_no: profile.phone_no || '', current_password: '', password: '', password_confirmation: '', profile_image: null }))
      await showSuccess('Profile updated successfully')
    } catch (error) { setMessage(error.response?.data?.message || 'Unable to update your profile.') } finally { setSaving(false) }
  }

  return <div className="customer-profile-shell"><PublicHeader /><main className="customer-profile-main"><div className="category-products-breadcrumb"><Link to="/">Home</Link><span>/</span><span>Profile</span></div><section className="customer-profile-card"><div className="customer-profile-heading"><div className="customer-profile-avatar">{getProfileImageUrl(currentImage) ? <img src={getProfileImageUrl(currentImage)} alt="Profile" /> : <span>{(form.name || 'U')[0].toUpperCase()}</span>}</div><div><p className="public-kicker">Your account</p><h3>Profile settings</h3><p>Update your personal details and password.</p></div></div>{message && <p className="cart-error">{message}</p>}{loading ? <p>Loading profile...</p> : <form className="customer-profile-form" onSubmit={submit} noValidate><label><span className="field-label">Full name <span className="required-mark">*</span></span><input value={form.name} onChange={(event) => { setForm({ ...form, name: event.target.value }); setErrors({ ...errors, name: '' }) }} aria-invalid={Boolean(errors.name)} />{errors.name && <small className="field-error">{errors.name}</small>}</label><label><span className="field-label">Email address</span><input value={form.email} readOnly /></label><label><span className="field-label">Phone number</span><input value={form.phone_no} onChange={(event) => setForm({ ...form, phone_no: event.target.value })} /></label><label><span className="field-label">Profile picture</span><input type="file" accept="image/jpg,image/jpeg,image/png,image/webp" onChange={(event) => setForm({ ...form, profile_image: event.target.files?.[0] || null })} />{getProfileImageUrl(currentImage) ? <span className="profile-image-preview"><img src={getProfileImageUrl(currentImage)} alt="Current profile" /><small>Current profile image</small></span> : null}</label><label><span className="field-label">Current password</span><input type="password" value={form.current_password} onChange={(event) => { setForm({ ...form, current_password: event.target.value }); setErrors({ ...errors, current_password: '' }) }} placeholder="Required when changing password" aria-invalid={Boolean(errors.current_password)} />{errors.current_password && <small className="field-error">{errors.current_password}</small>}</label><label><span className="field-label">New password</span><input type="password" value={form.password} onChange={(event) => { setForm({ ...form, password: event.target.value }); setErrors({ ...errors, password: '' }) }} aria-invalid={Boolean(errors.password)} />{errors.password && <small className="field-error">{errors.password}</small>}</label><label><span className="field-label">Confirm new password</span><input type="password" value={form.password_confirmation} onChange={(event) => { setForm({ ...form, password_confirmation: event.target.value }); setErrors({ ...errors, password_confirmation: '' }) }} aria-invalid={Boolean(errors.password_confirmation)} />{errors.password_confirmation && <small className="field-error">{errors.password_confirmation}</small>}</label><div className="customer-profile-actions"><button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</button><Link to="/">Cancel</Link></div></form>}</section></main><PublicFooter /></div>
}

export default CustomerProfilePage
