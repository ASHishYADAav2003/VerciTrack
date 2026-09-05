"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CartItem = {
  id: string;
  name: string;
  batchId: string;
  price?: string;
  weight?: string;
  image?: string;
  qty: number;
};

type CheckoutStep = "cart" | "details" | "confirmation";

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [step, setStep] = useState<CheckoutStep>("cart");
  const [form, setForm] = useState({
    name: "", email: "", address: "", city: "", postcode: "", country: "Kosovo",
  });
  const [submitting, setSubmitting] = useState(false);
  const [orderRef] = useState("ORD-" + Math.random().toString(36).slice(2, 8).toUpperCase());

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("cart") || "[]");
    setItems(stored);
  }, []);

  function save(updated: CartItem[]) {
    setItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  }

  function updateQty(batchId: string, delta: number) {
    const updated = items
      .map((i) => i.batchId === batchId ? { ...i, qty: Math.max(1, i.qty + delta) } : i);
    save(updated);
  }

  function remove(batchId: string) {
    save(items.filter((i) => i.batchId !== batchId));
  }

  const subtotal = items.reduce((sum, i) => {
    const price = parseFloat(String(i.price ?? "0").replace(",", ".")) || 0;
    return sum + price * i.qty;
  }, 0);

  const shipping = subtotal > 0 ? 4.5 : 0;
  const total = subtotal + shipping;

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Fetch current user from the /api/auth/me endpoint (auth_user is httpOnly)
      const meRes = await fetch("/api/auth/me");
      const meData = meRes.ok ? await meRes.json() : { user: null };
      const authUser = meData.user;

      // Save each cart item as a separate order record
      await Promise.all(items.map(item =>
        fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchId:       item.batchId,
            coffeeType:     item.name,
            farmerName: null, // not stored on cart item
            customerName:  authUser?.name  ?? form.name,
            customerEmail: authUser?.email ?? form.email,
            quantity:      item.qty,
            total:         item.price
              ? (parseFloat(String(item.price ?? "0").replace(",", ".")) * item.qty).toFixed(2)
              : "0",
            status: "pending",
          }),
        })
      ));
    } catch {
      // Non-fatal — order confirmation still shows even if backend save fails
    }
    localStorage.removeItem("cart");
    setItems([]);
    setStep("confirmation");
    setSubmitting(false);
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="cart-page">

        {/* Checkout steps indicator — shown below PublicNav */}
        <div style={{ background: 'white', borderBottom: '1px solid #EDE8DF', padding: '0 40px', display: 'flex', justifyContent: 'center' }}>
          <div className="cart-steps-indicator" style={{ padding: '12px 0' }}>
            {(["cart", "details", "confirmation"] as CheckoutStep[]).map((s, i) => (
              <div key={s} className="cart-step-item">
                <div className={`cart-step-dot ${step === s ? "active" : (["cart","details","confirmation"].indexOf(step) > i ? "done" : "")}`}>
                  {["cart","details","confirmation"].indexOf(step) > i ? "" : i + 1}
                </div>
                <span className={`cart-step-label ${step === s ? "active" : ""}`}>
                  {s === "cart" ? "Cart" : s === "details" ? "Details" : "Confirmation"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="cart-wrapper">

          {/* ── STEP 1: Cart ── */}
          {step === "cart" && (
            <div className="cart-layout">
              <div className="cart-main">
                <h1 className="cart-title">Your Cart</h1>

                {items.length === 0 ? (
                  <div className="cart-empty">
                    <p className="cart-empty-icon"></p>
                    <h2>Your cart is empty</h2>
                    <p>Browse our coffee products and add them to your cart.</p>
                    <Link href="/marketplace" className="cart-btn-primary">
                      Browse products
                    </Link>
                  </div>
                ) : (
                  <div className="cart-items">
                    {items.map((item) => (
                      <div key={item.batchId} className="cart-item">
                        <div className="cart-item-img">
                          {item.image
                            ? <img src={item.image} alt={item.name} />
                            : <span></span>}
                        </div>
                        <div className="cart-item-info">
                          <p className="cart-item-name">{item.name}</p>
                          <p className="cart-item-meta">
                            Batch: {item.batchId}
                            {item.weight ? ` · ${item.weight}` : ""}
                          </p>
                          <p className="cart-item-price">
                            {item.price ? `${item.price} €` : "—"}
                          </p>
                        </div>
                        <div className="cart-item-qty">
                          <button onClick={() => updateQty(item.batchId, -1)}>−</button>
                          <span>{item.qty}</span>
                          <button onClick={() => updateQty(item.batchId, +1)}>+</button>
                        </div>
                        <div className="cart-item-subtotal">
                          {item.price
                            ? `${(parseFloat(String(item.price ?? "0").replace(",", ".")) * item.qty).toFixed(2)} €`
                            : "—"}
                        </div>
                        <button className="cart-item-remove" onClick={() => remove(item.batchId)}></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="cart-summary">
                  <h2 className="cart-summary-title">Order Summary</h2>
                  <div className="cart-summary-row">
                    <span>Subtotal</span><span>{subtotal.toFixed(2)} €</span>
                  </div>
                  <div className="cart-summary-row">
                    <span>Shipping</span><span>{shipping.toFixed(2)} €</span>
                  </div>
                  <div className="cart-summary-row cart-summary-total">
                    <span>Total</span><span>{total.toFixed(2)} €</span>
                  </div>
                  <button
                    className="cart-btn-primary"
                    style={{ width: "100%", marginTop: 8 }}
                    onClick={() => setStep("details")}
                  >
                    Continue to details
                  </button>
                  <Link href="/marketplace" className="cart-btn-secondary" style={{ display: "block", textAlign: "center", marginTop: 10 }}>
                    Continue shopping
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Details ── */}
          {step === "details" && (
            <div className="cart-layout">
              <form onSubmit={placeOrder} className="cart-main">
                <h1 className="cart-title">Delivery Details</h1>

                <div className="cart-form">
                  {[
                    { label: "Full name", key: "name", type: "text", placeholder: "Your full name" },
                    { label: "Email address", key: "email", type: "email", placeholder: "you@example.com" },
                    { label: "Street address", key: "address", type: "text", placeholder: "Street and number" },
                    { label: "City", key: "city", type: "text", placeholder: "City" },
                    { label: "Postcode", key: "postcode", type: "text", placeholder: "Postcode" },
                    { label: "Country", key: "country", type: "text", placeholder: "Country" },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key} className="cart-field">
                      <label className="cart-label">{label}</label>
                      <input
                        type={type}
                        required
                        placeholder={placeholder}
                        value={form[key as keyof typeof form]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="cart-input"
                      />
                    </div>
                  ))}
                </div>

                <div className="cart-payment-note">
                  <p> Payment details</p>
                  <p className="cart-payment-sub">
                    This is a prototype — no real payment is processed. In a production system, this would integrate with a payment provider.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                  <button type="button" className="cart-btn-secondary" onClick={() => setStep("cart")}>
                    ← Back to cart
                  </button>
                  <button type="submit" className="cart-btn-primary" disabled={submitting} style={{ flex: 1 }}>
                    {submitting ? "Placing order…" : `Place order · ${total.toFixed(2)} €`}
                  </button>
                </div>
              </form>

              <div className="cart-summary">
                <h2 className="cart-summary-title">Order Summary</h2>
                {items.map((item) => (
                  <div key={item.batchId} className="cart-summary-item">
                    <span>{item.name} × {item.qty}</span>
                    <span>{item.price ? `${(parseFloat(String(item.price ?? "0").replace(",", ".")) * item.qty).toFixed(2)} €` : "—"}</span>
                  </div>
                ))}
                <div className="cart-summary-row" style={{ marginTop: 12 }}>
                  <span>Shipping</span><span>{shipping.toFixed(2)} €</span>
                </div>
                <div className="cart-summary-row cart-summary-total">
                  <span>Total</span><span>{total.toFixed(2)} €</span>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Confirmation ── */}
          {step === "confirmation" && (
            <div className="cart-confirmation">
              <div className="cart-confirm-icon"></div>
              <h1 className="cart-confirm-title">Order placed!</h1>
              <p className="cart-confirm-sub">
                Thank you, {form.name}. Your order <strong>{orderRef}</strong> has been received.
              </p>
              <p className="cart-confirm-detail">
                A confirmation will be sent to <strong>{form.email}</strong>. Your traceable coffee is on its way.
              </p>
              <div className="cart-confirm-actions">
                <Link href="/marketplace" className="cart-btn-primary">
                  Continue shopping
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root { --cream: #F9FAFB; --charcoal: #1C1C1C; --muted: #7A6E5F; --accent: #EAB307; --accent-h: #C99500; }

  .cart-page { font-family: 'DM Sans', sans-serif; background: var(--cream); min-height: 100vh; }

  .cart-nav { background: white; border-bottom: 1px solid #EDE8DF; padding: 0 40px; height: 64px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50; }
  .cart-nav-logo { font-family: 'Playfair Display', serif; font-size: 1.2rem; color: var(--accent); font-weight: 700; text-decoration: none; }
  .cart-nav-logo span { color: var(--accent); }

  .cart-steps-indicator { display: flex; align-items: center; gap: 8px; }
  .cart-step-item { display: flex; align-items: center; gap: 6px; }
  .cart-step-dot { width: 24px; height: 24px; border-radius: 50%; background: #EDE8DF; color: var(--muted); font-size: 0.72rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .cart-step-dot.active { background: var(--accent); color: white; }
  .cart-step-dot.done { background: #000; color: white; }
  .cart-step-label { font-size: 0.8rem; color: var(--muted); }
  .cart-step-label.active { color: var(--accent); font-weight: 600; }

  .cart-wrapper { max-width: 1100px; margin: 0 auto; padding: 48px 40px; }
  .cart-layout { display: grid; grid-template-columns: 1fr 340px; gap: 32px; align-items: start; }
  .cart-title { font-family: 'Playfair Display', serif; font-size: 2rem; color: var(--charcoal); margin: 0 0 28px; }

  .cart-empty { text-align: center; background: white; border-radius: 20px; padding: 60px 40px; border: 1px solid #EDE8DF; }
  .cart-empty-icon { font-size: 3rem; margin-bottom: 16px; }
  .cart-empty h2 { font-family: 'Playfair Display', serif; font-size: 1.5rem; color: var(--charcoal); margin-bottom: 8px; }
  .cart-empty p { color: var(--muted); font-size: 0.9rem; margin-bottom: 24px; }

  .cart-items { display: flex; flex-direction: column; gap: 12px; }
  .cart-item { background: white; border-radius: 16px; padding: 16px; border: 1px solid #EDE8DF; display: flex; align-items: center; gap: 16px; }
  .cart-item-img { width: 64px; height: 64px; border-radius: 10px; background: #F5EFE4; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; overflow: hidden; }
  .cart-item-img img { width: 100%; height: 100%; object-fit: cover; }
  .cart-item-info { flex: 1; }
  .cart-item-name { font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 600; color: var(--charcoal); margin: 0 0 2px; }
  .cart-item-meta { font-size: 0.78rem; color: var(--muted); margin: 0 0 4px; }
  .cart-item-price { font-size: 0.9rem; font-weight: 600; color: var(--accent); margin: 0; }
  .cart-item-qty { display: flex; align-items: center; border: 1.5px solid #EDE8DF; border-radius: 8px; overflow: hidden; }
  .cart-item-qty button { background: white; border: none; padding: 6px 10px; font-size: 0.9rem; cursor: pointer; }
  .cart-item-qty button:hover { background: #F5EFE4; }
  .cart-item-qty span { padding: 0 10px; font-size: 0.85rem; font-weight: 600; }
  .cart-item-subtotal { font-size: 0.95rem; font-weight: 700; color: var(--charcoal); min-width: 64px; text-align: right; }
  .cart-item-remove { background: none; border: none; color: #ccc; cursor: pointer; font-size: 0.85rem; padding: 4px; }
  .cart-item-remove:hover { color: #e53935; }

  .cart-summary { background: white; border-radius: 20px; padding: 24px; border: 1px solid #EDE8DF; position: sticky; top: 80px; }
  .cart-summary-title { font-family: 'Playfair Display', serif; font-size: 1.25rem; color: var(--charcoal); margin: 0 0 16px; }
  .cart-summary-row { display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--muted); margin-bottom: 8px; }
  .cart-summary-total { font-size: 1rem; font-weight: 700; color: var(--charcoal); border-top: 1px solid #EDE8DF; padding-top: 12px; margin-top: 4px; }
  .cart-summary-item { display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--muted); margin-bottom: 6px; }

  .cart-btn-primary { background: var(--accent); color: #000; border: none; border-radius: 12px; padding: 12px 24px; font-size: 0.9rem; font-family: 'DM Sans', sans-serif; font-weight: 600; cursor: pointer; transition: background 0.2s; text-decoration: none; display: inline-block; text-align: center; }
  .cart-btn-primary:hover { background: var(--accent-h); }
  .cart-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  .cart-btn-secondary { background: transparent; color: var(--accent); border: 1.5px solid var(--accent); border-radius: 12px; padding: 12px 20px; font-size: 0.9rem; font-family: 'DM Sans', sans-serif; font-weight: 600; cursor: pointer; text-decoration: none; transition: all 0.2s; }
  .cart-btn-secondary:hover { background: var(--accent); color: white; }

  .cart-form { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .cart-field { display: flex; flex-direction: column; gap: 4px; }
  .cart-field:first-child { grid-column: span 2; }
  .cart-field:nth-child(2) { grid-column: span 2; }
  .cart-label { font-size: 0.78rem; font-weight: 600; color: var(--charcoal); text-transform: uppercase; letter-spacing: 0.05em; }
  .cart-input { border: 1.5px solid #EDE8DF; border-radius: 10px; padding: 12px 14px; font-size: 0.9rem; font-family: 'DM Sans', sans-serif; background: white; color: var(--charcoal); outline: none; transition: border-color 0.2s; }
  .cart-input:focus { border-color: var(--accent); }

  .cart-payment-note { background: #F5EFE4; border-radius: 12px; padding: 16px; border-left: 3px solid var(--accent); }
  .cart-payment-note p { font-size: 0.85rem; font-weight: 600; color: var(--charcoal); margin: 0 0 4px; }
  .cart-payment-sub { font-size: 0.8rem; color: var(--muted); font-weight: 400 !important; }

  .cart-confirmation { max-width: 520px; margin: 80px auto; text-align: center; }
  .cart-confirm-icon { font-size: 4rem; margin-bottom: 20px; }
  .cart-confirm-title { font-family: 'Playfair Display', serif; font-size: 2rem; color: var(--charcoal); margin: 0 0 12px; }
  .cart-confirm-sub { font-size: 1rem; color: var(--muted); margin: 0 0 8px; }
  .cart-confirm-detail { font-size: 0.9rem; color: var(--muted); margin: 0 0 32px; }
  .cart-confirm-actions { display: flex; justify-content: center; gap: 12px; }

  @media (max-width: 800px) {
    .cart-layout { grid-template-columns: 1fr; }
    .cart-form { grid-template-columns: 1fr; }
    .cart-field:first-child, .cart-field:nth-child(2) { grid-column: span 1; }
    .cart-wrapper { padding: 24px 20px; }
  }
`;
