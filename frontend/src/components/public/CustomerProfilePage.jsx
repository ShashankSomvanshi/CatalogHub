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

  useEffect(() => {
    fetchUserProfile().then((profile) => {
      setForm((current) => ({ ...current, name: profile.name || '', email: profile.email || '', phone_no: profile.phone_no || '' }))
      setCurrentImage(profile.profile_image || '')
    }).catch((error) => setMessage(error.response?.data?.message || 'Unable to load your profile.')).finally(() => setLoading(false))
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    if (form.password && form.password !== form.password_confirmation) { setMessage('Password and confirmation do not match.'); return }
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

  return <div className="customer-profile-shell"><PublicHeader /><main className="customer-profile-main"><div className="category-products-breadcrumb"><Link to="/">Home</Link><span>/</span><span>Profile</span></div><section className="customer-profile-card"><div className="customer-profile-heading"><div className="customer-profile-avatar">{getProfileImageUrl(currentImage) ? <img src={getProfileImageUrl(currentImage)} alt="Profile" /> : <span>{(form.name || 'U')[0].toUpperCase()}</span>}</div><div><p className="public-kicker">Your account</p><h1>Profile settings</h1><p>Update your personal details and password.</p></div></div>{message && <p className="cart-error">{message}</p>}{loading ? <p>Loading profile...</p> : <form className="customer-profile-form" onSubmit={submit}><label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Email address<input value={form.email} readOnly /></label><label>Phone number<input value={form.phone_no} onChange={(event) => setForm({ ...form, phone_no: event.target.value })} /></label><label>Profile picture<input type="file" accept="image/jpg,image/jpeg,image/png,image/webp" onChange={(event) => setForm({ ...form, profile_image: event.target.files?.[0] || null })} /></label><label>Current password<input type="password" value={form.current_password} onChange={(event) => setForm({ ...form, current_password: event.target.value })} placeholder="Required when changing password" /></label><label>New password<input type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><label>Confirm new password<input type="password" minLength="8" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} /></label><div className="customer-profile-actions"><button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button><Link to="/">Cancel</Link></div></form>}</section></main><PublicFooter /></div>
}

export default CustomerProfilePage
