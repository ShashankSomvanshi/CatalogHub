import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { api } from '../../api/client.js'
import PublicHeader from './PublicHeader.jsx'

function celebratePayment(sessionId) {
  const celebrationKey = `payment_confetti_${sessionId}`
  if (sessionStorage.getItem(celebrationKey) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  sessionStorage.setItem(celebrationKey, 'shown')
  const options = { particleCount: 80, spread: 65, startVelocity: 45, colors: ['#5546e8', '#22c55e', '#fbbf24', '#38bdf8'] }

  confetti({ ...options, angle: 60, origin: { x: 0, y: 0.7 } })
  confetti({ ...options, angle: 120, origin: { x: 1, y: 0.7 } })
}

function PaymentResultPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const cancelled = location.pathname.endsWith('/cancel')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (cancelled || !sessionId) return

    api.get('/api/stripe/checkout-status', { params: { session_id: sessionId } })
      .then(({ data }) => {
        setResult(data)
        if (data.status === 'completed') {
          celebratePayment(sessionId)
          localStorage.removeItem('catalog_cart')
          localStorage.removeItem('buy_now_item')
          window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: 0 } }))
        }
      })
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to verify this payment.'))
  }, [cancelled, searchParams])

  const status = cancelled ? 'cancelled' : result?.status
  const heading = status === 'completed'
    ? 'Payment successful'
    : status === 'failed'
      ? 'Payment failed'
      : status === 'cancelled'
        ? 'Payment cancelled'
        : 'Confirming your payment'

  return (
    <div className="checkout-shell">
      <PublicHeader cartCount={0} />
      <main className="checkout-main">
        <section className="cart-empty-state">
          <p className="public-kicker">Stripe payment</p>
          <h1>{heading}</h1>
          {error && <p className="cart-error" role="alert">{error}</p>}
          {result && <p>Order <strong>{result.order_number}</strong> · Transaction <strong>{result.transaction_number}</strong></p>}
          {status === 'cancelled' && <p>Your order was created, but no payment was taken.</p>}
          {!status && !error && <p>Please wait while we verify the payment with Stripe.</p>}
          <Link to={status === 'cancelled' || status === 'failed' ? '/checkout' : '/'}>
            {status === 'cancelled' || status === 'failed' ? 'Return to checkout' : 'Continue shopping'}
          </Link>
        </section>
      </main>
    </div>
  )
}

export default PaymentResultPage
