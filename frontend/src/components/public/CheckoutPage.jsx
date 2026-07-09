import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  api,
  getAuthToken,
  persistTokenPayload,
  prepareSanctumSession,
} from "../../api/client.js";
import { fetchCart, placeOrder } from "../../api/cart.js";
import {
  formatProductPrice,
  getProductImage,
  getProductName,
} from "../../api/products.js";
import PublicHeader from "./PublicHeader.jsx";

function readGuestCart() {
  try {
    const items = JSON.parse(localStorage.getItem("catalog_cart") || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function readAuthUser() {
  try {
    return JSON.parse(localStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
}

function readBuyNowItem() {
  try {
    const item = JSON.parse(localStorage.getItem("buy_now_item") || "null");
    return item?.id ? [item] : [];
  } catch {
    return [];
  }
}

const emptyForm = {
  customer_type: "guest",
  name: "",
  email: "",
  phone_no: "",
  password: "",
  password_confirmation: "",
  billing_address_1: "",
  billing_address_2: "",
  billing_address: "",
  billing_city: "",
  billing_state: "",
  billing_pincode: "",
  billing_location: "",
  shipping_address_1: "",
  shipping_address_2: "",
  shipping_address: "",
  shipping_city: "",
  shipping_state: "",
  shipping_pincode: "",
  shipping_location: "",
  payment_method: "card",
};

function formatAddress(address1, address2, location) {
  return [address1, address2, location ? `Location: ${location}` : ""]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n");
}

function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const buyNow = searchParams.get("mode") === "buy-now";
  const [authSession, setAuthSession] = useState(() => ({
    authenticated: Boolean(localStorage.getItem("auth_token")),
    user: readAuthUser(),
  }));
  const { authenticated, user: authUser } = authSession;
  const [items, setItems] = useState(
    buyNow ? readBuyNowItem() : authenticated ? [] : readGuestCart(),
  );
  const [loading, setLoading] = useState(authenticated && !buyNow);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sameAddress, setSameAddress] = useState(true);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    ...emptyForm,
    customer_type: authenticated ? "authenticated" : "guest",
    name: authUser?.name || "",
    email: authUser?.email || "",
    phone_no: authUser?.phone_no || "",
  });

  useEffect(() => {
    if (!authenticated || buyNow || items.length) return;
    fetchCart()
      .then((cart) => setItems(cart.items || []))
      .catch((error) =>
        setMessage(
          error.response?.data?.message || "Unable to load your cart.",
        ),
      )
      .finally(() => setLoading(false));
  }, [authenticated, buyNow, items.length]);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 1),
        0,
      ),
    [items],
  );
  const fieldError = (name) => errors[name]?.[0] || "";
  const updateForm = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const selectCustomerType = (customerType) => {
    setForm((current) => ({
      ...current,
      customer_type: customerType,
      name: customerType === "existing" ? authUser?.name || "" : current.name,
      email:
        customerType === "existing"
          ? authUser?.email || current.email
          : current.email,
    }));
    setErrors({});
  };

  const handleExistingLogin = async () => {
    setLoginSubmitting(true);
    setErrors({});
    setMessage("");

    try {
      await prepareSanctumSession();
      const loginResponse = await api.post("/api/login", {
        email: form.email,
        password: form.password,
      });

      persistTokenPayload(loginResponse.data);
      localStorage.setItem("auth_role", "user");

      const token = getAuthToken(loginResponse.data);
      const user = readAuthUser();
      if (!token) {
        throw new Error(
          "Login succeeded, but the API response did not include an auth token.",
        );
      }

      setAuthSession({ authenticated: true, user });
      setForm((current) => ({
        ...current,
        customer_type: "authenticated",
        name: user?.name || current.name,
        email: user?.email || current.email,
        phone_no: user?.phone_no || current.phone_no,
        password: "",
        password_confirmation: "",
      }));
      setMessage("You are logged in. Continue checkout to place this order.");
    } catch (error) {
      setErrors(error.response?.data?.errors || {});
      setMessage(error.response?.data?.message || error.message || "Login failed.");
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!items.length) return;
    if (!authenticated && form.customer_type === "existing") {
      setMessage("Please login first before checkout.");
      return;
    }
    setSubmitting(true);
    setErrors({});
    setMessage("");

    const payload = {
      ...form,
      customer_type: authenticated ? "authenticated" : form.customer_type,
      checkout_source: buyNow ? "buy_now" : "cart",
      billing_address: formatAddress(
        form.billing_address_1,
        form.billing_address_2,
        form.billing_location,
      ),
      shipping_address: sameAddress
        ? formatAddress(
            form.billing_address_1,
            form.billing_address_2,
            form.billing_location,
          )
        : formatAddress(
            form.shipping_address_1,
            form.shipping_address_2,
            form.shipping_location,
          ),
      shipping_city: sameAddress ? form.billing_city : form.shipping_city,
      shipping_state: sameAddress ? form.billing_state : form.shipping_state,
      shipping_pincode: sameAddress
        ? form.billing_pincode
        : form.shipping_pincode,
      shipping_location: sameAddress
        ? form.billing_location
        : form.shipping_location,
      shipping_address_1: sameAddress
        ? form.billing_address_1
        : form.shipping_address_1,
      shipping_address_2: sameAddress
        ? form.billing_address_2
        : form.shipping_address_2,
      items: items.map((item) => ({
        product_id: item.product_id || item.id,
        quantity: Number(item.quantity || 1),
      })),
    };

    try {
      const result = await placeOrder(payload, authenticated);
      if (result.auth) {
        persistTokenPayload(result.auth);
        localStorage.setItem("auth_role", "user");
      }
      if (!result.checkout_url)
        throw new Error("Stripe Checkout URL was not returned.");
      window.location.assign(result.checkout_url);
    } catch (error) {
      setErrors(error.response?.data?.errors || {});
      setMessage(
        error.response?.data?.message || "Unable to place your order.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="checkout-shell">
      <PublicHeader
        cartCount={items.reduce(
          (total, item) => total + Number(item.quantity || 1),
          0,
        )}
      />
      <main className="checkout-main">
        <div className="checkout-heading">
          <p className="public-kicker">Secure checkout</p>
          <h1>Complete your order</h1>
        </div>
        {message && (
          <p className="cart-error" role="alert">
            {message}
          </p>
        )}
        {loading ? (
          <section className="cart-empty-state">
            <h2>Loading checkout...</h2>
          </section>
        ) : !items.length ? (
          <section className="cart-empty-state">
            <h2>Your cart is empty</h2>
            <Link to="/">Continue Shopping</Link>
          </section>
        ) : (
          <form className="checkout-layout" onSubmit={handleSubmit} noValidate>
            <div className="checkout-sections">
              <section className="checkout-card">
                {authenticated ? (
                  <>
                    <div className="checkout-signed-in">
                      <span>{(authUser?.name || "U")[0].toUpperCase()}</span>
                      <div>
                        <p className="public-kicker">Signed in account</p>
                        <h2>{authUser?.name || "Customer"}</h2>
                        <p>{authUser?.email}</p>
                      </div>
                      <Link to="/profile">Edit profile</Link>
                    </div>
                    <div className="checkout-fields checkout-account-fields">
                      <CheckoutField
                        label="Phone Number"
                        name="phone_no"
                        required
                        value={form.phone_no}
                        onChange={updateForm}
                        error={fieldError("phone_no")}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <h2>How would you like to checkout?</h2>
                    <div className="checkout-radio-grid">
                      {[
                        ["guest", "Guest"],
                        ["existing", "Existing user"],
                        ["new", "New user"],
                      ].map(([value, label]) => (
                        <label
                          className={
                            form.customer_type === value ? "selected" : ""
                          }
                          key={value}
                        >
                          <input
                            type="radio"
                            name="customer_type"
                            value={value}
                            checked={form.customer_type === value}
                            onChange={() => selectCustomerType(value)}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="checkout-fields">
                      {form.customer_type !== "existing" && (
                        <CheckoutField
                          label="Full Name"
                          name="name"
                          required
                          value={form.name}
                          onChange={updateForm}
                          error={fieldError("name")}
                        />
                      )}
                      <CheckoutField
                        label="Email Address"
                        name="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={updateForm}
                        error={fieldError("email")}
                      />
                      {form.customer_type !== "existing" && (
                        <CheckoutField
                          label="Phone Number"
                          name="phone_no"
                          required
                          value={form.phone_no}
                          onChange={updateForm}
                          error={fieldError("phone_no")}
                        />
                      )}
                      {(form.customer_type === "existing" ||
                        form.customer_type === "new") && (
                        <CheckoutField
                          label="Password"
                          name="password"
                          type="password"
                          required
                          value={form.password}
                          onChange={updateForm}
                          error={fieldError("password")}
                        />
                      )}
                      {form.customer_type === "new" && (
                        <CheckoutField
                          label="Confirm Password"
                          name="password_confirmation"
                          type="password"
                          required
                          value={form.password_confirmation}
                          onChange={updateForm}
                          error={fieldError("password_confirmation")}
                        />
                      )}
                      {form.customer_type === "existing" && (
                        <div className="checkout-login-actions">
                          <button
                            type="button"
                            onClick={handleExistingLogin}
                            disabled={loginSubmitting}
                          >
                            {loginSubmitting ? "Logging in..." : "Login"}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </section>

              <section className="checkout-card">
                <h2>Billing address</h2>
                <CheckoutField
                  label="Address 1"
                  name="billing_address_1"
                  className="mb-3"
                  required
                  value={form.billing_address_1}
                  onChange={updateForm}
                  error={fieldError("billing_address_1") || fieldError("billing_address")}
                />
                <CheckoutField
                  label="Address 2"
                  name="billing_address_2"
                  value={form.billing_address_2}
                  onChange={updateForm}
                  error={fieldError("billing_address_2")}
                />
                <div className="checkout-fields checkout-address-fields">
                  <CheckoutField
                    label="City"
                    name="billing_city"
                    required
                    value={form.billing_city}
                    onChange={updateForm}
                    error={fieldError("billing_city")}
                  />
                  <CheckoutField
                    label="State"
                    name="billing_state"
                    required
                    value={form.billing_state}
                    onChange={updateForm}
                    error={fieldError("billing_state")}
                  />
                  <CheckoutField
                    label="Pincode"
                    name="billing_pincode"
                    required
                    value={form.billing_pincode}
                    onChange={updateForm}
                    error={fieldError("billing_pincode")}
                  />
                  <CheckoutField
                    label="Location"
                    name="billing_location"
                    required
                    value={form.billing_location}
                    onChange={updateForm}
                    error={fieldError("billing_location")}
                  />
                </div>
                <label className="checkout-same-address">
                  <input
                    type="checkbox"
                    checked={sameAddress}
                    onChange={(event) => setSameAddress(event.target.checked)}
                  />{" "}
                  Shipping address is the same as billing
                </label>
                {!sameAddress && (
                  <div className="checkout-shipping-fields">
                    <CheckoutField
                      label="Address 1"
                      name="shipping_address_1"
                      required
                      value={form.shipping_address_1}
                      onChange={updateForm}
                      error={fieldError("shipping_address_1") || fieldError("shipping_address")}
                    />
                    <CheckoutField
                      label="Address 2"
                      name="shipping_address_2"
                      value={form.shipping_address_2}
                      onChange={updateForm}
                      error={fieldError("shipping_address_2")}
                    />
                    <div className="checkout-fields checkout-address-fields">
                      <CheckoutField
                        label="City"
                        name="shipping_city"
                        required
                        value={form.shipping_city}
                        onChange={updateForm}
                        error={fieldError("shipping_city")}
                      />
                      <CheckoutField
                        label="State"
                        name="shipping_state"
                        required
                        value={form.shipping_state}
                        onChange={updateForm}
                        error={fieldError("shipping_state")}
                      />
                      <CheckoutField
                        label="Pincode"
                        name="shipping_pincode"
                        required
                        value={form.shipping_pincode}
                        onChange={updateForm}
                        error={fieldError("shipping_pincode")}
                      />
                      <CheckoutField
                        label="Location"
                        name="shipping_location"
                        required
                        value={form.shipping_location}
                        onChange={updateForm}
                        error={fieldError("shipping_location")}
                      />
                    </div>
                  </div>
                )}
              </section>

              <section className="checkout-card">
                <h2>Payment Method</h2>
                <div className="checkout-payment-accordion">
                  <section className="payment-option open">
                    <div className="payment-option-header">
                      <span>Stripe secure checkout</span>
                      <strong aria-hidden="true">&#10003;</strong>
                    </div>
                    <div className="payment-option-body">
                      <p>
                        You will enter your payment details on Stripe&apos;s
                        secure hosted checkout page.
                      </p>
                    </div>
                  </section>
                </div>
                <p className="checkout-payment-note">
                  CatalogHub never receives or stores your card details.
                </p>
              </section>
            </div>

            <aside className="checkout-order-summary">
              <h2>Order summary</h2>
              <div className="checkout-order-items">
                {items.map((item) => (
                  <div className="checkout-order-item" key={item.id}>
                    <div>
                      {getProductImage(item) ? (
                        <img src={getProductImage(item)} alt="" />
                      ) : (
                        <span />
                      )}
                    </div>
                    <p>
                      <strong>{getProductName(item)}</strong>
                      <small>Qty: {item.quantity || 1}</small>
                    </p>
                    <strong>
                      {formatProductPrice(
                        Number(item.price || 0) * Number(item.quantity || 1),
                      )}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="checkout-total-row">
                <span>Subtotal</span>
                <strong>{formatProductPrice(total)}</strong>
              </div>
              <div className="checkout-total-row">
                <span>Shipping</span>
                <strong>Free</strong>
              </div>
              <div className="checkout-total-row final">
                <span>Final amount</span>
                <strong>{formatProductPrice(total)}</strong>
              </div>
              <button type="submit" disabled={submitting}>
                {submitting
                  ? "Processing..."
                  : `Pay ${formatProductPrice(total)}`}
              </button>
            </aside>
          </form>
        )}
      </main>
    </div>
  );
}

function CheckoutField({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  textarea = false,
  required = false,
}) {
  const controlProps = {
    name,
    value,
    required,
    onChange: (event) => onChange(name, event.target.value),
    "aria-invalid": Boolean(error),
  };
  return (
    <label className={`checkout-field ${textarea ? "wide" : ""}`}>
      <span>{label} {required && <span className="required-mark">*</span>}</span>
      {textarea ? (
        <textarea {...controlProps} rows="3" />
      ) : (
        <input {...controlProps} type={type} />
      )}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

export default CheckoutPage;
