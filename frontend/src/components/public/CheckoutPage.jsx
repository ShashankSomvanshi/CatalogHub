import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchCart, placeOrder } from '../../api/cart.js'
import { formatProductPrice, getProductImage, getProductName } from '../../api/products.js'
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

function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const buyNow = searchParams.get('mode') === 'buy-now'
  const authUser = readAuthUser()
  const authenticated = Boolean(localStorage.getItem('auth_token'))
  const [items, setItems] = useState(buyNow ? readBuyNowItem() : authenticated ? [] : readGuestCart())
  const [loading, setLoading] = useState(authenticated && !buyNow)
  const [submitting, setSubmitting] = useState(false)
  const [sameAddress, setSameAddress] = useState(true)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
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
      const result = await placeOrder(payload, authenticated)
      if (!result.checkout_url) throw new Error('Stripe Checkout URL was not returned.')
      window.location.assign(result.checkout_url)
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
          <section className="cart-empty-state"><h2>Your cart is empty</h2><Link to="/">Continue Shopping</Link></section>
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
                  <section className="payment-option open">
                    <div className="payment-option-header"><span>Stripe secure checkout</span><strong aria-hidden="true">&#10003;</strong></div>
                    <div className="payment-option-body"><p>You will enter your payment details on Stripe&apos;s secure hosted checkout page.</p></div>
                  </section>
                </div>
                <p className="checkout-payment-note">CatalogHub never receives or stores your card details.</p>
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

export default CheckoutPage
