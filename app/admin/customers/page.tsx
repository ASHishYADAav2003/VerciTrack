'use client'
// app/admin/customers/page.tsx

import { useState, useEffect } from 'react'

export default function CustomersPage() {
  const [users,   setUsers]   = useState<any[]>([])
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => {
        setUsers((d.users || []).filter((u: any) => u.role === 'customer'))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = users.filter(u =>
    !search ||
    (u.name  || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  )

  const getStatus = (u: any) => u.status ?? 'approved'

  const statusPill = (u: any) => {
    const s = getStatus(u)
    if (s === 'approved')  return <span className="pill pill-green">Active</span>
    if (s === 'suspended') return <span className="pill pill-red">Suspended</span>
    return <span className="pill pill-amber">Pending</span>
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Customers</div>
        <div className="page-sub">{users.length} registered customer{users.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-val">{users.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-val" style={{ color: 'var(--green)' }}>
            {users.filter(u => getStatus(u) === 'approved').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Suspended</div>
          <div className="stat-val" style={{ color: 'var(--red)' }}>
            {users.filter(u => getStatus(u) === 'suspended').length}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <input
            className="search-input"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            No customers found.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id || u.email}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: 'var(--blue-bg)', color: 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 600, flexShrink: 0,
                        }}>
                          {(u.name || u.email || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{u.name || '—'}</div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{u.email || '—'}</td>
                    <td style={{ fontSize: 12 }}>{u.address || '—'}</td>
                    <td>{statusPill(u)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {u.id
                        ? (() => {
                            const ts = parseInt((u.id.split('-').pop()) || '0')
                            return ts > 0
                              ? new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'
                          })()
                        : '—'}
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
