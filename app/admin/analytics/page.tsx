'use client'

import { useState, useEffect } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function AnalyticsPage() {
  const [batches, setBatches] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/marketplace?all=true').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
    ]).then(([b, u]) => {
      // /api/marketplace returns a raw array, not { batches: [...] }
      setBatches(Array.isArray(b) ? b : b.batches || [])
      setUsers(u.users || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>Loading analytics…</div>
  )

  const farmers = users.filter(u => u.role === 'farmer')
  const customers = users.filter(u => u.role === 'customer')
  const approved = batches.filter(b => b.approvalStatus === 'approved')
  const passed = batches.filter(b => b.qualityStatus === 'Passed')
  const caution = batches.filter(b => b.qualityStatus === 'Caution')
  const failed = batches.filter(b => b.qualityStatus === 'Failed')
  const total = batches.length || 1

  // Coffee type breakdown
  const typeMap: Record<string, number> = {}
  batches.forEach(b => {
    const t = b.coffeeType || b.type || 'Other'
    typeMap[t] = (typeMap[t] || 0) + 1
  })
  const types = Object.entries(typeMap).sort((a, b) => b[1] - a[1])
  const maxType = Math.max(...types.map(t => t[1]), 1)

  // Real monthly counts from createdAt timestamps
  const thisYear  = new Date().getFullYear()
  const thisMonth = new Date().getMonth()
  const monthlyBatches = MONTHS.slice(0, thisMonth + 1).map((_, i) =>
    batches.filter(b => {
      if (!b.createdAt && !b.approvedAt) return false
      const d = new Date(b.createdAt || b.approvedAt)
      return d.getFullYear() === thisYear && d.getMonth() === i
    }).length
  )
  const maxMonthly = Math.max(...monthlyBatches, 1)

  // Region breakdown
  const regionMap: Record<string, number> = {}
  batches.forEach(b => {
    const r = b.origin || 'Unknown'
    regionMap[r] = (regionMap[r] || 0) + 1
  })
  const regions = Object.entries(regionMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const passRate = Math.round((passed.length / total) * 100)

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Analytics</div>
        <div className="page-sub">Platform overview — batches, users, quality, and traceability metrics.</div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Total batches</div>
          <div className="stat-val">{batches.length}</div>
          <div className="stat-sub stat-up">{approved.length} verified</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Quality pass rate</div>
          <div className="stat-val" style={{ color: passRate >= 60 ? 'var(--green)' : passRate >= 40 ? 'var(--amber)' : 'var(--red)' }}>{passRate}%</div>
          <div className="stat-sub">EU 2001/110/EC</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Farmers</div>
          <div className="stat-val">{farmers.length}</div>
          <div className="stat-sub stat-up">{farmers.filter(b => b.approvalStatus === 'approved').length} approved</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Customers</div>
          <div className="stat-val">{customers.length}</div>
          <div className="stat-sub">registered</div>
        </div>
      </div>

      <div className="two-col">
        {/* Monthly batches chart */}
        <div className="card">
          <div className="card-title">Batches registered by month</div>
          <div className="bar-chart" style={{ marginTop: 8 }}>
            {monthlyBatches.map((v, i) => (
              <div key={i} className="bar-col">
                <div className="bar-val">{v}</div>
                <div className="bar" style={{
                  height: `${Math.round((v / maxMonthly) * 100)}%`,
                  background: i === monthlyBatches.length - 1 ? 'var(--accent)' : 'var(--accent)'
                }} />
                <div className="bar-label">{MONTHS[i]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quality breakdown */}
        <div className="card">
          <div className="card-title">Quality distribution</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 8 }}>
            <svg width="120" height="120" viewBox="0 0 36 36" role="img" aria-label="Donut chart showing quality distribution">
              <title>Quality distribution</title>
              <circle cx="18" cy="18" r="13" fill="none" stroke="var(--border)" strokeWidth="7" />
              {(() => {
                const passArc = (passed.length / total) * 82
                const cautionArc = (caution.length / total) * 82
                const failArc = (failed.length / total) * 82
                return <>
                  <circle cx="18" cy="18" r="13" fill="none" stroke="#2D7A3A" strokeWidth="7"
                    strokeDasharray={`${passArc} ${82 - passArc}`} strokeDashoffset="0" transform="rotate(-90 18 18)" />
                  <circle cx="18" cy="18" r="13" fill="none" stroke="#2563EB" strokeWidth="7"
                    strokeDasharray={`${cautionArc} ${82 - cautionArc}`} strokeDashoffset={`-${passArc}`} transform="rotate(-90 18 18)" />
                  <circle cx="18" cy="18" r="13" fill="none" stroke="#8B2020" strokeWidth="7"
                    strokeDasharray={`${failArc} ${82 - failArc}`} strokeDashoffset={`-${passArc + cautionArc}`} transform="rotate(-90 18 18)" />
                </>
              })()}
              <text x="18" y="20" textAnchor="middle" fontSize="6" fontWeight="600" fill="var(--text)">{passRate}%</text>
            </svg>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Passed', count: passed.length, color: '#2D7A3A' },
                { label: 'Caution', count: caution.length, color: '#2563EB' },
                { label: 'Failed', count: failed.length, color: '#8B2020' },
              ].map(({ label, count, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{count}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 34, textAlign: 'right' }}>
                    {Math.round((count / total) * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="two-col">
        {/* Coffee type chart */}
        <div className="card">
          <div className="card-title">Batches by coffee type</div>
          {types.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data</div>
          ) : (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {types.map(([type, count]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 70, fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{type}</div>
                  <div style={{ flex: 1, height: 18, background: 'var(--cream)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 4, width: `${Math.round((count / maxType) * 100)}%`, transition: 'width .4s ease' }} />
                  </div>
                  <div style={{ width: 28, fontSize: 12, fontWeight: 600, textAlign: 'right' }}>{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Region breakdown */}
        <div className="card">
          <div className="card-title">Batches by origin region</div>
          {regions.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data</div>
          ) : (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {regions.map(([region, count]) => (
                <div key={region} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 90, fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{region}</div>
                  <div style={{ flex: 1, height: 18, background: 'var(--cream)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 4, width: `${Math.round((count / (regions[0]?.[1] || 1)) * 100)}%` }} />
                  </div>
                  <div style={{ width: 28, fontSize: 12, fontWeight: 600, textAlign: 'right' }}>{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User breakdown */}
      <div className="card">
        <div className="card-title">User breakdown</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
          {[
            { label: 'Approved farmers', val: farmers.filter(b => b.approvalStatus === 'approved').length, color: 'var(--green)' },
            { label: 'Pending farmers', val: farmers.filter(b => b.approvalStatus === 'pending').length, color: 'var(--amber)' },
            { label: 'Rejected farmers', val: farmers.filter(b => b.approvalStatus === 'rejected').length, color: 'var(--red)' },
            { label: 'Customers', val: customers.length, color: 'var(--blue)' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ flex: '1 1 140px', background: 'var(--cream)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
              <div style={{ fontSize: 22, fontWeight: 600, color }}>{val}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
