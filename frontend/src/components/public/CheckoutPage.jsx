import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchCart, placeOrder } from '../../api/cart.js'
import { formatProductPrice, getProductImage, getProductName } from '../../api/products.js'
import { showSuccess } from '../../utils/alerts.js'
import PublicHeader from './PublicHeader.jsx'

function readGuestCart() {
  try {
    const items = JSON.parse(localStorage.getItem('catalog_cart') || '[]')
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}

function readAuthUser() {
  try {
    return JSON.parse(localStorage.getItem('auth_user') || 'null')
  } catch {
    return null
  }
}

function readBuyNowItem() {
  try {
    const item = JSON.parse(localStorage.getItem('buy_now_item') || 'null')
    return item?.id ? [item] : []
  } catch { return [] }
}

const emptyForm = {
  customer_type: 'guest', name: '', email: '', phone_no: '', password: '', password_confirmation: '',
  billing_address: '', billing_pincode: '', shipping_address: '', shipping_pincode: '', payment_method: 'card',
}

function getCardExpiryError(expiry) {
  const match = expiry.match(/^(\d{2}) \/ (\d{2})$/)
  if (!match) return 'Enter expiry as MM / YY.'

  const month = Number(match[1])
  if (month < 1 || month > 12) return 'Enter a valid expiry month.'

  const year = 2000 + Number(match[2])
  const now = new Date()
  const expiryDate = new Date(year, month)
  const currentMonth = new Date(now.getFullYear(), now.getMonth())

  if (expiryDate <= currentMonth) return 'Card expiry date must be in the future.'

  return ''
}

function CheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const buyNow = searchParams.get('mode') === 'buy-now'
  const authUser = readAuthUser()
  const authenticated = Boolean(localStorage.getItem('auth_token'))
  const [items, setItems] = useState(buyNow ? readBuyNowItem() : authenticated ? [] : readGuestCart())
  const [loading, setLoading] = useState(authenticated && !buyNow)
  const [submitting, setSubmitting] = useState(false)
  const [sameAddress, setSameAddress] = useState(true)
  const [errors, setErrors] = useState({})
  const [paymentErrors, setPaymentErrors] = useState({})
  const [message, setMessage] = useState('')
  const [paymentDetails, setPaymentDetails] = useState({ card_number: '', expiry: '', cvv: '', upi_id: '', bank: '' })
  const [form, setForm] = useState({
    ...emptyForm,
    customer_type: authenticated ? 'authenticated' : 'guest',
    name: authUser?.name || '',
    email: authUser?.email || '',
    phone_no: authUser?.phone_no || '',
  })

  useEffect(() => {
    if (!authenticated || buyNow) return
    fetchCart()
      .then((cart) => setItems(cart.items || []))
      .catch((error) => setMessage(error.response?.data?.message || 'Unable to load your cart.'))
      .finally(() => setLoading(false))
  }, [authenticated, buyNow])

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0), [items])
  const fieldError = (name) => errors[name]?.[0] || ''
  const updateForm = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const updatePayment = (name, value) => {
    let nextValue = value
    if (name === 'card_number') nextValue = value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
    if (name === 'expiry') nextValue = value.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1 / $2')
    if (name === 'cvv') nextValue = value.replace(/\D/g, '').slice(0, 4)
    setPaymentDetails((current) => ({ ...current, [name]: nextValue }))
    setPaymentErrors((current) => ({ ...current, [name]: '' }))
  }

  const selectPayment = (method) => {
    updateForm('payment_method', method)
    setPaymentErrors({})
  }

  const validatePayment = () => {
    const nextErrors = {}
    if (form.payment_method === 'card') {
      if (paymentDetails.card_number.replace(/\s/g, '').length !== 16) nextErrors.card_number = 'Enter a valid 16-digit card number.'
      const expiryError = getCardExpiryError(paymentDetails.expiry)
      if (expiryError) nextErrors.expiry = expiryError
      if (!/^\d{3,4}$/.test(paymentDetails.cvv)) nextErrors.cvv = 'Enter a valid CVV.'
    } else if (form.payment_method === 'upi' && !/^[\w.-]+@[\w.-]+$/.test(paymentDetails.upi_id)) {
      nextErrors.upi_id = 'Enter a valid UPI ID.'
    } else if (form.payment_method === 'net_banking' && !paymentDetails.bank) {
      nextErrors.bank = 'Select your bank.'
    }
    setPaymentErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const selectCustomerType = (customerType) => {
    setForm((current) => ({
      ...current,
      customer_type: customerType,
      name: customerType === 'existing' ? (authUser?.name || '') : current.name,
      email: customerType === 'existing' ? (authUser?.email || current.email) : current.email,
    }))
    setErrors({})
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!items.length) return
    if (!validatePayment()) return
    setSubmitting(true)
    setErrors({})
    setMessage('')

    const payload = {
      ...form,
      checkout_source: buyNow ? 'buy_now' : 'cart',
      shipping_address: sameAddress ? form.billing_address : form.shipping_address,
      shipping_pincode: sameAddress ? form.billing_pincode : form.shipping_pincode,
      items: items.map((item) => ({ product_id: item.product_id || item.id, quantity: Number(item.quantity || 1) })),
    }

    try {
      const order = await placeOrder(payload, authenticated)
      if (buyNow) {
        localStorage.removeItem('buy_now_item')
      } else {
        localStorage.removeItem('catalog_cart')
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: 0 } }))
      }
      await showSuccess(`Order ${order.order_number} placed successfully`)
      navigate('/')
    } catch (error) {
      setErrors(error.response?.data?.errors || {})
      setMessage(error.response?.data?.message || 'Unable to place your order.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="checkout-shell">
      <PublicHeader cartCount={items.reduce((total, item) => total + Number(item.quantity || 1), 0)} />
      <main className="checkout-main">
        <div className="checkout-heading"><p className="public-kicker">Secure checkout</p><h1>Complete your order</h1></div>
        {message && <p className="cart-error" role="alert">{message}</p>}
        {loading ? <section className="cart-empty-state"><h2>Loading checkout...</h2></section> : !items.length ? (
          <section className="cart-empty-state"><h2>Your cart is empty</h2><Link to="/">Continue shopping</Link></section>
        ) : (
          <form className="checkout-layout" onSubmit={handleSubmit} noValidate>
            <div className="checkout-sections">
              <section className="checkout-card">
                {authenticated ? <div className="checkout-signed-in"><span>{(authUser?.name || 'U')[0].toUpperCase()}</span><div><p className="public-kicker">Signed in account</p><h2>{authUser?.name || 'Customer'}</h2><p>{authUser?.email}</p></div><Link to="/profile">Edit profile</Link></div> : <><h2>How would you like to checkout?</h2><div className="checkout-radio-grid">{[['guest', 'Guest'], ['existing', 'Existing user'], ['new', 'New user']].map(([value, label]) => <label className={form.customer_type === value ? 'selected' : ''} key={value}><input type="radio" name="customer_type" value={value} checked={form.customer_type === value} onChange={() => selectCustomerType(value)} /><span>{label}</span></label>)}</div><div className="checkout-fields">{form.customer_type !== 'existing' && <CheckoutField label="Full name" name="name" value={form.name} onChange={updateForm} error={fieldError('name')} />}<CheckoutField label="Email address" name="email" type="email" value={form.email} onChange={updateForm} error={fieldError('email')} />{form.customer_type !== 'existing' && <CheckoutField label="Phone number" name="phone_no" value={form.phone_no} onChange={updateForm} error={fieldError('phone_no')} />}{(form.customer_type === 'existing' || form.customer_type === 'new') && <CheckoutField label="Password" name="password" type="password" value={form.password} onChange={updateForm} error={fieldError('password')} />}{form.customer_type === 'new' && <CheckoutField label="Confirm password" name="password_confirmation" type="password" value={form.password_confirmation} onChange={updateForm} error={fieldError('password_confirmation')} />}</div></>}
              </section>

              <section className="checkout-card">
                <h2>Billing address</h2>
                <CheckoutField label="Full billing address" name="billing_address" textarea value={form.billing_address} onChange={updateForm} error={fieldError('billing_address')} />
                <CheckoutField label="Billing pincode" name="billing_pincode" value={form.billing_pincode} onChange={updateForm} error={fieldError('billing_pincode')} />
                <label className="checkout-same-address"><input type="checkbox" checked={sameAddress} onChange={(event) => setSameAddress(event.target.checked)} /> Shipping address is the same as billing</label>
                {!sameAddress && <div className="checkout-fields checkout-shipping-fields"><CheckoutField label="Full shipping address" name="shipping_address" textarea value={form.shipping_address} onChange={updateForm} error={fieldError('shipping_address')} /><CheckoutField label="Shipping pincode" name="shipping_pincode" value={form.shipping_pincode} onChange={updateForm} error={fieldError('shipping_pincode')} /></div>}
              </section>

              <section className="checkout-card">
                <h2>Payment method</h2>
                <div className="checkout-payment-accordion">
                  <PaymentOption title="Credit / Debit / ATM Card" selected={form.payment_method === 'card'} onSelect={() => selectPayment('card')}>
                    <div className="payment-card-fields">
                      <PaymentField label="Card Number" name="card_number" placeholder="XXXX XXXX XXXX XXXX" value={paymentDetails.card_number} onChange={updatePayment} error={paymentErrors.card_number} wide />
                      <PaymentField label="Valid Thru" name="expiry" placeholder="MM / YY" value={paymentDetails.expiry} onChange={updatePayment} error={paymentErrors.expiry} />
                      <PaymentField label="CVV" name="cvv" type="password" placeholder="CVV" value={paymentDetails.cvv} onChange={updatePayment} error={paymentErrors.cvv} />
                    </div>
                  </PaymentOption>
                  <PaymentOption title="UPI" selected={form.payment_method === 'upi'} onSelect={() => selectPayment('upi')}>
                    <PaymentField label="UPI ID" name="upi_id" placeholder="yourname@bank" value={paymentDetails.upi_id} onChange={updatePayment} error={paymentErrors.upi_id} wide />
                  </PaymentOption>
                  <PaymentOption title="Net Banking" selected={form.payment_method === 'net_banking'} onSelect={() => selectPayment('net_banking')}>
                    <label className="payment-detail-field wide"><span>Select bank</span><select value={paymentDetails.bank} onChange={(event) => updatePayment('bank', event.target.value)} aria-invalid={Boolean(paymentErrors.bank)}><option value="">Choose your bank</option><option value="sbi">State Bank of India</option><option value="hdfc">HDFC Bank</option><option value="icici">ICICI Bank</option><option value="axis">Axis Bank</option><option value="kotak">Kotak Mahindra Bank</option></select>{paymentErrors.bank && <small>{paymentErrors.bank}</small>}</label>
                  </PaymentOption>
                </div>
                <p className="checkout-payment-note">These payment details are validated only in your browser and are never stored in CatalogHub.</p>
              </section>
            </div>

            <aside className="checkout-order-summary">
              <h2>Order summary</h2>
              <div className="checkout-order-items">{items.map((item) => <div className="checkout-order-item" key={item.id}><div>{getProductImage(item) ? <img src={getProductImage(item)} alt="" /> : <span />}</div><p><strong>{getProductName(item)}</strong><small>Qty: {item.quantity || 1}</small></p><strong>{formatProductPrice(Number(item.price || 0) * Number(item.quantity || 1))}</strong></div>)}</div>
              <div className="checkout-total-row"><span>Subtotal</span><strong>{formatProductPrice(total)}</strong></div>
              <div className="checkout-total-row"><span>Shipping</span><strong>Free</strong></div>
              <div className="checkout-total-row final"><span>Final amount</span><strong>{formatProductPrice(total)}</strong></div>
              <button type="submit" disabled={submitting}>{submitting ? 'Processing...' : `Pay ${formatProductPrice(total)}`}</button>
            </aside>
          </form>
        )}
      </main>
    </div>
  )
}

function CheckoutField({ label, name, type = 'text', value, onChange, error, textarea = false }) {
  const controlProps = { name, value, onChange: (event) => onChange(name, event.target.value), 'aria-invalid': Boolean(error) }
  return <label className={`checkout-field ${textarea ? 'wide' : ''}`}><span>{label}</span>{textarea ? <textarea {...controlProps} rows="3" /> : <input {...controlProps} type={type} />}{error && <small className="field-error">{error}</small>}</label>
}

function PaymentOption({ title, selected, onSelect, children }) {
  return <section className={`payment-option ${selected ? 'open' : ''}`}><label className="payment-option-header"><input type="radio" name="payment_method" checked={selected} onChange={onSelect} /><span>{title}</span><strong aria-hidden="true">{selected ? '\u2303' : '\u2304'}</strong></label>{selected && <div className="payment-option-body">{children}</div>}</section>
}

function PaymentField({ label, name, type = 'text', placeholder, value, onChange, error, wide = false }) {
  return <label className={`payment-detail-field ${wide ? 'wide' : ''}`}><span>{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(name, event.target.value)} aria-invalid={Boolean(error)} autoComplete="off" />{error && <small>{error}</small>}</label>
}

export default CheckoutPage
