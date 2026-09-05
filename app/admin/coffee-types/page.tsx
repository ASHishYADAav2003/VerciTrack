'use client'
// app/admin/coffee-types/page.tsx

import { useState, useEffect } from 'react'

export default function CoffeeTypesPage() {
  const [pending, setPending]       = useState<any[]>([])
  const [knownCount, setKnownCount] = useState(0)
  const [loading, setLoading]       = useState(true)
  const [editing, setEditing]       = useState<Record<string, string>>({})
  const [msg, setMsg]               = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/coffee-types')
      const data = await res.json()
      setPending(data.pending || [])
      setKnownCount(data.knownCount || 0)
    } catch { }
    setLoading(false)
  }

  async function doAction(raw: string, approved: boolean) {
    const displayName = editing[raw] || pending.find(p => p.raw === raw)?.suggested || raw
    const res = await fetch('/api/admin/coffee-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw, approved, displayName }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ text: data.message, ok: true })
      await load()
    } else {
      setMsg({ text: data.error || 'Failed.', ok: false })
    }
    setTimeout(() => setMsg(null), 3000)
  }

  return (
    <div>
      {msg && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 999,
          background: msg.ok ? 'var(--accent)' : 'var(--red)',
          color: '#fff', padding: '10px 18px',
          borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500,
        }}>
          {msg.text}
        </div>
      )}

      <div className="page-header">
        <div className="page-title">Coffee type registry</div>
        <div className="page-sub">
          When a lab report contains an unrecognised coffee type, it is logged here for review.
          Approve to add it to the registry permanently — it will auto-map in future uploads.
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Known types in registry</div>
          <div className="stat-val" style={{ color: 'var(--green)' }}>{knownCount}</div>
          <div className="stat-sub">auto-mapped on upload</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending review</div>
          <div className="stat-val" style={{ color: pending.length > 0 ? 'var(--amber)' : 'var(--text)' }}>
            {pending.length}
          </div>
          <div className="stat-sub">found in lab reports, not yet mapped</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Unrecognised coffee types from lab reports</div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : pending.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
             No unknown coffee types pending review. The registry is up to date.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Raw text from report</th>
                  <th>Suggested display name</th>
                  <th>Times seen</th>
                  <th>First seen</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(p => (
                  <tr key={p.raw}>
                    <td><span className="mono">{p.raw}</span></td>
                    <td>
                      <input
                        value={editing[p.raw] ?? p.suggested}
                        onChange={e => setEditing(prev => ({ ...prev, [p.raw]: e.target.value }))}
                        style={{
                          border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                          padding: '4px 8px', fontSize: 13, width: 160,
                        }}
                      />
                    </td>
                    <td>
                      <span className="pill pill-amber">{p.seenCount}×</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(p.firstSeen).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-primary" onClick={() => doAction(p.raw, true)}>
                           Approve
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => doAction(p.raw, false)}>
                          Dismiss
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ background: 'var(--blue-bg)', border: '1px solid #d4c8f0' }}>
        <div className="card-title" style={{ color: 'var(--accent)' }}>How this works</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          <p>1. A farmer uploads a lab report PDF containing a coffee type not in the registry (e.g. <span className="mono">&quot;sidr&quot;</span>).</p>
          <p>2. The AI parser flags it as unknown and logs it here with the raw text and how many times it has appeared.</p>
          <p>3. You review and optionally rename it (e.g. <span className="mono">&quot;sidr&quot;</span> → <strong>Sidr</strong>), then click Approve.</p>
          <p>4. The registry is updated. All future lab reports containing that text will auto-map to the approved name.</p>
        </div>
      </div>
    </div>
  )
}
