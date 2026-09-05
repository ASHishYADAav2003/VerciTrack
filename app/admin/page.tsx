'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/marketplace?all=true').then(r => r.json()),
    ]).then(([u, b]) => {
      setUsers(Array.isArray(u) ? u : (u.users ?? []))
      setBatches(Array.isArray(b) ? b : (Array.isArray(b.batches) ? b.batches : []))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>
        Loading dashboard…
      </div>
    )
  }

  const farmers = users.filter(u => u.role === 'farmer')
  const customers = users.filter(u => u.role === 'customer')
  const pendingFarmers = farmers.filter(b => b.approvalStatus === 'pending' || b.status === 'pending')
  const pendingBatches = batches.filter(b => b.approvalStatus === 'pending')
  const approvedBatches = batches.filter(b => b.approvalStatus === 'approved')
  const failedBatches = batches.filter(b => b.qualityStatus === 'Failed')

  const recentBatches = [...batches]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5)

  const qualityPill = (s: string) => {
    if (s === 'Passed') return <span className="pill pill-green">Pass</span>
    if (s === 'Caution') return <span className="pill pill-amber">Caution</span>
    if (s === 'Failed')  return <span className="pill pill-red">Fail</span>
    return <span className="pill" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>{s || 'No data'}</span>
  }
  const approvalPill = (s: string) => {
    if (s === 'approved') return <span className="pill pill-green">Approved</span>
    if (s === 'rejected') return <span className="pill pill-red">Rejected</span>
    return <span className="pill pill-amber">Pending</span>
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-sub">Overview of platform activity, approvals, and marketplace status.</div>
      </div>

      {/* Top stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total batches</div>
          <div className="stat-val">{batches.length}</div>
          <div className="stat-sub stat-up">{approvedBatches.length} live on marketplace</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Farmers</div>
          <div className="stat-val">{farmers.length}</div>
          <div className="stat-sub">{pendingFarmers.length} pending approval</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Customers</div>
          <div className="stat-val">{customers.length}</div>
          <div className="stat-sub">registered</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Quality failures</div>
          <div className="stat-val" style={{ color: failedBatches.length > 0 ? 'var(--red)' : 'var(--text)' }}>
            {failedBatches.length}
          </div>
          <div className="stat-sub">EU 2001/110/EC</div>
        </div>
      </div>

      {/* Pending approvals */}
      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ marginBottom: 0 }}>Pending farmer approvals</div>
            <Link href="/admin/approvals" className="btn btn-sm btn-primary">Review</Link>
          </div>
          {pendingFarmers.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No pending farmer applications.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingFarmers.slice(0, 5).map(u => (
                <div key={u.id || u.email} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--blue-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                    {(u.name || u.email || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name || u.email}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>
                  <span className="pill pill-amber">Pending</span>
                </div>
              ))}
              {pendingFarmers.length > 5 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  +{pendingFarmers.length - 5} more
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ marginBottom: 0 }}>Pending batch approvals</div>
            <Link href="/admin/batch-approvals" className="btn btn-sm btn-primary">Review</Link>
          </div>
          {pendingBatches.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No batches awaiting review.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingBatches.slice(0, 5).map(b => (
                <div key={b.batchId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }} className="mono">{b.batchId}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {b.farmerName} · {b.coffeeType || b.type}
                    </div>
                  </div>
                  {qualityPill(b.qualityStatus)}
                </div>
              ))}
              {pendingBatches.length > 5 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  +{pendingBatches.length - 5} more
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="card-header">
          <div className="card-title" style={{ marginBottom: 0 }}>Recent batches</div>
          <Link href="/admin/batches" className="btn btn-sm">View all</Link>
        </div>
        {recentBatches.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No batches registered yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Farmer</th>
                  <th>Type</th>
                  <th>Quality</th>
                  <th>Approval</th>
                </tr>
              </thead>
              <tbody>
                {recentBatches.map(b => (
                  <tr key={b.batchId}>
                    <td><span className="mono">{b.batchId}</span></td>
                    <td>{b.farmerName || '—'}</td>
                    <td>{b.coffeeType || b.type || '—'}</td>
                    <td>{qualityPill(b.qualityStatus)}</td>
                    <td>{approvalPill(b.approvalStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="card">
        <div className="card-title">Quick links</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/admin/register-batch" className="btn btn-gold">+ Register batch</Link>
          <Link href="/admin/marketplace" className="btn">Marketplace</Link>
          <Link href="/admin/analytics" className="btn">Analytics</Link>
          <Link href="/admin/settings" className="btn">Settings</Link>
        </div>
      </div>
    </div>
  )
}
