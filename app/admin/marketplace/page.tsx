'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminMarketplacePage() {
  const [batches, setBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/marketplace?all=true')
      .then(r => r.json())
      .then(d => {
        setBatches(Array.isArray(d) ? d : d.batches || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const approved = batches.filter(b => b.approvalStatus === 'approved')
  const pending = batches.filter(b => b.approvalStatus === 'pending')

  // Group by coffee type
  const typeMap: Record<string, number> = {}
  approved.forEach(b => {
    const t = b.coffeeType || 'Other'
    typeMap[t] = (typeMap[t] || 0) + 1
  })
  const types = Object.entries(typeMap).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Marketplace</div>
        <div className="page-sub">Live marketplace overview — products visible to customers.</div>
      </div>

      {/* Quick link to public marketplace */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Public marketplace</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            View the marketplace as customers see it — approved batches, product cards, and search.
          </div>
        </div>
        <a href="/marketplace" target="_blank" rel="noopener noreferrer"
          style={{ flexShrink: 0, background: 'var(--accent)', color: '#fff', padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Open marketplace ↗
        </a>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Live products</div>
          <div className="stat-val">{loading ? '—' : approved.length}</div>
          <div className="stat-sub stat-up">visible to customers</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending approval</div>
          <div className="stat-val" style={{ color: 'var(--amber)' }}>{loading ? '—' : pending.length}</div>
          <div className="stat-sub">awaiting review</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Coffee types</div>
          <div className="stat-val">{loading ? '—' : types.length}</div>
          <div className="stat-sub">in catalogue</div>
        </div>
      </div>

      {/* Live products table */}
      <div className="card">
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>Live products ({approved.length})</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : approved.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            No approved products yet. Approve batches in{' '}
            <Link href="/admin/batch-approvals" style={{ color: 'var(--accent)' }}>Batch approvals</Link>.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Product name</th>
                  <th>Farmer</th>
                  <th>Type</th>
                  <th>Origin</th>
                  <th>Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((b, i) => (
                  <tr key={b.id || b.batchId || i}>
                    <td><span className="mono" style={{ fontSize: 11 }}>{b.batchId}</span></td>
                    <td style={{ fontWeight: 500 }}>{b.name || '—'}</td>
                    <td>{b.farmerName || '—'}</td>
                    <td>{b.coffeeType || '—'}</td>
                    <td>{b.origin || '—'}</td>
                    <td>{b.price ? `€${b.price}` : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <a href={`/product/${b.id || b.batchId}`} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                          View ↗
                        </a>
                        <Link href={`/admin/batch-approvals`}
                          style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none' }}>
                          Manage
                        </Link>
                      </div>
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
