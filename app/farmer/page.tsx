"use client";
// app/farmer/page.tsx — Farmer dashboard

import { useState, useEffect } from "react";
import Link from "next/link";

export default function FarmerDashboard() {
  const [user,    setUser]    = useState<any>(null);
  const [stats,   setStats]   = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [orders,  setOrders]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : { user: null })
      .then(d => { if (d.user) setUser(d.user); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/farmer/stats").then(r => r.json()),
      fetch("/api/farmer/batches").then(r => r.json()),
      fetch("/api/farmer/orders").then(r => r.json()),
    ]).then(([s, m, o]) => {
      setStats(s);
      setBatches(m.batches || []);
      setOrders(o.orders || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const recentBatches = batches.slice(0, 5);
  const recentOrders  = orders.slice(0, 4);

  const qualityPill = (s: string) => {
    const l = (s || "").toLowerCase();
    if (l === "passed")  return <span className="pill pill-green">Pass</span>;
    if (l === "caution") return <span className="pill pill-amber">Caution</span>;
    if (l === "failed")  return <span className="pill pill-red">Fail</span>;
    return <span className="pill pill-gray">No data</span>;
  };

  const approvalPill = (s: string) => {
    if (s === "approved")  return <span className="pill pill-green">Approved</span>;
    if (s === "rejected")  return <span className="pill pill-red">Rejected</span>;
    if (s === "suspended") return <span className="pill pill-blue">Suspended</span>;
    return <span className="pill pill-amber">Pending</span>;
  };

  const val = (v: any) => loading ? "—" : (v ?? "0");

  return (
    <>
      <header className="bk-topbar">
        <div>
          <div className="bk-topbar-title">
            {user?.name ? `Welcome, ${user.name}` : "Dashboard"}
          </div>
          <div className="bk-topbar-sub">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
        <Link href="/farmer/register-batch" className="bk-btn bk-btn-gold">
          Register new batch
        </Link>
      </header>

      <div className="bk-content">

        {/* Key metrics — 4 cards only */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Total batches",   value: val(stats?.batches?.total),   sub: `${val(stats?.batches?.pending)} pending review`  },
            { label: "Live on market",  value: val(stats?.batches?.approved), sub: "approved & visible to buyers"                    },
            { label: "Orders received", value: val(stats?.orders?.total),     sub: `${val(stats?.orders?.pending)} awaiting action`  },
            { label: "Total revenue",   value: stats?.revenue != null ? `€${Number(stats.revenue).toFixed(2)}` : loading ? "—" : "€0.00",
                                        sub: "from fulfilled orders"                                                                  },
          ].map((c, i) => (
            <div key={i} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", padding: "18px 20px",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--bk-muted)", marginBottom: 8 }}>
                {c.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{c.value}</div>
              <div style={{ fontSize: 11, color: "var(--bk-muted)" }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="bk-section-title">Quick actions</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { href: "/farmer/register-batch",  label: "Register a batch",    sub: "Upload lab report and get a batch ID"   },
            { href: "/farmer/orders",           label: "Manage orders",       sub: "View and fulfil customer orders"        },
            { href: "/farmer/certificates",     label: "QR certificates",     sub: "Download and print QR codes for jars"  },
          ].map(a => (
            <Link key={a.href} href={a.href} className="bk-action-card">
              <div className="bk-action-label">{a.label}</div>
              <div className="bk-action-sub">{a.sub}</div>
            </Link>
          ))}
        </div>

        {/* Recent batches */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div className="bk-section-title" style={{ margin: 0 }}>Recent batches</div>
          <Link href="/farmer/batches" className="bk-btn bk-btn-sm">View all</Link>
        </div>

        <div className="bk-card" style={{ marginBottom: 24 }}>
          {loading ? (
            <div className="bk-empty">Loading…</div>
          ) : recentBatches.length === 0 ? (
            <div className="bk-empty">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>No batches yet</div>
              <div style={{ fontSize: 12, color: "var(--bk-muted)", marginBottom: 14 }}>
                Register your first batch to get a verified batch ID.
              </div>
              <Link href="/farmer/register-batch" className="bk-btn bk-btn-primary">Register first batch</Link>
            </div>
          ) : (
            <div className="bk-table-wrap">
              <table className="bk-table">
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Type</th>
                    <th>Origin</th>
                    <th>Quality</th>
                    <th>Status</th>
                    <th>Stock left</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentBatches.map(b => (
                    <tr key={b.batchId}>
                      <td><span className="bk-mono">{b.batchId}</span></td>
                      <td>{b.coffeeType || "—"}</td>
                      <td>{b.origin || "—"}</td>
                      <td>{qualityPill(b.qualityStatus)}</td>
                      <td>{approvalPill(b.approvalStatus)}</td>
                      <td style={{ fontSize: 12, fontWeight: 600,
                        color: b.remaining === 0 ? "var(--red)"
                             : b.remaining != null && b.remaining < (b.totalStock || 10) * 0.2 ? "var(--amber)"
                             : "var(--green)" }}>
                        {b.totalStock != null ? `${b.remaining ?? b.totalStock}/${b.totalStock} ${b.unit || "jars"}` : "—"}
                      </td>
                      <td>
                        <Link href={`/verify/${b.batchId}`} className="bk-btn bk-btn-sm" target="_blank">
                          Verify
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div className="bk-section-title" style={{ margin: 0 }}>Recent orders</div>
          <Link href="/farmer/orders" className="bk-btn bk-btn-sm">View all</Link>
        </div>

        <div className="bk-card">
          {loading ? (
            <div className="bk-empty">Loading…</div>
          ) : recentOrders.length === 0 ? (
            <div className="bk-empty">
              <div style={{ fontWeight: 600, fontSize: 14 }}>No orders yet</div>
              <div style={{ fontSize: 12, color: "var(--bk-muted)", marginTop: 4 }}>
                Orders appear here when customers purchase your coffee.
              </div>
            </div>
          ) : (
            <div className="bk-table-wrap">
              <table className="bk-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Batch</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(o => (
                    <tr key={o.id}>
                      <td><span className="bk-mono">{o.id?.slice(-8) || "—"}</span></td>
                      <td>{o.customerName || "—"}</td>
                      <td><span className="bk-mono">{o.batchId || "—"}</span></td>
                      <td>{o.quantity || 1}</td>
                      <td style={{ fontWeight: 600 }}>€{o.total || "—"}</td>
                      <td>
                        {o.status === "fulfilled"
                          ? <span className="pill pill-green">Fulfilled</span>
                          : o.status === "cancelled"
                          ? <span className="pill pill-red">Cancelled</span>
                          : <span className="pill pill-amber">Pending</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
