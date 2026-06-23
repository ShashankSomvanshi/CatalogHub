import { useState } from 'react'
import PublicHeader from './PublicHeader.jsx'
import PublicFooter from './PublicFooter.jsx'
import { showSuccess } from '../../utils/alerts.js'

function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', requirement: '' })
  const [sending, setSending] = useState(false)

  const submit = async (event) => {
    event.preventDefault(); setSending(true)
    await showSuccess('Your inquiry has been received')
    setForm({ name: '', email: '', phone: '', requirement: '' }); setSending(false)
  }

  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  return <div className="public-info-shell"><PublicHeader /><main className="contact-page-main"><section className="contact-intro"><p className="public-kicker">Contact us</p><h1>How can we help?</h1><p>Tell us about your problem, question, or requirement. Our team will use the information to understand how we can support you.</p><div className="contact-details"><div><span>Email</span><a href="mailto:hello@cataloghub.com">hello@cataloghub.com</a></div><div><span>Phone</span><a href="tel:+912532000000">+91 253 200 0000</a></div><div><span>Office</span><p>Ambad MIDC, Nashik, Maharashtra 422010</p></div></div></section><section className="contact-form-card"><p className="public-kicker">Send an inquiry</p><h2>Tell us what you need</h2><form onSubmit={submit}><label>Full name<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Enter your name" required /></label><label>Email address<input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" required /></label><label>Phone number<input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="Enter your phone number" pattern="[0-9+() -]{7,20}" required /></label><label className="wide">Problem or requirement<textarea value={form.requirement} onChange={(event) => update('requirement', event.target.value)} placeholder="Describe how we can help you" rows="6" minLength="10" required /></label><button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Submit inquiry'}</button></form><p>This demonstration form does not yet send data to a server.</p></section></main><PublicFooter /></div>
}

export default ContactPage
