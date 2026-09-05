'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface MLStats {
  mode:              'rf' | 'rule-based'
  sampleCount:       number
  r2:                number | null
  trainedAt:         string | null
  samplesNeeded:     number
  featureImportance: Record<string, number> | null
}

export default function BatchApprovalsPage() {
  const router = useRouter()
  const [batches, setBatches]         = useState<any[]>([])
  const [filter, setFilter]           = useState('all')
  const [qualityFilter, setQualityFilter] = useState('all')
  const [search, setSearch]           = useState('')
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState<any>(null)
  const [note, setNote]               = useState('')
  const [msg, setMsg]                 = useState<{ text: string; ok: boolean } | null>(null)
  const [acting, setActing]           = useState(false)
  const [registering, setRegistering] = useState(false)
  const [retraining, setRetraining]   = useState(false)

  const [mlStats, setMlStats]         = useState<MLStats | null>(null)
  const [orderMap, setOrderMap]       = useState<Record<string, number>>({})

  const loadML = useCallback(async () => {
    try {
      const res  = await fetch('/api/admin/training-label')
      const data = await res.json()
      if (res.ok) setMlStats(data.stats)
    } catch { /* non-critical */ }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [bRes, oRes] = await Promise.all([
        fetch('/api/admin/batch-approvals'),
        fetch('/api/orders'),
      ])
      const bData = await bRes.json()
      const oData = await oRes.json()
      setBatches(bData.batches || [])
      const map: Record<string, number> = {}
      for (const o of (oData.orders || [])) {
        if (o.batchId) map[o.batchId] = (map[o.batchId] || 0) + (Number(o.quantity) || 0)
      }
      setOrderMap(map)
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load(); loadML() }, [load, loadML])

  const doRetrain = async () => {
    setRetraining(true)
    try {
      const res  = await fetch('/api/admin/training-label', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setMsg({ text: data.message || 'Retrain triggered.', ok: true })
        setMlStats(data.stats)
      } else {
        setMsg({ text: data.error || 'Retrain failed.', ok: false })
      }
    } catch {
      setMsg({ text: 'Network error.', ok: false })
    }
    setRetraining(false)
    setTimeout(() => setMsg(null), 4000)
  }

  const doRegisterOnChain = async (batchId: string) => {
    setRegistering(true)
    try {
      const res  = await fetch('/api/admin/batch-approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, action: 'register' }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ text: 'Batch registered on blockchain!', ok: true })
        setModal(null)
        await load()
        await loadML()
      } else {
        setMsg({ text: data.error || 'Registration failed.', ok: false })
      }
    } catch {
      setMsg({ text: 'Network error.', ok: false })
    }
    setRegistering(false)
    setTimeout(() => setMsg(null), 4000)
  }

  function openEdit(b: any) {
    const num = (v: any) => (v != null && v !== '' ? String(v) : '')
    const str = (v: any) => (v != null ? String(v) : '')
    const p = new URLSearchParams({
      edit:                '1',
      batchId:             b.batchId             ?? '',
      farmerName:       b.farmerName        ?? '',
      origin:              b.origin               ?? '',
      coffeeType:           b.coffeeType            ?? '',
      harvestYear:         num(b.harvestYear)     || String(new Date().getFullYear()),
      producerDeclaration: b.producerDeclaration  ?? '',
      // Standard params
      humidity:            num(b.humidity),
      hmf:                 num(b.hmf),
      colour:              num(b.colour),
      diastase:            num(b.diastase),
      freeAcidity:         num(b.freeAcidity),
      proline:             num(b.proline),
      conductivity:        num(b.conductivity),
      fructoseGlucose:     num(b.fructoseGlucose),
      reducingSugars:      num(b.reducingSugars),
      sucrose:             num(b.sucrose),
      ash:                 num(b.ash),
      isotopicDiff:        num(b.isotopicDiff),
      // Marketplace
      price:               num(b.price),
      wholesaleQty:        num(b.wholesaleQty),
      wholesaleUnit:       b.wholesaleUnit        ?? 'kg',
      jarSizeG:            num(b.jarSizeG)        || '500',
      description:         b.description          ?? '',
      imageUrl:            b.imageUrl             ?? '',
      pdfHash:             b.pdfHash              ?? '',
      pdfName:             b.pdfName              ?? '',
      // Extended geographic
      zone:                str(b.zone),
      altitude:            num(b.altitude),
      latitude:            num(b.latitude),
      longitude:           num(b.longitude),
      harvestMonth:        num(b.harvestMonth),
      crystallisation:     str(b.crystallisation),
      productionSystem:    str(b.productionSystem),
      // Extended biochemistry
      ph:                  num(b.ph),
      invertase:           num(b.invertase),
      fructose:            num(b.fructose),
      glucose:             num(b.glucose),
      fgRatio:             num(b.fgRatio),
      maltose:             num(b.maltose),
      waterActivity:       num(b.waterActivity),
      opticalRotation:     num(b.opticalRotation),
      viscosity:           num(b.viscosity),
      totalPolyphenols:    num(b.totalPolyphenols),
      dpph:                num(b.dpph),
      hdeEncoded:          num(b.hdeEncoded),
      // Botanical
      hde:                 str(b.hde),
      dominantPollen:      str(b.dominantPollen),
      dominantPollenPct:   num(b.dominantPollenPct),
      secondaryPollens:    str(b.secondaryPollens),
      pollenConcentration: str(b.pollenConcentration),
      botanicalConfirmed:  str(b.botanicalConfirmed),
      geographicConfirmed: str(b.geographicConfirmed),
      palynologicalNotes:  str(b.palynologicalNotes),
      coffeedewSpecies:     str(b.coffeedewSpecies),
      nectarlessSpecies:   str(b.nectarlessSpecies),
      // Colour & DPPH unit
      colourDescription:   str(b.colourDescription),
      dpphUnit:            str(b.dpphUnit),
      // Sensory
      appearance:          str(b.appearance),
      aromaIntensity:      str(b.aromaIntensity),
      aromaDescription:    str(b.aromaDescription),
      tasteDescription:    str(b.tasteDescription),
      sensorPersistence:   str(b.sensorPersistence),
      organolepticDefects: str(b.organolepticDefects),
      texture:             str(b.texture),
      // Lab metadata
      labName:             str(b.labName),
      accreditation:       str(b.accreditation),
      sampleCollectionDate: str(b.sampleCollectionDate),
      sampleReceivedDate:  str(b.sampleReceivedDate),
      analysisDate:        str(b.analysisDate),
      // Micro & contaminants
      yeastCount:          num(b.yeastCount),
      totalPlateCount:     num(b.totalPlateCount),
      leadPb:              num(b.leadPb),
      cadmiumCd:           num(b.cadmiumCd),
      pesticideScreen:     num(b.pesticideScreen),
      antibioticScreen:    num(b.antibioticScreen),
    })
    router.push(`/admin/register-batch?${p.toString()}`)
  }

  const doAction = async (batchId: string, action: 'approved' | 'rejected' | 'suspended', adminNote = '') => {
    setActing(true)
    try {
      const res  = await fetch('/api/admin/batch-approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, action, adminNote }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ text: data.message, ok: true })
        setModal(null)
        setNote('')
        await load()
      } else {
        setMsg({ text: data.error || 'Action failed.', ok: false })
      }
    } catch {
      setMsg({ text: 'Network error.', ok: false })
    }
    setActing(false)
    setTimeout(() => setMsg(null), 3000)
  }

  // ── Pill helpers ──────────────────────────────────────────────────────────────

  const qualityPill = (s: string) => {
    const n = (s || '').toLowerCase()
    if (n === 'passed')  return <span className="pill pill-green">Pass</span>
    if (n === 'caution') return <span className="pill pill-amber">Caution</span>
    if (n === 'failed')  return <span className="pill pill-red">Fail</span>
    return <span className="pill" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>No data</span>
  }

  const approvalPill = (s: string) => {
    if (s === 'approved')  return <span className="pill pill-green">Approved</span>
    if (s === 'rejected')  return <span className="pill pill-red">Rejected</span>
    if (s === 'suspended') return <span className="pill pill-blue">Suspended</span>
    return <span className="pill pill-amber">Pending</span>
  }

  const adulterationPill = (risk: string) => {
    if (risk === 'high')   return <span className="pill pill-red"   title="High adulteration risk">High</span>
    if (risk === 'medium') return <span className="pill pill-amber" title="Medium adulteration risk">◉ Medium</span>
    return <span className="pill pill-green" title="Low adulteration risk">Low</span>
  }

  // ── Filter counts ─────────────────────────────────────────────────────────────

  const pending   = batches.filter(b => b.approvalStatus === 'pending')
  const approved  = batches.filter(b => b.approvalStatus === 'approved')
  const rejected  = batches.filter(b => b.approvalStatus === 'rejected')
  const suspended = batches.filter(b => b.approvalStatus === 'suspended')

  const visible = batches
    .filter(b => filter === 'all' || b.approvalStatus === filter)
    .filter(b => qualityFilter === 'all' || b.qualityStatus === qualityFilter)
    .filter(b => !search ||
      (b.batchId || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.farmerName || '').toLowerCase().includes(search.toLowerCase())
    )

  const canApprove = (b: any) => (b.qualityStatus || '').toLowerCase() !== 'failed'

  const topFeature = mlStats?.featureImportance
    ? Object.entries(mlStats.featureImportance).sort((a, b) => b[1] - a[1])[0]
    : null

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
        <div className="page-title">Batch approvals</div>
        <div className="page-sub">Review lab results and approve or reject coffee batches. Failed batches cannot be approved per EU Directive 2001/110/EC.</div>
      </div>

      {/* Stats — clickable filters */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {[
          { label: 'Pending',   value: pending.length,   key: 'pending',   color: 'var(--amber)' },
          { label: 'Approved',  value: approved.length,  key: 'approved',  color: 'var(--green)' },
          { label: 'Rejected',  value: rejected.length,  key: 'rejected',  color: 'var(--red)'   },
          { label: 'Suspended', value: suspended.length, key: 'suspended', color: 'var(--blue)'  },
        ].map(s => (
          <div
            key={s.key}
            className="stat-card"
            onClick={() => setFilter(filter === s.key ? 'all' : s.key)}
            style={{ cursor: 'pointer', borderColor: filter === s.key ? 'var(--accent)' : undefined }}
          >
            <div className="stat-label">{s.label}</div>
            <div className="stat-val" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* EU quality note */}
      <div style={{ background: 'var(--amber-bg)', border: '1px solid #f5d99a', borderRadius: 'var(--radius)', padding: '12px 16px', fontSize: 12, color: 'var(--amber)', marginBottom: 16 }}>
        <strong>EU Directive 2001/110/EC quality thresholds:</strong><br />
        Humidity: ≤18.6% = Pass · 18.6–20% = Caution · &gt;20% = Fail &nbsp;|&nbsp; HMF: ≤30 mg/kg = Pass · 30–40 = Caution · &gt;40 mg/kg = Fail
      </div>

      {/* RF ML Status */}
      {mlStats && (
        <div style={{
          background: mlStats.mode === 'rf' ? '#F0FDF4' : 'var(--surface)',
          border: `1px solid ${mlStats.mode === 'rf' ? '#BBF7D0' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: mlStats.mode === 'rf' ? '#166534' : 'var(--text-muted)', marginBottom: 3 }}>
              {mlStats.mode === 'rf' ? 'Random Forest active' : 'Rule-based mode (EU thresholds)'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {mlStats.mode === 'rf'
                ? `Trained on ${mlStats.sampleCount} registered batches · R²=${mlStats.r2?.toFixed(2)} · Last trained ${mlStats.trainedAt ? new Date(mlStats.trainedAt).toLocaleDateString() : '—'}${topFeature ? ` · Top feature: ${topFeature[0]} (${(topFeature[1] * 100).toFixed(0)}%)` : ''}`
                : `Register ${mlStats.samplesNeeded} more batch${mlStats.samplesNeeded !== 1 ? 'es' : ''} on-chain to activate Random Forest scoring. Training is fully automatic.`
              }
            </div>
          </div>
          <div style={{ minWidth: 160 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textAlign: 'right' }}>
              {mlStats.sampleCount}/5 batches registered
            </div>
            <div style={{ background: 'var(--border)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${Math.min(100, (mlStats.sampleCount / 5) * 100)}%`,
                background: mlStats.mode === 'rf' ? '#16A34A' : 'var(--accent)',
                transition: 'width 0.4s',
              }} />
            </div>
          </div>
          <button
            className="btn btn-sm"
            disabled={retraining}
            onClick={doRetrain}
            style={{ fontSize: 11, whiteSpace: 'nowrap' }}
          >
            {retraining ? 'Retraining…' : '↺ Retrain'}
          </button>
        </div>
      )}

      <div className="card">
        <div className="toolbar">
          <input
            className="search-input"
            placeholder="Search batch ID or farmer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
          <select className="filter-select" value={qualityFilter} onChange={e => setQualityFilter(e.target.value)}>
            <option value="all">All quality</option>
            <option value="Passed">Pass</option>
            <option value="Caution">Caution</option>
            <option value="Failed">Fail</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>No batches match this filter.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Farmer</th>
                  <th>Type</th>
                  <th>Origin</th>
                  <th>Humidity</th>
                  <th>HMF</th>
                  <th>Quality</th>
                  <th>Adulteration</th>
                  <th>Stock left</th>
                  <th>Approval</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(b => {
                  const hum    = b.humidity != null ? Number(b.humidity) : null
                  const hmf    = b.hmf      != null ? Number(b.hmf)      : null
                  const humVal = hum !== null ? (hum > 100 ? hum / 10 : hum) : null
                  const hmfVal = hmf !== null ? (hmf > 100 ? hmf / 10 : hmf) : null
                  return (
                    <tr key={b.batchId}>
                      <td><span className="mono">{b.batchId}</span></td>
                      <td>{b.farmerName || '—'}</td>
                      <td>{b.coffeeType || '—'}</td>
                      <td>{b.origin || '—'}</td>
                      <td style={{ color: humVal !== null ? (humVal > 20 ? 'var(--red)' : humVal > 18.6 ? 'var(--amber)' : 'inherit') : undefined }}>
                        {humVal !== null ? `${humVal.toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ color: hmfVal !== null ? (hmfVal > 40 ? 'var(--red)' : hmfVal > 30 ? 'var(--amber)' : 'inherit') : undefined }}>
                        {hmfVal !== null ? `${hmfVal.toFixed(1)} mg/kg` : '—'}
                      </td>
                      <td>{qualityPill(b.qualityStatus)}</td>
                      <td>
                        {b.adulterationRisk
                          ? adulterationPill(b.adulterationRisk)
                          : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        {b.totalStock != null ? (() => {
                          const sold = orderMap[b.batchId] || 0
                          const left = b.totalStock - sold
                          const pct  = b.totalStock > 0 ? left / b.totalStock : 1
                          return (
                            <span style={{
                              fontWeight: 600, fontSize: 12,
                              color: pct <= 0 ? 'var(--red)' : pct < 0.2 ? 'var(--amber)' : 'var(--green)',
                            }}>
                              {left}/{b.totalStock} {b.unit || 'jars'}
                            </span>
                          )
                        })() : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                      </td>
                      <td>{approvalPill(b.approvalStatus)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="btn btn-sm" onClick={() => { setModal(b); setNote('') }}>
                            {b.approvalStatus === 'pending' ? 'Review' : 'View'}
                          </button>
                          <button className="btn btn-sm" onClick={() => openEdit(b)}
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            Edit
                          </button>
                          {b.approvalStatus === 'approved' && b.source === 'farmer' && !b.onChain && (
                            <button
                              className="btn btn-sm"
                              onClick={() => { setModal(b); setNote('') }}
                              style={{ background: '#EAB307', color: '#000', borderColor: '#EAB307' }}
                            >
                              Register on Chain
                            </button>
                          )}
                          {b.approvalStatus === 'approved' && (
                            <button className="btn btn-sm btn-danger" onClick={() => doAction(b.batchId, 'suspended')}>
                              Suspend
                            </button>
                          )}
                          {b.approvalStatus === 'suspended' && (
                            <button className="btn btn-sm btn-primary" onClick={() => doAction(b.batchId, 'approved')}>
                              Reinstate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail / Review modal */}
      <div className={`modal-backdrop ${modal ? 'open' : ''}`} onClick={e => e.target === e.currentTarget && setModal(null)}>
        {modal && (
          <div className="modal">
            <div className="modal-title">
              {modal.approvalStatus === 'pending' ? 'Review batch' : `Batch — ${modal.approvalStatus}`}
            </div>

            {/* Adulteration risk banner */}
            {modal.adulterationRisk && modal.adulterationRisk !== 'low' && (
              <div style={{
                background: modal.adulterationRisk === 'high' ? 'var(--red-bg)' : 'var(--amber-bg)',
                border: `1px solid ${modal.adulterationRisk === 'high' ? 'var(--red)' : '#f5d99a'}`,
                borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 14,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: modal.adulterationRisk === 'high' ? 'var(--red)' : 'var(--amber)', marginBottom: 6 }}>
                  {modal.adulterationRisk === 'high' ? 'High adulteration risk' : 'Medium adulteration risk'}
                </div>
                {(modal.adulterationFlags || []).map((flag: string, i: number) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, paddingLeft: 8, borderLeft: '2px solid currentColor' }}>
                    {flag}
                  </div>
                ))}
              </div>
            )}

            {[
              ['Batch ID',     <span className="mono">{modal.batchId}</span>],
              ['Name',         modal.name],
              ['Farmer',    modal.farmerName],
              ['Origin',       modal.origin],
              ['Coffee type',   modal.coffeeType],
              ['Harvest year', modal.harvestYear],
              ['Humidity',     modal.humidity !== undefined ? `${modal.humidity}%` : '—'],
              ['HMF',          modal.hmf !== undefined ? `${modal.hmf} mg/kg` : '—'],
              ['Colour',       modal.colour !== undefined ? `${modal.colour} mm Pfund` : '—'],
              ['Weight',       modal.weight],
              ['Price',        modal.price ? `€${modal.price}` : '—'],
              ['Quality',      qualityPill(modal.qualityStatus)],
              ['Adulteration', modal.adulterationRisk ? adulterationPill(modal.adulterationRisk) : '—'],
              ['Status',       approvalPill(modal.approvalStatus)],
            ].map(([label, val], i) => (
              <div className="modal-row" key={i}>
                <span className="modal-row-label">{label}</span>
                <span className="modal-row-val">{val || '—'}</span>
              </div>
            ))}

            {/* Auth check summary */}
            {modal.adulterationRisk === 'low' && (
              <div className="modal-row">
                <span className="modal-row-label">Auth. checks</span>
                <span className="modal-row-val" style={{ fontSize: 11, color: 'var(--green)' }}>All authenticity checks passed</span>
              </div>
            )}
            {modal.adulterationRisk !== 'low' && (modal.adulterationFlags || []).length > 0 && (
              <div className="modal-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <span className="modal-row-label">Auth. flags</span>
                <div>
                  {(modal.adulterationFlags || []).map((flag: string, i: number) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '3px 0' }}>• {flag}</div>
                  ))}
                </div>
              </div>
            )}

            {modal.adminNote && (
              <div className="modal-row">
                <span className="modal-row-label">Admin note</span>
                <span className="modal-row-val" style={{ fontSize: 12 }}>{modal.adminNote}</span>
              </div>
            )}

            {modal.approvalStatus === 'pending' && (
              <>
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Admin note (optional)</div>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Reason for rejection, notes for farmer…"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12, resize: 'vertical', minHeight: 70, fontFamily: 'inherit' }}
                  />
                </div>

                {!canApprove(modal) && (
                  <div style={{ background: 'var(--red-bg)', color: 'var(--red)', fontSize: 12, padding: '8px 12px', borderRadius: 'var(--radius)', marginTop: 10 }}>
                    This batch failed quality checks and cannot be approved per EU 2001/110/EC.
                  </div>
                )}

                <div className="modal-actions">
                  {canApprove(modal) && (
                    <button className="btn btn-primary" disabled={acting} onClick={() => doAction(modal.batchId, 'approved', note)}>
                      {acting ? 'Saving…' : 'Approve'}
                    </button>
                  )}
                  <button className="btn btn-danger" disabled={acting} onClick={() => doAction(modal.batchId, 'rejected', note)}>
                    {acting ? 'Saving…' : 'Reject'}
                  </button>
                  <button className="btn" onClick={() => setModal(null)}>Cancel</button>
                </div>
              </>
            )}

            {modal.approvalStatus === 'approved' && (
              <>
                {modal.source === 'farmer' && !modal.onChain && (
                  <div style={{ margin: '16px 0', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 6 }}>Register on Blockchain</div>
                    <div style={{ fontSize: 12, color: '#78350F', marginBottom: 12 }}>
                      This batch is approved. Registering it will make it visible on the marketplace and automatically feed it into the RF training model. Make sure <code>npm run chain</code> is running.
                    </div>
                    <button
                      className="btn btn-primary"
                      disabled={registering}
                      onClick={() => doRegisterOnChain(modal.batchId)}
                      style={{ background: '#EAB307', color: '#000', border: 'none', width: '100%' }}
                    >
                      {registering ? 'Registering…' : 'Register on Blockchain'}
                    </button>
                  </div>
                )}
                <div className="modal-actions">
                  <button className="btn btn-danger" disabled={acting} onClick={() => doAction(modal.batchId, 'suspended', note)}>Suspend</button>
                  <button className="btn" onClick={() => setModal(null)}>Close</button>
                </div>
              </>
            )}

            {modal.approvalStatus === 'suspended' && (
              <div className="modal-actions">
                <button className="btn btn-primary" disabled={acting} onClick={() => doAction(modal.batchId, 'approved', note)}>
                  Reinstate
                </button>
                <button className="btn" onClick={() => setModal(null)}>Close</button>
              </div>
            )}

            {modal.approvalStatus === 'rejected' && (
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
