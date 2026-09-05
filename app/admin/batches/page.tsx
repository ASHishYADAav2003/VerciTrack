'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createPublicClient, http } from 'viem'
import { CONTRACT_ADDRESS, CONTRACT_ABI, activeChain, RPC_URL } from '@/lib/contractConfig'

export default function AllBatchesPage() {
  const router = useRouter()
  const [batches, setBatches] = useState<any[]>([])
  const [offchain, setOffchain] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [qualityFilter, setQualityFilter] = useState('all')
  const [approvalFilter, setApprovalFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<'blockchain' | 'offchain'>('offchain')

  function openEdit(b: any) {
    const num = (v: any) => (v != null && v !== '' ? String(v) : '')
    const str = (v: any) => (v != null ? String(v) : '')
    const p = new URLSearchParams({
      edit: '1',
      batchId: b.batchId ?? '',
      farmerName: b.farmerName ?? '',
      origin: b.origin ?? '',
      coffeeType: b.coffeeType ?? '',
      harvestYear: num(b.harvestYear) || String(new Date().getFullYear()),
      producerDeclaration: b.producerDeclaration ?? '',
      humidity: num(b.humidity), hmf: num(b.hmf), colour: num(b.colour),
      diastase: num(b.diastase), freeAcidity: num(b.freeAcidity), proline: num(b.proline),
      conductivity: num(b.conductivity), fructoseGlucose: num(b.fructoseGlucose),
      reducingSugars: num(b.reducingSugars), sucrose: num(b.sucrose),
      ash: num(b.ash), isotopicDiff: num(b.isotopicDiff),
      price: num(b.price), wholesaleQty: num(b.wholesaleQty),
      wholesaleUnit: b.wholesaleUnit ?? 'kg', jarSizeG: num(b.jarSizeG) || '500',
      description: b.description ?? '', imageUrl: b.imageUrl ?? '',
      pdfHash: b.pdfHash ?? '', pdfName: b.pdfName ?? '',
      zone: str(b.zone), altitude: num(b.altitude),
      latitude: num(b.latitude), longitude: num(b.longitude),
      harvestMonth: num(b.harvestMonth), crystallisation: str(b.crystallisation),
      productionSystem: str(b.productionSystem),
      ph: num(b.ph), invertase: num(b.invertase), fructose: num(b.fructose),
      glucose: num(b.glucose), fgRatio: num(b.fgRatio), maltose: num(b.maltose),
      waterActivity: num(b.waterActivity), opticalRotation: num(b.opticalRotation),
      viscosity: num(b.viscosity), totalPolyphenols: num(b.totalPolyphenols),
      dpph: num(b.dpph), hdeEncoded: num(b.hdeEncoded),
      hde: str(b.hde), dominantPollen: str(b.dominantPollen),
      dominantPollenPct: num(b.dominantPollenPct), secondaryPollens: str(b.secondaryPollens),
      botanicalConfirmed: str(b.botanicalConfirmed), geographicConfirmed: str(b.geographicConfirmed),
      palynologicalNotes: str(b.palynologicalNotes), nectarlessSpecies: str(b.nectarlessSpecies),
      colourDescription: str(b.colourDescription), dpphUnit: str(b.dpphUnit),
      appearance: str(b.appearance), aromaIntensity: str(b.aromaIntensity),
      aromaDescription: str(b.aromaDescription), tasteDescription: str(b.tasteDescription),
      sensorPersistence: str(b.sensorPersistence), organolepticDefects: str(b.organolepticDefects),
      texture: str(b.texture),
      labName: str(b.labName), accreditation: str(b.accreditation),
      sampleCollectionDate: str(b.sampleCollectionDate), sampleReceivedDate: str(b.sampleReceivedDate),
      analysisDate: str(b.analysisDate),
      yeastCount: num(b.yeastCount), totalPlateCount: num(b.totalPlateCount),
      leadPb: num(b.leadPb), cadmiumCd: num(b.cadmiumCd),
      pesticideScreen: num(b.pesticideScreen), antibioticScreen: num(b.antibioticScreen),
    })
    router.push(`/admin/register-batch?${p.toString()}`)
  }

  useEffect(() => { loadOffchain() }, [])

  const loadOffchain = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/marketplace?all=true')
      const data = await res.json()
      // API returns a raw array, not { batches: [...] }
      const list = Array.isArray(data) ? data : data.batches || []
      setOffchain(list)
      setBatches(list)
    } catch { }
    setLoading(false)
  }

  const loadBlockchain = async () => {
    setLoading(true)
    try {
      const client = createPublicClient({ chain: activeChain, transport: http(RPC_URL) })
      const ids = await client.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, abi: CONTRACT_ABI, functionName: 'getAllBatchIds' }) as string[]

      const results = await Promise.all(ids.map(async (id) => {
        const [core, metrics] = await Promise.all([
          client.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, abi: CONTRACT_ABI, functionName: 'getBatchCore', args: [id] }),
          client.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, abi: CONTRACT_ABI, functionName: 'getBatchMetrics', args: [id] }),
        ]) as [any, any]
        const quality = await client.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, abi: CONTRACT_ABI, functionName: 'getQualityStatus', args: [id] }) as string
        const offchainMatch = offchain.find(b => b.batchId === id)
        return {
          batchId: id,
          farmerName: core[1],
          origin: core[2],
          coffeeType: core[3],
          pdfHash: core[4],
          humidity: (Number(metrics[0]) / 10).toFixed(1),
          hmf: (Number(metrics[1]) / 10).toFixed(1),
          colour: Number(metrics[2]),
          harvestYear: Number(metrics[3]),
          qualityStatus: quality,
          onChain: true,
          approvalStatus: offchainMatch?.approvalStatus || 'pending',
        }
      }))
      setBatches(results)
      setSource('blockchain')
    } catch (e) {
      console.error('Blockchain read failed:', e)
      alert('Could not connect to blockchain. Showing off-chain data instead.')
      setBatches(offchain)
      setSource('offchain')
    }
    setLoading(false)
  }

  const filtered = batches
    .filter(b => qualityFilter === 'all' || b.qualityStatus?.toLowerCase().includes(qualityFilter.toLowerCase()))
    .filter(b => approvalFilter === 'all' || b.approvalStatus === approvalFilter)
    .filter(b => !search || b.batchId?.toLowerCase().includes(search.toLowerCase()) || b.farmerName?.toLowerCase().includes(search.toLowerCase()))

  const qualityPill = (s: string) => {
    const n = (s || '').toLowerCase()
    if (n === 'passed')  return <span className="pill pill-green">Pass</span>
    if (n === 'caution') return <span className="pill pill-amber">Caution</span>
    if (n === 'failed')  return <span className="pill pill-red">Fail</span>
    return <span className="pill" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>No data</span>
  }

  const approvalPill = (s: string) => {
    if (s === 'approved') return <span className="pill pill-green">Verified</span>
    if (s === 'rejected') return <span className="pill pill-red">Rejected</span>
    return <span className="pill pill-amber">Pending</span>
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">All batches</div>
          <div className="page-sub">
            Source: <strong>{source === 'blockchain' ? ' Blockchain (Hardhat)' : ' Off-chain JSON'}</strong>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${source === 'offchain' ? 'btn-primary' : ''}`} onClick={loadOffchain}>Off-chain</button>
          <button className={`btn btn-sm ${source === 'blockchain' ? 'btn-primary' : ''}`} onClick={loadBlockchain}> Blockchain</button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-label">Total</div><div className="stat-val">{batches.length}</div></div>
        <div className="stat-card"><div className="stat-label">Verified</div><div className="stat-val" style={{ color: 'var(--green)' }}>{batches.filter(b => b.approvalStatus === 'approved').length}</div></div>
        <div className="stat-card"><div className="stat-label">Pass quality</div><div className="stat-val" style={{ color: 'var(--green)' }}>{batches.filter(b => b.qualityStatus === 'Passed').length}</div></div>
        <div className="stat-card"><div className="stat-label">Fail quality</div><div className="stat-val" style={{ color: 'var(--red)' }}>{batches.filter(b => b.qualityStatus === 'Failed').length}</div></div>
      </div>

      <div className="card">
        <div className="toolbar">
          <input className="search-input" placeholder="Search batch ID or farmer…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="filter-select" value={approvalFilter} onChange={e => setApprovalFilter(e.target.value)}>
            <option value="all">All approvals</option>
            <option value="approved">Verified</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          <select className="filter-select" value={qualityFilter} onChange={e => setQualityFilter(e.target.value)}>
            <option value="all">All quality</option>
            <option value="Passed">Pass</option>
            <option value="Caution">Caution</option>
            <option value="Failed">Fail</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>Loading{source === 'blockchain' ? ' blockchain data' : ''}…</div>
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
                  <th>Approval</th>
                  <th>Verify</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No batches found.</td></tr>
                ) : filtered.map(b => (
                  <tr key={b.batchId}>
                    <td><span className="mono">{b.batchId}</span></td>
                    <td>{b.farmerName || '—'}</td>
                    <td>{b.coffeeType || b.type || '—'}</td>
                    <td>{b.origin || '—'}</td>
                    <td style={{ color: parseFloat(b.humidity) > 20 ? 'var(--red)' : parseFloat(b.humidity) > 18.6 ? 'var(--amber)' : 'inherit' }}>
                      {b.humidity}%
                    </td>
                    <td style={{ color: parseFloat(b.hmf) > 40 ? 'var(--red)' : parseFloat(b.hmf) > 30 ? 'var(--amber)' : 'inherit' }}>
                      {b.hmf} mg/kg
                    </td>
                    <td>{qualityPill(b.qualityStatus)}</td>
                    <td>{approvalPill(b.approvalStatus)}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <Link href={`/verify/${b.batchId}`} className="btn btn-sm" style={{ textDecoration: 'none' }} target="_blank">
                        QR ↗
                      </Link>
                      <button className="btn btn-sm" onClick={() => openEdit(b)}>
                        Edit
                      </button>
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
