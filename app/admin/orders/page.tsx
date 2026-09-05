'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Orders are stored in data/orders.json via /api/orders
    fetch('/api/orders')
      .then(r => r.json())
      .then(d => {
        const list = d.orders || []
        list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        setOrders(list)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const statusPill = (s: string) => {
    if (!s || s === 'pending') return <span className="pill pill-amber">Pending</span>
    if (s === 'processing') return <span className="pill pill-blue">Processing</span>
    if (s === 'delivered' || s === 'completed') return <span className="pill pill-green">Delivered</span>
    if (s === 'cancelled') return <span className="pill pill-red">Cancelled</span>
    return <span className="pill pill-purple">{s}</span>
  }

  const filtered = orders
    .filter(o => filter === 'all' || o.status === filter)
    .filter(o => !search ||
      o.id?.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.customerEmail?.toLowerCase().includes(search.toLowerCase()) ||
      o.batchId?.toLowerCase().includes(search.toLowerCase())
    )

  const total = orders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Orders</div>
        <div className="page-sub">All customer purchases across the marketplace.</div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Total orders</div>
          <div className="stat-val">{orders.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-val" style={{ color: 'var(--amber)' }}>{orders.filter(o => !o.status || o.status === 'pending').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Delivered</div>
          <div className="stat-val" style={{ color: 'var(--green)' }}>{orders.filter(o => o.status === 'delivered' || o.status === 'completed').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Revenue</div>
          <div className="stat-val">€{total.toFixed(2)}</div>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <input className="search-input" placeholder="Search order ID, customer, or batch…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}></div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>No orders yet</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto' }}>
              Orders appear here once customers complete a purchase. Stored in <span className="mono">data/orders.json</span>.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Batch</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => (
                  <tr key={o.id || i}>
                    <td><span className="mono">{o.id || `ORD-${1000 + i}`}</span></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{o.customerName || 'Anonymous'}</div>
                      {o.customerEmail && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.customerEmail}</div>}
                    </td>
                    <td>
                      {o.batchId ? (
                        <Link href={`/verify/${o.batchId}`} className="mono" style={{ color: 'var(--accent)', fontSize: 11, textDecoration: 'none' }}>
                          {o.batchId}
                        </Link>
                      ) : '—'}
                    </td>
                    <td>{o.coffeeType || '—'}</td>
                    <td>{o.quantity || 1}</td>
                    <td style={{ fontWeight: 600 }}>£{parseFloat(o.total || 0).toFixed(2)}</td>
                    <td>{statusPill(o.status)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
