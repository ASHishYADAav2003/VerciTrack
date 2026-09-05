"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Tab = "orders" | "addresses";

type Order = {
  id: string;
  date: string;
  items: string;
  total: string;
  status: string;
};

type Address = {
  id: string;
  name: string;
  line1: string;
  city: string;
  country: string;
  isDefault: boolean;
};

type SessionUser = {
  name: string;
  email: string;
};

export default function CustomerPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ name: "", line1: "", city: "", country: "Kosovo" });

  useEffect(() => {
    // auth_user is httpOnly — must use /api/auth/me
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : { user: null })
      .then(d => {
        if (d.user) {
          setUser(d.user);
          // Fetch orders for this customer by email
          fetch("/api/orders")
            .then(r => r.json())
            .then(od => {
              const mine = (od.orders || []).filter(
                (o: any) => o.customerEmail?.toLowerCase() === d.user.email?.toLowerCase()
              );
              mine.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
              setOrders(mine);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    // Load saved addresses from localStorage
    const saved = JSON.parse(localStorage.getItem("customer_addresses") || "[]");
    setAddresses(saved);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function saveAddresses(updated: Address[]) {
    setAddresses(updated);
    localStorage.setItem("customer_addresses", JSON.stringify(updated));
  }

  function addAddress() {
    if (!newAddr.name || !newAddr.line1 || !newAddr.city) return;
    const addr: Address = {
      id: Date.now().toString(),
      ...newAddr,
      isDefault: addresses.length === 0,
    };
    saveAddresses([...addresses, addr]);
    setNewAddr({ name: "", line1: "", city: "", country: "Kosovo" });
    setShowAddAddress(false);
  }

  function deleteAddress(id: string) {
    saveAddresses(addresses.filter((a) => a.id !== id));
  }

  function setDefault(id: string) {
    saveAddresses(addresses.map((a) => ({ ...a, isDefault: a.id === id })));
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="cp-page">

        {/* Nav */}
        <nav className="cp-nav">
          <Link href="/marketplace" className="cp-nav-logo">
            HAV<span> Platform</span>
          </Link>
          <div className="cp-nav-links">
            <Link href="/marketplace">Shop</Link>
            <Link href="/farmer-profile">Producers</Link>
          </div>
          <div className="cp-nav-right">
            <Link href="/customer" className="cp-nav-account">Account</Link>
            <Link href="/cart" className="cp-nav-cart"></Link>
          </div>
        </nav>

        {/* Tab bar */}
        <div className="cp-tabbar">
          <button
            className={`cp-tab ${tab === "orders" ? "cp-tab-active" : ""}`}
            onClick={() => setTab("orders")}
          >
            Orders
          </button>
          <button
            className={`cp-tab ${tab === "addresses" ? "cp-tab-active" : ""}`}
            onClick={() => setTab("addresses")}
          >
            Addresses
          </button>
          <button className="cp-tab cp-tab-logout" onClick={logout}>
            Logout
          </button>
        </div>

        <div className="cp-body">

          {/* ── Orders ── */}
          {tab === "orders" && (
            <div className="cp-section">
              <h2 className="cp-section-title">
                ORDERS <span className="cp-count">{orders.length}</span>
              </h2>

              {orders.length === 0 ? (
                <div className="cp-empty">
                  <p>You have not placed any orders yet.</p>
                  <Link href="/marketplace" className="cp-btn-dark">
                    START SHOPPING
                  </Link>
                </div>
              ) : (
                <div className="cp-orders">
                  {orders.map((order: any) => (
                    <div key={order.id} className="cp-order-row">
                      <div>
                        <p className="cp-order-id">{order.id}</p>
                        <p className="cp-order-date">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </p>
                        <p className="cp-order-items">{order.coffeeType || order.batchId || '—'}</p>
                      </div>
                      <div className="cp-order-right">
                        <p className="cp-order-total">€{parseFloat(order.total || 0).toFixed(2)}</p>
                        <span className="cp-order-status" style={
                          order.status === "confirmed"
                            ? { background: "#EFF6FF", color: "#1D4ED8" }
                            : order.status === "fulfilled"
                            ? { background: "#E8F5E9", color: "#2E7D32" }
                            : order.status === "cancelled"
                            ? { background: "#FFF5F5", color: "#991B1B" }
                            : { background: "#FFFBEB", color: "#92400E" }
                        }>
                          {order.status === "confirmed" ? " Payment confirmed"
                            : order.status === "fulfilled" ? "Shipped"
                            : order.status === "cancelled" ? "Cancelled"
                            : "Pending"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Addresses ── */}
          {tab === "addresses" && (
            <div className="cp-section">
              <h2 className="cp-section-title">
                ADDRESSES <span className="cp-count">{addresses.length}</span>
              </h2>

              <div className="cp-addr-grid">
                {addresses.map((addr) => (
                  <div key={addr.id} className="cp-addr-card">
                    {addr.isDefault && (
                      <p className="cp-addr-default">DEFAULT ADDRESS</p>
                    )}
                    <p className="cp-addr-name">{addr.name}</p>
                    <p className="cp-addr-line">{addr.line1}</p>
                    <p className="cp-addr-line">{addr.city}, {addr.country}</p>
                    <div className="cp-addr-actions">
                      {!addr.isDefault && (
                        <button onClick={() => setDefault(addr.id)} className="cp-addr-btn">
                          Set default
                        </button>
                      )}
                      <button onClick={() => deleteAddress(addr.id)} className="cp-addr-btn cp-addr-btn-del">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add new */}
                <div className="cp-addr-add" onClick={() => setShowAddAddress(true)}>
                  <span className="cp-addr-add-icon">+</span>
                  <p>Add a new address</p>
                </div>
              </div>

              {/* Add form */}
              {showAddAddress && (
                <div className="cp-addr-form">
                  <h3 className="cp-addr-form-title">New address</h3>
                  <div className="cp-addr-form-grid">
                    {[
                      { label: "Full name", key: "name", placeholder: "Hana Voca" },
                      { label: "Street address", key: "line1", placeholder: "Street and number" },
                      { label: "City", key: "city", placeholder: "Pristina" },
                      { label: "Country", key: "country", placeholder: "Kosovo" },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key} className="cp-addr-field">
                        <label className="cp-addr-label">{label}</label>
                        <input
                          className="cp-addr-input"
                          value={newAddr[key as keyof typeof newAddr]}
                          onChange={(e) => setNewAddr((n) => ({ ...n, [key]: e.target.value }))}
                          placeholder={placeholder}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="cp-addr-form-actions">
                    <button onClick={addAddress} className="cp-btn-dark">Save address</button>
                    <button onClick={() => setShowAddAddress(false)} className="cp-btn-outline">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root { --cream: #F9FAFB;--charcoal: #1C1C1C; --muted: #7A6E5F; }

  * { box-sizing: border-box; }
  .cp-page { font-family: 'DM Sans', sans-serif; background: white; min-height: 100vh; }

  /* Nav */
  .cp-nav { display: flex; align-items: center; justify-content: space-between; padding: 0 48px; height: 72px; border-bottom: 1px solid #EDE8DF; }
  .cp-nav-logo { font-family: 'Playfair Display', serif; font-size: 1.3rem; color: var(--accent); font-weight: 700; text-decoration: none; }
  .cp-nav-logo span { color: var(--accent); }
  .cp-nav-links { display: flex; gap: 32px; }
  .cp-nav-links a { font-size: 0.875rem; color: var(--charcoal); text-decoration: none; font-weight: 500; }
  .cp-nav-right { display: flex; align-items: center; gap: 24px; }
  .cp-nav-account { font-size: 0.875rem; font-weight: 600; color: var(--charcoal); text-decoration: none; }
  .cp-nav-cart { font-size: 1rem; text-decoration: none; }

  /* Tab bar */
  .cp-tabbar { display: flex; justify-content: center; gap: 0; border-bottom: 1px solid #EDE8DF; padding: 0 48px; }
  .cp-tab { background: none; border: none; border-bottom: 2px solid transparent; padding: 16px 28px; font-size: 0.875rem; font-family: 'DM Sans', sans-serif; font-weight: 500; color: var(--muted); cursor: pointer; transition: all 0.2s; margin-bottom: -1px; letter-spacing: 0.02em; }
  .cp-tab:hover { color: var(--charcoal); }
  .cp-tab-active { color: var(--charcoal); border-bottom-color: var(--charcoal); font-weight: 600; }
  .cp-tab-logout { margin-left: auto; color: var(--muted); }
  .cp-tab-logout:hover { color: #C62828; }

  /* Body */
  .cp-body { max-width: 860px; margin: 0 auto; padding: 48px 48px; }
  .cp-section-title { font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--charcoal); margin: 0 0 32px; display: flex; align-items: center; gap: 10px; }
  .cp-count { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: var(--charcoal); color: white; font-size: 0.75rem; font-weight: 700; font-family: 'DM Sans', sans-serif; }

  /* Empty */
  .cp-empty { text-align: center; padding: 48px 24px; }
  .cp-empty p { font-size: 0.9rem; color: var(--muted); margin-bottom: 24px; }

  /* Orders */
  .cp-orders { display: flex; flex-direction: column; gap: 12px; }
  .cp-order-row { display: flex; justify-content: space-between; align-items: flex-start; border: 1px solid #EDE8DF; border-radius: 8px; padding: 20px 24px; }
  .cp-order-id { font-weight: 600; color: var(--charcoal); font-size: 0.875rem; margin: 0 0 4px; }
  .cp-order-date { font-size: 0.78rem; color: var(--muted); margin: 0 0 4px; }
  .cp-order-items { font-size: 0.82rem; color: var(--muted); margin: 0; }
  .cp-order-right { text-align: right; }
  .cp-order-total { font-weight: 700; color: var(--charcoal); margin: 0 0 6px; }
  .cp-order-status { font-size: 0.72rem; font-weight: 600; background: #E8F5E9; color: #2E7D32; padding: 3px 10px; border-radius: 100px; }

  /* Addresses */
  .cp-addr-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
  .cp-addr-card { border: 1px solid #EDE8DF; border-radius: 8px; padding: 20px 24px; }
  .cp-addr-default { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin: 0 0 10px; }
  .cp-addr-name { font-weight: 600; color: var(--charcoal); font-size: 0.9rem; margin: 0 0 4px; }
  .cp-addr-line { font-size: 0.82rem; color: var(--muted); margin: 0 0 2px; }
  .cp-addr-actions { display: flex; gap: 16px; margin-top: 16px; border-top: 1px solid #F5F5F5; padding-top: 12px; }
  .cp-addr-btn { background: none; border: none; font-size: 0.8rem; font-family: 'DM Sans', sans-serif; cursor: pointer; text-decoration: underline; color: var(--charcoal); padding: 0; }
  .cp-addr-btn-del { color: #C62828; }
  .cp-addr-add { border: 1.5px dashed #DDD; border-radius: 8px; padding: 20px 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; gap: 8px; transition: border-color 0.2s; min-height: 120px; }
  .cp-addr-add:hover { border-color: var(--charcoal); }
  .cp-addr-add-icon { font-size: 1.5rem; }
  .cp-addr-add p { font-size: 0.82rem; color: var(--muted); margin: 0; text-decoration: underline; }

  .cp-addr-form { background: #F9F9F9; border-radius: 8px; padding: 24px; border: 1px solid #EDE8DF; }
  .cp-addr-form-title { font-size: 0.9rem; font-weight: 700; color: var(--charcoal); margin: 0 0 16px; }
  .cp-addr-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .cp-addr-field { display: flex; flex-direction: column; gap: 4px; }
  .cp-addr-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
  .cp-addr-input { border: 1px solid #DDD; border-radius: 4px; padding: 10px 12px; font-size: 0.875rem; font-family: 'DM Sans', sans-serif; outline: none; }
  .cp-addr-input:focus { border-color: var(--charcoal); }
  .cp-addr-form-actions { display: flex; gap: 10px; }

  /* Buttons */
  .cp-btn-dark { background: var(--charcoal); color: white; border: none; border-radius: 4px; padding: 14px 28px; font-size: 0.78rem; font-family: 'DM Sans', sans-serif; font-weight: 700; letter-spacing: 0.08em; cursor: pointer; text-decoration: none; display: inline-block; transition: background 0.2s; }
  .cp-btn-dark:hover { background: #333; }
  .cp-btn-outline { background: transparent; color: var(--charcoal); border: 1.5px solid #DDD; border-radius: 4px; padding: 14px 24px; font-size: 0.78rem; font-family: 'DM Sans', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .cp-btn-outline:hover { border-color: var(--charcoal); }

  @media (max-width: 700px) {
    .cp-nav, .cp-body { padding-left: 20px; padding-right: 20px; }
    .cp-nav-links { display: none; }
    .cp-addr-grid, .cp-addr-form-grid { grid-template-columns: 1fr; }
    .cp-tabbar { padding: 0 20px; }
    .cp-tab { padding: 14px 16px; font-size: 0.8rem; }
  }
`;
