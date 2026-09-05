"use client";
// app/farmer/orders/page.tsx — Orders received by this farmer

import { useState, useEffect, useCallback } from "react";

export default function FarmerOrdersPage() {
  const [orders,  setOrders]  = useState<any[]>([]);
  const [filter,  setFilter]  = useState("all");
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState<string | null>(null);
  const [msg,     setMsg]     = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/farmer/orders")
      .then(r => r.json())
      .then(d => { setOrders(d.orders || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = {
    all:       orders.length,
    pending:   orders.filter(o => o.status === "pending").length,
    confirmed: orders.filter(o => o.status === "confirmed").length,
    fulfilled: orders.filter(o => o.status === "fulfilled").length,
    cancelled: orders.filter(o => o.status === "cancelled").length,
  };

  const visible = orders.filter(o => filter === "all" || o.status === filter);

  const totalRevenue = orders
    .filter(o => o.status !== "cancelled")
    .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

  const markFulfilled = async (orderId: string) => {
    setActing(orderId);
    try {
      const res = await fetch("/api/farmer/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: "fulfilled" }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: "Order marked as fulfilled.", ok: true });
        load();
      } else {
        setMsg({ text: data.error || "Failed.", ok: false });
      }
    } catch {
      setMsg({ text: "Network error.", ok: false });
    }
    setActing(null);
    setTimeout(() => setMsg(null), 3000);
  };

  const filterTabs = [
    { key: "all",       label: "All",             count: counts.all       },
    { key: "confirmed", label: "Confirmed (paid)", count: counts.confirmed },
    { key: "pending",   label: "Pending",          count: counts.pending   },
    { key: "fulfilled", label: "Fulfilled",        count: counts.fulfilled },
    { key: "cancelled", label: "Cancelled",        count: counts.cancelled },
  ];

  return (
    <>
      {/* Toast */}
      {msg && (
        <div style={{
          position: "fixed", top: 20, right: 24, zIndex: 999,
          background: msg.ok ? "var(--green)" : "var(--red)",
          color: "#fff", padding: "10px 18px",
          borderRadius: "var(--radius)", fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        }}>
          {msg.text}
        </div>
      )}

      <header className="bk-topbar">
        <div>
          <div className="bk-topbar-title">Orders received</div>
          <div className="bk-topbar-sub">Customer orders for your coffee batches</div>
        </div>
        {/* Revenue summary */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>
            €{totalRevenue.toFixed(2)}
          </div>
          <div style={{ fontSize: 11, color: "var(--bk-muted)" }}>Total revenue</div>
        </div>
      </header>

      <div className="bk-content">

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { icon: "", val: counts.all,        label: "Total orders",    color: undefined },
            { icon: "", val: counts.confirmed,  label: "Confirmed (paid)", color: "var(--accent)" },
            { icon: "", val: counts.fulfilled,  label: "Fulfilled",       color: "var(--green)" },
            { icon: "", val: `€${totalRevenue.toFixed(2)}`, label: "Revenue", color: "var(--accent)" },
          ].map((s, i) => (
            <div key={i} className="bk-stat">
              <div className="bk-stat-icon">{s.icon}</div>
              <div className="bk-stat-val" style={{ color: s.color, fontSize: i === 3 ? 18 : undefined }}>
                {loading ? "…" : s.val}
              </div>
              <div className="bk-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {filterTabs.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              style={{
                padding: "6px 14px", borderRadius: "var(--radius)",
                fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid",
                background:  filter === t.key ? "var(--accent)" : "var(--surface)",
                color:       filter === t.key ? "#fff"          : "var(--text)",
                borderColor: filter === t.key ? "var(--accent)" : "var(--border)",
              }}>
              {t.label} <span style={{ opacity: 0.7 }}>({t.count})</span>
            </button>
          ))}
        </div>

        <div className="bk-card">
          {loading ? (
            <div className="bk-empty">Loading…</div>
          ) : visible.length === 0 ? (
            <div className="bk-empty">
              <div style={{ fontSize: 36, marginBottom: 8 }}></div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                {orders.length === 0 ? "No orders yet" : "No orders match this filter"}
              </div>
              <div style={{ fontSize: 12, color: "var(--bk-muted)" }}>
                {orders.length === 0 && "Orders will appear here when customers purchase your approved coffee batches."}
              </div>
            </div>
          ) : (
            <div className="bk-table-wrap">
              <table className="bk-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Batch</th>
                    <th>Coffee type</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(o => (
                    <tr key={o.id}>
                      <td><span className="bk-mono" style={{ fontSize: 10 }}>{o.id?.slice(-10) || "—"}</span></td>
                      <td style={{ fontSize: 12, color: "var(--bk-muted)" }}>
                        {o.createdAt
                          ? new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td>{o.customerName || "—"}</td>
                      <td><span className="bk-mono">{o.batchId || "—"}</span></td>
                      <td>{o.coffeeType || "—"}</td>
                      <td>{o.quantity || 1}</td>
                      <td style={{ fontWeight: 600 }}>€{o.total || "—"}</td>
                      <td>
                        {o.status === "fulfilled"
                          ? <span className="pill pill-green">Fulfilled</span>
                          : o.status === "cancelled"
                          ? <span className="pill pill-red">Cancelled</span>
                          : o.status === "confirmed"
                          ? <span className="pill" style={{ background: "#FEFCE8", color: "#854D0E", border: "1px solid #FDE68A" }}>
                               Payment confirmed
                            </span>
                          : <span className="pill pill-amber">Pending</span>
                        }
                      </td>
                      <td>
                        {(o.status === "pending" || o.status === "confirmed") && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <button
                              className="bk-btn bk-btn-sm bk-btn-primary"
                              disabled={acting === o.id}
                              onClick={() => markFulfilled(o.id)}
                            >
                              {acting === o.id ? "…" : "Mark shipped"}
                            </button>
                            {o.txHash && (
                              <span style={{ fontSize: 9, color: "var(--bk-muted)", fontFamily: "monospace" }}>
                                 {o.txHash.slice(0, 12)}…
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {orders.length === 0 && !loading && (
          <div style={{
            marginTop: 16, padding: "12px 16px",
            background: "var(--amber-bg)", border: "1px solid #f0c96a",
            borderRadius: "var(--radius)", fontSize: 12, color: "var(--amber)",
          }}>
            <strong>Note:</strong> Orders are generated when customers purchase your approved batches from the marketplace. Make sure your batches are approved and have a price set.
          </div>
        )}
      </div>
    </>
  );
}
