'use client'
// app/admin/farmers/page.tsx

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function FarmersPage() {
  const [users,   setUsers]   = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('all')
  const [loading, setLoading] = useState(true)

  // users.json may store `status` OR `approvalStatus` — normalise both
  const getStatus = (u: any): string => u.approvalStatus ?? u.status ?? 'pending'

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/marketplace').then(r => r.json()),
    ]).then(([u, b]) => {
      setUsers((u.users || []).filter((x: any) => x.role === 'farmer'))
      setBatches(b.batches || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const getBatchCount = (u: any) =>
    batches.filter(b =>
      (b.farmerName || '').toLowerCase() === (u.name || '').toLowerCase() ||
      (b.farmerUsername || '') === (u.username || '')
    ).length

  const filtered = users
    .filter(u => filter === 'all' || getStatus(u) === filter)
    .filter(u => !search ||
      (u.name  || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
    )

  const statusPill = (u: any) => {
    const s = getStatus(u)
    if (s === 'approved')  return <span className="pill pill-green">Approved</span>
    if (s === 'rejected')  return <span className="pill pill-red">Rejected</span>
    if (s === 'suspended') return <span className="pill pill-blue">Suspended</span>
    return <span className="pill pill-amber">Pending</span>
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">All farmers</div>
          <div className="page-sub">{users.length} registered farmer{users.length !== 1 ? 's' : ''}</div>
        </div>
        <Link href="/admin/approvals" className="btn btn-primary">Pending approvals</Link>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total',     val: users.length,                                            color: undefined        },
          { label: 'Approved',  val: users.filter(u => getStatus(u) === 'approved').length,  color: 'var(--green)'  },
          { label: 'Pending',   val: users.filter(u => getStatus(u) === 'pending').length,   color: 'var(--amber)'  },
          { label: 'Suspended', val: users.filter(u => getStatus(u) === 'suspended').length, color: 'var(--blue)'   },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <input
            className="search-input"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Email</th>
                  <th>Farm</th>
                  <th>Location</th>
                  <th>Batches</th>
                  <th>Status</th>
                  <th>Profile</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                      No farmers found.
                    </td>
                  </tr>
                ) : filtered.map(u => (
                  //  key uses u.id (always unique) with email fallback
                  <tr key={u.id || u.email}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'var(--blue-bg)', color: 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 600, flexShrink: 0,
                        }}>
                          {(u.name || u.email || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{u.name || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{u.email || '—'}</td>
                    <td>{u.farmName || '—'}</td>
                    <td>{u.location || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{getBatchCount(u)}</td>
                    <td>{statusPill(u)}</td>
                    <td>
                      <Link
                        href={`/farmer-profile/${encodeURIComponent(u.name || u.email)}`}
                        className="btn btn-sm"
                        style={{ textDecoration: 'none' }}
                      >
                        View
                      </Link>
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
