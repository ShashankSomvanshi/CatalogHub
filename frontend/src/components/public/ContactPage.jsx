import { useState } from 'react'
import PublicHeader from './PublicHeader.jsx'
import PublicFooter from './PublicFooter.jsx'
import { showSuccess } from '../../utils/alerts.js'

function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', requirement: '' })
  const [sending, setSending] = useState(false)
  const [errors, setErrors] = useState({})

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Full name is required.'
    if (!form.email.trim()) nextErrors.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = 'Enter a valid email address.'
    if (!form.phone.trim()) nextErrors.phone = 'Phone number is required.'
    else if (!/^[0-9+() -]{7,20}$/.test(form.phone)) nextErrors.phone = 'Enter a valid phone number.'
    if (!form.requirement.trim()) nextErrors.requirement = 'Problem or requirement is required.'
    else if (form.requirement.trim().length < 10) nextErrors.requirement = 'Please enter at least 10 characters.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setSending(true)
    await showSuccess('Your inquiry has been received')
    setForm({ name: '', email: '', phone: '', requirement: '' }); setSending(false)
  }

  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  return <div className="public-info-shell"><PublicHeader /><main className="contact-page-main"><section className="contact-intro"><p className="public-kicker">Contact us</p><h1>How can we help?</h1><p>Tell us about your problem, question, or requirement. Our team will use the information to understand how we can support you.</p><div className="contact-details"><div><span>Email</span><a href="mailto:hello@cataloghub.com">hello@cataloghub.com</a></div><div><span>Phone</span><a href="tel:+912532000000">+91 253 200 0000</a></div><div><span>Office</span><p>Ambad MIDC, Nashik, Maharashtra 422010</p></div></div></section><section className="contact-form-card"><p className="public-kicker">Send an inquiry</p><h2>Tell us what you need</h2><form onSubmit={submit} noValidate><label><span className="field-label">Full name <span className="required-mark">*</span></span><input value={form.name} onChange={(event) => { update('name', event.target.value); setErrors({ ...errors, name: '' }) }} placeholder="Enter your name" aria-invalid={Boolean(errors.name)} />{errors.name && <small className="field-error">{errors.name}</small>}</label><label><span className="field-label">Email address <span className="required-mark">*</span></span><input type="text" inputMode="email" value={form.email} onChange={(event) => { update('email', event.target.value); setErrors({ ...errors, email: '' }) }} placeholder="you@example.com" aria-invalid={Boolean(errors.email)} />{errors.email && <small className="field-error">{errors.email}</small>}</label><label><span className="field-label">Phone number <span className="required-mark">*</span></span><input type="text" value={form.phone} onChange={(event) => { update('phone', event.target.value); setErrors({ ...errors, phone: '' }) }} placeholder="Enter your phone number" aria-invalid={Boolean(errors.phone)} />{errors.phone && <small className="field-error">{errors.phone}</small>}</label><label className="wide"><span className="field-label">Problem or requirement <span className="required-mark">*</span></span><textarea value={form.requirement} onChange={(event) => { update('requirement', event.target.value); setErrors({ ...errors, requirement: '' }) }} placeholder="Describe how we can help you" rows="6" aria-invalid={Boolean(errors.requirement)} />{errors.requirement && <small className="field-error">{errors.requirement}</small>}</label><button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Submit inquiry'}</button></form><p>This demonstration form does not yet send data to a server.</p></section></main><PublicFooter /></div>
}

export default ContactPage
