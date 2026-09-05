'use client'
// app/admin/approvals/page.tsx

import { useState, useEffect, useCallback } from 'react'

export default function FarmerApprovalsPage() {
  const [users,   setUsers]   = useState<any[]>([])
  const [filter,  setFilter]  = useState('pending')
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<any>(null)
  const [msg,     setMsg]     = useState<{ text: string; ok: boolean } | null>(null)
  const [acting,  setActing]  = useState(false)

  // users.json stores `status`; API may also expose `approvalStatus` — handle both
  const getStatus = (u: any): string => u.approvalStatus ?? u.status ?? 'pending'

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/approvals')
      const data = await res.json()
      setUsers(data.users || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  //  Uses email (always present) — never username (doesn't exist in users.json)
  const doAction = async (email: string, act: 'approve' | 'reject' | 'suspend' | 'reinstate') => {
    setActing(true)
    try {
      const res  = await fetch('/api/admin/approvals', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, action: act }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ text: data.message || ` Done`, ok: true })
        setModal(null)
        await loadUsers()
      } else {
        setMsg({ text: data.error || 'Action failed.', ok: false })
      }
    } catch {
      setMsg({ text: 'Network error.', ok: false })
    }
    setActing(false)
    setTimeout(() => setMsg(null), 3000)
  }

  const farmers = users.filter(u => u.role === 'farmer')

  const counts = {
    pending:   farmers.filter(u => getStatus(u) === 'pending').length,
    approved:  farmers.filter(u => getStatus(u) === 'approved').length,
    rejected:  farmers.filter(u => getStatus(u) === 'rejected').length,
    suspended: farmers.filter(u => getStatus(u) === 'suspended').length,
  }

  const filtered = farmers
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
      {/* Toast */}
      {msg && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 999,
          background: msg.ok ? 'var(--accent)' : 'var(--red)',
          color: '#fff', padding: '10px 18px',
          borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>
          {msg.text}
        </div>
      )}

      <div className="page-header">
        <div className="page-title">Farmer registrations</div>
        <div className="page-sub">Review and approve, reject, or suspend farmer accounts.</div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {[
          { label: 'Pending',   value: counts.pending,   key: 'pending',   color: 'var(--amber)' },
          { label: 'Approved',  value: counts.approved,  key: 'approved',  color: 'var(--green)' },
          { label: 'Rejected',  value: counts.rejected,  key: 'rejected',  color: 'var(--red)'   },
          { label: 'Suspended', value: counts.suspended, key: 'suspended', color: 'var(--blue)'  },
        ].map(s => (
          <div key={s.key} className="stat-card"
            onClick={() => setFilter(filter === s.key ? 'all' : s.key)}
            style={{ cursor: 'pointer', borderColor: filter === s.key ? 'var(--accent)' : undefined }}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-val" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <input className="search-input" placeholder="Search by name or email…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>No farmers match this filter.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Email</th>
                  <th>Farm</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  //  key uses u.id (always unique), email as fallback
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
                        <div>
                          <div style={{ fontWeight: 500 }}>{u.name || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{u.email || '—'}</td>
                    <td>{u.farmName || '—'}</td>
                    <td>{u.location || '—'}</td>
                    <td>{statusPill(u)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-primary" onClick={() => setModal(u)}>
                          {getStatus(u) === 'pending' ? 'Review' : 'View'}
                        </button>
                        {getStatus(u) === 'approved' && (
                          <button className="btn btn-sm btn-danger"
                            onClick={() => doAction(u.email, 'suspend')}>
                            Suspend
                          </button>
                        )}
                        {getStatus(u) === 'suspended' && (
                          <button className="btn btn-sm btn-primary"
                            onClick={() => doAction(u.email, 'reinstate')}>
                            Reinstate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <div className={`modal-backdrop ${modal ? 'open' : ''}`}
        onClick={e => e.target === e.currentTarget && setModal(null)}>
        {modal && (
          <div className="modal">
            <div className="modal-title">
              {getStatus(modal) === 'pending'
                ? ' Review farmer application'
                : `Farmer — ${getStatus(modal)}`}
            </div>

            {[
              ['Name',     modal.name       || '—'],
              ['Email',    modal.email      || '—'],
              ['Farm',     modal.farmName   || '—'],
              ['Location', modal.location   || '—'],
              ['Wallet',   modal.walletAddress || 'Not linked'],
              ['Status',   getStatus(modal)],
            ].map(([label, val]) => (
              <div className="modal-row" key={label}>
                <span className="modal-row-label">{label}</span>
                <span className="modal-row-val">{val}</span>
              </div>
            ))}

            {/*  All buttons use modal.email — never modal.username */}
            {getStatus(modal) === 'pending' && (
              <div className="modal-actions">
                <button className="btn btn-primary" disabled={acting}
                  onClick={() => doAction(modal.email, 'approve')}>
                  {acting ? 'Saving…' : 'Approve'}
                </button>
                <button className="btn btn-danger" disabled={acting}
                  onClick={() => doAction(modal.email, 'reject')}>
                  {acting ? 'Saving…' : 'Reject'}
                </button>
                <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              </div>
            )}
            {getStatus(modal) === 'approved' && (
              <div className="modal-actions">
                <button className="btn btn-danger" disabled={acting}
                  onClick={() => doAction(modal.email, 'suspend')}>Suspend account</button>
                <button className="btn" onClick={() => setModal(null)}>Close</button>
              </div>
            )}
            {getStatus(modal) === 'suspended' && (
              <div className="modal-actions">
                <button className="btn btn-primary" disabled={acting}
                  onClick={() => doAction(modal.email, 'reinstate')}>Reinstate account</button>
                <button className="btn" onClick={() => setModal(null)}>Close</button>
              </div>
            )}
            {getStatus(modal) === 'rejected' && (
              <div className="modal-actions">
                <button className="btn" onClick={() => setModal(null)}>Close</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
