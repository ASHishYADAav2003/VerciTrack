'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ParamStats {
  key: string; label: string; unit: string; n: number;
  mean: number; std: number; min: number; max: number; p25: number; p75: number;
}
interface Correlation {
  paramA: string; paramB: string; r: number; n: number;
  strength: string; direction: string; interpretation: string;
}
interface AnomalyFlag { type: string; severity: string; description: string; params?: string[] }
interface BatchAnalysis {
  batchId: string; anomalyScore: number;
  zScores: Record<string, number>; flags: AnomalyFlag[]; populationN: number;
}
interface TypeValidation {
  batchId: string; declaredType: string;
  status: 'match' | 'mismatch' | 'uncertain' | 'no_data';
  confidence: number; conflicts: string[]; note: string;
}
interface RFModel {
  mode: 'rf' | 'rule-based'; sampleCount: number; r2: number | null;
  trainedAt: string | null; samplesNeeded: number;
  featureImportance: Record<string, number> | null;
}
interface SegmentStandout {
  param: string; label: string; unit: string;
  segVal: number; popVal: number; diffPct: number; better: boolean;
}
interface SegmentEntry {
  label: string; count: number; avgScore: number;
  paramAvgs: Record<string, number>;
  standouts: SegmentStandout[];
  batchIds: string[];
}
interface SegmentGroup {
  dimension: string; dimensionLabel: string;
  entries: SegmentEntry[]; topInsight: string;
}
interface SimilarBatch {
  batchId: string; similarity: number; sharedParams: number;
  closestParams: string[]; origin?: string; coffeeType?: string;
}
interface SimilarityResult {
  batchId: string; similar: SimilarBatch[];
}
interface AltitudeBand {
  label: string; min: number; max: number; count: number;
  paramAvgs: Record<string, number>; batchIds: string[];
}
interface ParamAltitudeCorr {
  param: string; label: string; unit: string;
  r: number; n: number; direction: string; interpretation: string;
}
interface ZoneSummary {
  zone: string; count: number; avgAltitude: number | null;
  paramAvgs: Record<string, number>;
}
interface GeoProfile {
  altitudeBands: AltitudeBand[];
  altitudeCorrelations: ParamAltitudeCorr[];
  zoneSummary: ZoneSummary[];
  altitudeRange: { min: number; max: number; n: number } | null;
  keyFindings: string[];
}
interface BatchPrediction {
  batchId:      string;
  coffeeType:    string | null;
  origin:       string | null;
  mlScore:      number | null;
  confidence:   'high' | 'medium' | 'low' | null;
  ruleScore:    number | null;
  qualityTier:  string | null;
  anomalyScore: number | null;
}
interface AnalyticsData {
  populationStats: ParamStats[];
  correlations: Correlation[];
  batchAnalyses: BatchAnalysis[];
  typeValidation: TypeValidation[];
  rfModel: RFModel;
  segments: SegmentGroup[];
  similarities: SimilarityResult[];
  geoProfile: GeoProfile;
  batchPredictions: BatchPrediction[];
  recordCount: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const EU_LIMITS: Record<string, { min?: number; max?: number; warnMin?: number; warnMax?: number; label: string }> = {
  hmf:             { max: 40,  warnMax: 30,  label: '≤40 mg/kg' },
  water:           { max: 20,  warnMax: 18.6, label: '≤20%' },
  diastase:        { min: 8,   warnMin: 11,  label: '≥8 DN' },
  freeAcidity:     { max: 50,  warnMax: 40,  label: '≤50 meq/kg' },
  proline:         { min: 300, warnMin: 400, label: '≥300 mg/kg' },
  fructoseGlucose: { min: 60,  warnMin: 65,  label: '≥60%' },
  sucrose:         { max: 5,   warnMax: 3,   label: '≤5%' },
  reducingSugars:  { min: 60,  warnMin: 65,  label: '≥60%' },
}
const PARAM_LABELS: Record<string, string> = {
  humidity: 'Moisture', hmf: 'HMF', water: 'Water', diastase: 'Diastase', freeAcidity: 'Free acidity',
  proline: 'Proline', conductivity: 'Conductivity', fructoseGlucose: 'F+G',
  reducingSugars: 'Reducing sugars', sucrose: 'Sucrose', ash: 'Ash',
  isotopicDiff: 'δ¹³C diff', colour: 'Colour', ph: 'pH',
  invertase: 'Invertase', fgRatio: 'F/G ratio', waterActivity: 'Water activity',
  opticalRotation: 'Optical rot.', totalPolyphenols: 'Polyphenols', hdeEncoded: 'HDE',
  maltose: 'Maltose', viscosity: 'Viscosity', yeastCount: 'Yeast', totalPlateCount: 'Plate count',
  leadPb: 'Lead (Pb)', cadmiumCd: 'Cadmium (Cd)', pesticideScreen: 'Pesticides',
  antibioticScreen: 'Antibiotics', altitude: 'Altitude', harvestMonth: 'Harvest month',
  fructose: 'Fructose', glucose: 'Glucose', dpph: 'DPPH', totalSugars: 'Total sugars',
}
const ANOMALY_COLOR = (s: number) => s >= 40 ? '#DC2626' : s >= 20 ? '#D97706' : '#16A34A'
const SEVERITY_COLOR: Record<string, string> = { high: '#DC2626', medium: '#D97706', low: '#6B7280' }

// ── Helpers ───────────────────────────────────────────────────────────────────
function euStatus(key: string, mean: number): 'pass' | 'warn' | 'fail' | 'none' {
  const lim = EU_LIMITS[key]
  if (!lim) return 'none'
  if (lim.max !== undefined && mean > lim.max) return 'fail'
  if (lim.min !== undefined && mean < lim.min) return 'fail'
  if (lim.warnMax !== undefined && mean > lim.warnMax) return 'warn'
  if (lim.warnMin !== undefined && mean < lim.warnMin) return 'warn'
  return 'pass'
}
function reliabilityBadge(n: number) {
  if (n < 5)  return { label: 'Low confidence', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', tip: `Only ${n} shared batches — r values with n<5 are likely coincidental` }
  if (n < 15) return { label: 'Moderate', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', tip: `${n} batches — directionally useful but not yet robust` }
  return       { label: 'Reliable', color: '#166534', bg: '#F0FDF4', border: '#BBF7D0', tip: `${n} batches — statistically meaningful` }
}
function rColor(r: number) {
  const abs = Math.abs(r)
  if (abs >= 0.7) return r > 0 ? '#166534' : '#7C3AED'
  if (abs >= 0.4) return r > 0 ? '#92400E' : '#5B21B6'
  return '#9CA3AF'
}

// Status pill colour
function statusStyle(s: TypeValidation['status']) {
  if (s === 'match')     return { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0', label: 'Match' }
  if (s === 'mismatch')  return { bg: '#FFF1F2', color: '#DC2626', border: '#FECACA', label: 'Mismatch' }
  if (s === 'uncertain') return { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', label: 'Uncertain' }
  return                        { bg: '#F9FAFB', color: '#6B7280', border: 'var(--border)', label: '— No data' }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LabAnalyticsPage() {
  const [data, setData]             = useState<AnalyticsData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<'models' | 'segments' | 'overview' | 'correlations' | 'anomalies' | 'similarity' | 'terrain' | 'predictions'>('models')
  const [segDimension, setSegDimension] = useState<string | null>(null)
  const [showAllCorr, setShowAllCorr] = useState(false)
  const [corrView, setCorrView]     = useState<'table' | 'heatmap'>('table')
  const [simBatch, setSimBatch]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/lab-analytics')
      if (res.ok) setData(await res.json())
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const MIN_POPULATION = 3

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>Loading analytics…</div>
  if (!data)   return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>Could not load analytics.</div>

  const adulterationAlerts = data.batchAnalyses.filter(b => b.flags.some(f => f.type === 'adulteration_signature'))
  const typeIssues         = data.typeValidation.filter(t => t.status === 'mismatch')
  const anomalyCount       = data.batchAnalyses.filter(b => b.anomalyScore >= 20).length

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Lab Analytics</div>
        <div className="page-sub">
          Statistical and ML analysis of accumulated lab results. Each model improves as more batches are registered.
        </div>
      </div>

      {/* Dataset meter */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
            Dataset: {data.recordCount} batch{data.recordCount !== 1 ? 'es' : ''} registered
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            {data.recordCount < 5  ? `Register ${5 - data.recordCount} more to activate Random Forest.`
            : data.recordCount < 15 ? 'RF active. Target 15+ batches for reliable correlations.'
            : 'Good dataset. All models are strengthening.'}
          </div>
          <div style={{ background: 'var(--border)', borderRadius: 99, height: 4, overflow: 'hidden', maxWidth: 260 }}>
            <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(100, (data.recordCount / 15) * 100)}%`, background: data.recordCount >= 15 ? '#16A34A' : 'var(--accent)', transition: 'width 0.4s' }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{data.recordCount}/15 batches for reliable statistics</div>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
          {[
            { val: data.recordCount,                                    label: 'Batches',   color: 'var(--accent)' },
            { val: data.populationStats.length,                         label: 'Params',    color: '#166534' },
            { val: adulterationAlerts.length,                           label: 'Fraud flags', color: '#DC2626' },
            { val: typeIssues.length,                                   label: 'Type issues', color: '#D97706' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 22, color: s.color }}>{s.val}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {([
          ['models',       'ML Models'],
          ['segments',     'Segments'],
          ['overview',     'Parameter Stats'],
          ['correlations', 'Correlations'],
          ['anomalies',    'Anomaly Alerts'],
          ['similarity',   'Similarity Search'],
          ['terrain',      'Terrain & Geo'],
          ['predictions',  'Predictions'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '8px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === key ? 600 : 400,
            color: tab === key ? 'var(--text)' : 'var(--text-muted)',
            borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1,
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── ML Models tab ─────────────────────────────────────────── */}
      {tab === 'models' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* System health summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              {
                label: 'Quality Scorer', icon: '',
                status: data.rfModel.mode === 'rf' ? 'Active' : 'Warming up',
                color: data.rfModel.mode === 'rf' ? '#16A34A' : '#D97706',
                bg: data.rfModel.mode === 'rf' ? '#F0FDF4' : '#FFFBEB',
                detail: data.rfModel.mode === 'rf' ? `R² ${data.rfModel.r2?.toFixed(2)}` : `${data.rfModel.samplesNeeded} more needed`,
              },
              {
                label: 'Adulteration', icon: '',
                status: adulterationAlerts.length > 0 ? `${adulterationAlerts.length} flagged` : 'All clear',
                color: adulterationAlerts.length > 0 ? '#DC2626' : '#16A34A',
                bg: adulterationAlerts.length > 0 ? '#FFF1F2' : '#F0FDF4',
                detail: `${data.recordCount} analysed`,
              },
              {
                label: 'Type Validator', icon: '',
                status: typeIssues.length > 0 ? `${typeIssues.length} mismatch` : 'All match',
                color: typeIssues.length > 0 ? '#D97706' : '#16A34A',
                bg: typeIssues.length > 0 ? '#FFFBEB' : '#F0FDF4',
                detail: `${data.typeValidation.length} validated`,
              },
              {
                label: 'Anomaly Detector', icon: '',
                status: anomalyCount > 0 ? `${anomalyCount} above threshold` : 'All normal',
                color: anomalyCount > 0 ? '#D97706' : '#16A34A',
                bg: anomalyCount > 0 ? '#FFFBEB' : '#F0FDF4',
                detail: `${data.batchAnalyses.length} scored`,
              },
            ].map(m => (
              <div key={m.label} style={{ background: m.bg, border: `1px solid ${m.color}40`, borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{m.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{m.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.status}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.detail}</div>
              </div>
            ))}
          </div>

          {/* 1. RF Quality Scorer */}
          <div className="card" style={{ borderLeft: `4px solid ${data.rfModel.mode === 'rf' ? '#16A34A' : 'var(--accent)'}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>Random Forest — Quality Scorer</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 480 }}>
                  Trained on EU compliance rules (Exceptional / Premium / Very Good / Non-Compliant) applied to lab parameters. As batches accumulate the RF learns which parameter combinations predict quality tiers — no human tasting needed. Papers show RF achieves 92%+ accuracy on food-grade classification from tabular chemical data.
                </div>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '4px 14px', borderRadius: 99,
                background: data.rfModel.mode === 'rf' ? '#F0FDF4' : '#FFFBEB',
                color:      data.rfModel.mode === 'rf' ? '#166534' : '#92400E',
                border:     `1px solid ${data.rfModel.mode === 'rf' ? '#BBF7D0' : '#FDE68A'}`,
                whiteSpace: 'nowrap',
              }}>
                {data.rfModel.mode === 'rf' ? '● Active' : '○ Warming up'}
              </span>
            </div>

            {/* Stat grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
              {[
                { label: 'Batches trained', val: data.rfModel.sampleCount, color: 'var(--accent)' },
                { label: 'R² accuracy', val: data.rfModel.r2 != null ? data.rfModel.r2.toFixed(3) : '—', color: data.rfModel.r2 != null && data.rfModel.r2 >= 0.6 ? '#16A34A' : '#D97706' },
                { label: 'Status', val: data.rfModel.samplesNeeded > 0 ? `+${data.rfModel.samplesNeeded} needed` : 'Ready', color: data.rfModel.samplesNeeded > 0 ? '#D97706' : '#16A34A' },
                { label: 'Last trained', val: data.rfModel.trainedAt ? new Date(data.rfModel.trainedAt).toLocaleDateString() : '—', color: 'var(--text)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '10px 12px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1.2, marginBottom: 3 }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* R² gauge */}
            {data.rfModel.r2 != null && (
              <div style={{ marginBottom: 18, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model Accuracy (R²)</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: data.rfModel.r2 >= 0.6 ? '#16A34A' : '#D97706' }}>{(data.rfModel.r2 * 100).toFixed(0)}% variance explained</div>
                </div>
                <div style={{ position: 'relative', background: 'var(--border)', borderRadius: 99, height: 12, marginBottom: 6 }}>
                  <div style={{ position: 'absolute', left: '40%', top: -3, bottom: -3, width: 1, background: '#D97706', opacity: 0.6 }} />
                  <div style={{ position: 'absolute', left: '70%', top: -3, bottom: -3, width: 1, background: '#16A34A', opacity: 0.6 }} />
                  <div style={{ height: '100%', borderRadius: 99, width: `${data.rfModel.r2 * 100}%`,
                    background: data.rfModel.r2 >= 0.7 ? '#16A34A' : data.rfModel.r2 >= 0.4 ? '#D97706' : '#DC2626',
                    transition: 'width 0.5s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
                  <span>Poor (&lt;0.4)</span><span style={{ color: '#D97706' }}>Fair (0.4–0.7)</span><span style={{ color: '#16A34A' }}>Good (&gt;0.7)</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  The model explains <strong style={{ color: 'var(--text)' }}>{(data.rfModel.r2 * 100).toFixed(0)}% of quality score variation</strong> across {data.rfModel.sampleCount} training batches.{data.rfModel.r2 >= 0.6 ? ' Strong predictive power — results are meaningful.' : ' Will improve reliably as more batches are registered.'}
                </div>
              </div>
            )}


            {data.rfModel.mode !== 'rf' && (
              <div style={{ marginTop: 10, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: '#92400E' }}>
                Register {data.rfModel.samplesNeeded} more batch{data.rfModel.samplesNeeded !== 1 ? 'es' : ''} on-chain to activate RF. Currently using EU rule-based scoring. Training is fully automatic — no human input needed.
              </div>
            )}
          </div>

          {/* 2. Adulteration Detector */}
          <div className="card" style={{ borderLeft: `4px solid ${adulterationAlerts.length > 0 ? '#DC2626' : '#16A34A'}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>Adulteration Detector</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 480 }}>
                  Rule-based classifier trained on published EU fraud thresholds. Uses δ¹³C isotopic difference (C4 sugars), sucrose % (syrup addition), proline (dilution), fructose+glucose ratio, and conductivity mismatch. Papers show SVM-based adulteration detectors achieve 90–100% accuracy; our approach encodes the same features and decision boundaries.
                </div>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '4px 14px', borderRadius: 99,
                background: adulterationAlerts.length > 0 ? '#FFF1F2' : '#F0FDF4',
                color:      adulterationAlerts.length > 0 ? '#DC2626' : '#166534',
                border:     `1px solid ${adulterationAlerts.length > 0 ? '#FECACA' : '#BBF7D0'}`,
                whiteSpace: 'nowrap',
              }}>
                {adulterationAlerts.length > 0 ? ` flagged` : '● Active — all clear'}
              </span>
            </div>

            {/* Donut + stats row */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              {data.recordCount > 0 && (() => {
                const r = 30, cx = 38, cy = 38
                const circumference = 2 * Math.PI * r
                const cleanPct = (data.recordCount - adulterationAlerts.length) / data.recordCount
                const cleanDash = circumference * cleanPct
                return (
                  <svg width={76} height={76} style={{ flexShrink: 0 }}>
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#FECACA" strokeWidth={10} />
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#16A34A" strokeWidth={10}
                      strokeDasharray={`${cleanDash} ${circumference - cleanDash}`}
                      strokeDashoffset={circumference * 0.25}
                      style={{ transition: 'stroke-dasharray 0.5s' }} />
                    <text x={cx} y={cy - 2} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--text)">{Math.round(cleanPct * 100)}%</text>
                    <text x={cx} y={cy + 11} textAnchor="middle" fontSize={9} fill="#6B7280">clean</text>
                  </svg>
                )
              })()}
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {[
                  { label: 'Batches analysed', val: data.recordCount },
                  { label: 'Clean', val: data.recordCount - adulterationAlerts.length, color: '#166534' },
                  { label: 'Flagged', val: adulterationAlerts.length, color: adulterationAlerts.length > 0 ? '#DC2626' : '#166534' },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: (s as any).color ?? 'var(--text)' }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Checks grid */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Fraud checks run per batch</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                { label: 'C4 sugar signature', detail: 'δ¹³C > 1‰ from beeswax' },
                { label: 'Sucrose syrup addition', detail: 'sucrose > 5%' },
                { label: 'Proline dilution', detail: '< 300 mg/kg signals added water' },
                { label: 'F+G ratio low', detail: 'fructose+glucose < 60%' },
                { label: 'Conductivity mismatch', detail: 'inconsistent with declared type' },
              ].map(check => (
                <div key={check.label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
                  <span style={{ color: '#16A34A', fontWeight: 700, fontSize: 14, lineHeight: 1.2, flexShrink: 0 }}>v</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500 }}>{check.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{check.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            {adulterationAlerts.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {adulterationAlerts.map(b => (
                  <div key={b.batchId} style={{ background: '#FFF8F0', border: '1px solid #FECACA', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      <span className="mono">{b.batchId}</span>
                    </div>
                    {b.flags.filter(f => f.type === 'adulteration_signature').map((f, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#DC2626', marginBottom: 2 }}>{f.description}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Coffee Type Validator (KNN) */}
          <div className="card" style={{ borderLeft: `4px solid ${typeIssues.length > 0 ? '#D97706' : '#16A34A'}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>Coffee Type Validator</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 480 }}>
                  KNN-inspired rule profiles. Checks if the declared coffee type (e.g. "Acacia") is consistent with measured conductivity, colour, proline, and free acidity. If a farmer declares "Acacia" but parameters match Chestnut, the system flags a mismatch before it reaches admin review. Papers show KNN achieves high accuracy for coffee type classification from these parameters.
                </div>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '4px 14px', borderRadius: 99,
                background: typeIssues.length > 0 ? '#FFFBEB' : '#F0FDF4',
                color:      typeIssues.length > 0 ? '#92400E' : '#166534',
                border:     `1px solid ${typeIssues.length > 0 ? '#FDE68A' : '#BBF7D0'}`,
                whiteSpace: 'nowrap',
              }}>
                {typeIssues.length > 0 ? ` mismatch${typeIssues.length !== 1 ? 'es' : ''}` : '● Active — all match'}
              </span>
            </div>

            {data.typeValidation.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No batches to validate yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.typeValidation.map(t => {
                  const s = statusStyle(t.status)
                  return (
                    <div key={t.batchId} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{t.batchId}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>declared: {t.declaredType}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{t.note}</div>
                        {/* Confidence bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, background: 'var(--border)', borderRadius: 99, height: 5, overflow: 'hidden', maxWidth: 200 }}>
                            <div style={{ height: '100%', borderRadius: 99, width: `${t.confidence}%`,
                              background: t.confidence >= 70 ? '#16A34A' : t.confidence >= 40 ? '#D97706' : '#DC2626',
                              transition: 'width 0.4s' }} />
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t.confidence}% match</span>
                        </div>
                        {t.conflicts.length > 0 && (
                          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {t.conflicts.map((c, i) => (
                              <div key={i} style={{ fontSize: 10, color: '#D97706' }}>↳ {c}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 4. Anomaly Detector */}
          <div className="card" style={{ borderLeft: `4px solid ${anomalyCount > 0 ? '#D97706' : '#16A34A'}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>Anomaly Detector (z-score / Isolation Forest)</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 480 }}>
                  Unsupervised outlier detection. Each parameter is z-scored against the population baseline (|z|&gt;2 = unusual, |z|&gt;3 = very unusual). Batches with multiple high z-scores or known adulteration patterns get a composite anomaly score 0–100. Equivalent to Isolation Forest on a small dataset — no labels needed.
                </div>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '4px 14px', borderRadius: 99,
                background: anomalyCount > 0 ? '#FFFBEB' : '#F0FDF4',
                color:      anomalyCount > 0 ? '#92400E' : '#166534',
                border:     `1px solid ${anomalyCount > 0 ? '#FDE68A' : '#BBF7D0'}`,
                whiteSpace: 'nowrap',
              }}>
                {data.recordCount < MIN_POPULATION ? 'Needs 3+ batches' : anomalyCount > 0 ? ` above threshold` : '● Active — all normal'}
              </span>
            </div>

            {/* Score distribution cards */}
            {data.batchAnalyses.length > 0 && (() => {
              const ranges = [
                { label: 'Normal', range: '0–19', count: data.batchAnalyses.filter(b => b.anomalyScore < 20).length, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
                { label: 'Review', range: '20–39', count: data.batchAnalyses.filter(b => b.anomalyScore >= 20 && b.anomalyScore < 40).length, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
                { label: 'Investigate', range: '40+', count: data.batchAnalyses.filter(b => b.anomalyScore >= 40).length, color: '#DC2626', bg: '#FFF1F2', border: '#FECACA' },
              ]
              const maxC = Math.max(...ranges.map(r => r.count), 1)
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  {ranges.map(r => (
                    <div key={r.label} style={{ background: r.bg, border: `1px solid ${r.border}`, borderRadius: 'var(--radius)', padding: '14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 30, fontWeight: 700, color: r.color, lineHeight: 1 }}>{r.count}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: r.color, marginTop: 3 }}>{r.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>score {r.range}</div>
                      <div style={{ background: `${r.color}20`, borderRadius: 99, height: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: r.color, width: `${(r.count / maxC) * 100}%`, borderRadius: 99, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {data.batchAnalyses.filter(b => b.anomalyScore >= 20).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Batches requiring review</div>
                {data.batchAnalyses.filter(b => b.anomalyScore >= 20).map(b => (
                  <div key={b.batchId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: `1px solid ${ANOMALY_COLOR(b.anomalyScore)}30` }}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: `${ANOMALY_COLOR(b.anomalyScore)}15`, border: `2px solid ${ANOMALY_COLOR(b.anomalyScore)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: ANOMALY_COLOR(b.anomalyScore) }}>{b.anomalyScore}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{b.batchId}</span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {b.flags.length > 0 ? b.flags[0].description : 'Unusual parameter profile vs population baseline'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.recordCount < MIN_POPULATION && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Register {MIN_POPULATION - data.recordCount} more batches to build a population baseline for anomaly scoring.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Segments tab ─────────────────────────────────────────── */}
      {tab === 'segments' && (() => {
        const groups = data.segments ?? []
        const activeGroup = groups.find(g => g.dimension === (segDimension ?? groups[0]?.dimension))
          ?? groups[0] ?? null

        if (groups.length === 0) return (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
            Register batches from at least 2 different coffee types or origins to see segment comparisons.
          </div>
        )

        const maxScore = Math.max(...(activeGroup?.entries.map(e => e.avgScore) ?? [100]))

        return (
          <div>
            <div className="card" style={{ marginBottom: 12, padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
              Segments answer the question correlations cannot: <strong>which origin, type, or zone actually produces better coffee in your data?</strong> These patterns are specific to your batches — not from any textbook. Tag batches with <em>Zone</em> (Mountain/Valley) in the register form to unlock terrain comparisons.
            </div>

            {/* Dimension selector */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {groups.map(g => (
                <button key={g.dimension} onClick={() => setSegDimension(g.dimension)} style={{
                  padding: '5px 14px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
                  fontWeight: activeGroup?.dimension === g.dimension ? 600 : 400,
                  background: activeGroup?.dimension === g.dimension ? 'var(--accent)' : 'var(--surface)',
                  color:      activeGroup?.dimension === g.dimension ? '#fff' : 'var(--text-muted)',
                  border:     `1px solid ${activeGroup?.dimension === g.dimension ? 'var(--accent)' : 'var(--border)'}`,
                }}>
                  {g.dimensionLabel} ({g.entries.length})
                </button>
              ))}
            </div>

            {activeGroup && (
              <>
                {/* Key insight banner */}
                <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#0369A1' }}>
                  {activeGroup.topInsight}
                </div>

                {/* Ranked bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {activeGroup.entries.map((entry, idx) => {
                    const barW = maxScore > 0 ? (entry.avgScore / maxScore) * 100 : 0
                    const scoreColor = entry.avgScore >= 75 ? '#16A34A' : entry.avgScore >= 55 ? '#D97706' : '#DC2626'
                    return (
                      <div key={entry.label} className="card" style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          {/* Rank */}
                          <div style={{ fontSize: 11, fontWeight: 700, color: idx === 0 ? '#16A34A' : 'var(--text-muted)', width: 18, textAlign: 'center' }}>
                            #{idx + 1}
                          </div>
                          {/* Label + count */}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{entry.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.count} batch{entry.count !== 1 ? 'es' : ''}</div>
                          </div>
                          {/* Score */}
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{entry.avgScore}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>avg score</div>
                          </div>
                        </div>
                        {/* Score bar */}
                        <div style={{ background: 'var(--border)', borderRadius: 99, height: 6, overflow: 'hidden', marginBottom: entry.standouts.length ? 10 : 0 }}>
                          <div style={{ height: '100%', borderRadius: 99, width: `${barW}%`, background: scoreColor, transition: 'width 0.4s' }} />
                        </div>
                        {/* Standouts */}
                        {entry.standouts.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                            {entry.standouts.map(s => (
                              <span key={s.param} title={`Population avg: ${s.popVal} ${s.unit}`} style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 6, cursor: 'help',
                                background: s.better ? '#F0FDF4' : '#FFF8F0',
                                color:      s.better ? '#166534' : '#92400E',
                                border:     `1px solid ${s.better ? '#BBF7D0' : '#FDE68A'}`,
                              }}>
                                {s.label}: {s.segVal.toFixed(s.segVal < 10 ? 2 : 0)} {s.unit}
                                {' '}{s.better ? '▲' : '▼'} {Math.abs(s.diffPct).toFixed(0)}% vs avg
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* What this means box */}
                <div className="card" style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text)' }}>How to read this:</strong> Scores are the EU rule-based quality score (0–100) averaged across all batches in that group. Badges show which parameters differ most from the overall population average — green = better than average, amber = worse. As you register more batches, these patterns become statistically reliable. The system is learning what makes <em>Kosovo coffee</em> better or worse, not what EU tables say.
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* ── Parameter Stats tab ──────────────────────────────────── */}
      {tab === 'overview' && (
        <div>
          <div className="card" style={{ marginBottom: 12, padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
            Population statistics across all registered batches. <strong>CV</strong> = coefficient of variation (std/mean): under 10% = very consistent, 10–30% = normal, over 30% = high variability. <strong>EU Status</strong> shows whether the average is within EU Directive 2001/110/EC limits.
          </div>
          {data.populationStats.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>Register at least 2 batches with overlapping parameters.</div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th style={{ textAlign: 'right' }}>n</th>
                      <th style={{ textAlign: 'right' }}>Mean</th>
                      <th style={{ textAlign: 'right' }}>Std Dev</th>
                      <th style={{ textAlign: 'right' }}>CV</th>
                      <th style={{ textAlign: 'right' }}>Min – Max</th>
                      <th style={{ textAlign: 'right' }}>IQR (25–75%)</th>
                      <th style={{ textAlign: 'center' }}>EU Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.populationStats.map(s => {
                      const cv = s.mean !== 0 ? (s.std / s.mean) * 100 : 0
                      const eu = euStatus(s.key, s.mean)
                      const lim = EU_LIMITS[s.key]
                      return (
                        <tr key={s.key}>
                          <td>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{s.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.unit}</div>
                          </td>
                          <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{s.n}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{s.mean.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>±{s.std.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontSize: 12 }}>
                            <span style={{ color: cv > 30 ? '#D97706' : cv > 10 ? 'var(--text)' : '#166534', fontWeight: cv > 30 ? 600 : 400 }}>{cv.toFixed(0)}%</span>
                          </td>
                          <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{s.min.toFixed(2)} – {s.max.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontSize: 12 }}>
                            <span style={{ color: '#166534' }}>{s.p25.toFixed(2)}</span>
                            <span style={{ color: 'var(--text-muted)' }}> – </span>
                            <span style={{ color: '#166534' }}>{s.p75.toFixed(2)}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {eu === 'none' ? <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span> : (
                              <div>
                                <span style={{
                                  fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500,
                                  background: eu === 'pass' ? '#F0FDF4' : eu === 'warn' ? '#FFFBEB' : '#FFF1F2',
                                  color:      eu === 'pass' ? '#166534' : eu === 'warn' ? '#92400E' : '#DC2626',
                                }}>
                                  {eu === 'pass' ? 'Pass' : eu === 'warn' ? 'Near limit' : 'Exceeds'}
                                </span>
                                {lim && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{lim.label}</div>}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Correlations tab ─────────────────────────────────────── */}
      {tab === 'correlations' && (
        <div>
          {data.recordCount < MIN_POPULATION ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
              Register at least {MIN_POPULATION} batches to compute correlations.
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: 12, padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                <div style={{ marginBottom: 8 }}>
                  <strong>What is r?</strong> Pearson r ranges from −1 to +1. r=+1 means both parameters always rise together. r=−1 means one rises as the other falls. Strong correlations reveal natural biochemical laws — breaks in expected correlations can signal adulteration.
                </div>
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '8px 12px', marginBottom: 8, fontSize: 11, color: '#92400E' }}>
                  Note: <strong>Small dataset:</strong> r=±1.00 with n=3 is almost always coincidental. Treat amber badges as directional hints only — not established relationships.
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[['↑ strong (≥0.7)', '#166534'], ['↑ moderate', '#92400E'], ['weak', '#9CA3AF'], ['↓ moderate', '#5B21B6'], ['↓ strong', '#7C3AED']].map(([l, c]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                      <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                    </div>
                  ))}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button onClick={() => setCorrView(v => v === 'table' ? 'heatmap' : 'table')} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, border: '1px solid var(--border)', background: corrView === 'heatmap' ? 'var(--accent)' : 'transparent', color: corrView === 'heatmap' ? '#fff' : 'var(--text-muted)', cursor: 'pointer' }}>
                      {corrView === 'heatmap' ? 'Table view' : 'Heatmap'}
                    </button>
                    <button onClick={() => setShowAllCorr(v => !v)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, border: '1px solid var(--border)', background: showAllCorr ? 'var(--accent)' : 'transparent', color: showAllCorr ? '#fff' : 'var(--text-muted)', cursor: 'pointer' }}>
                      {showAllCorr ? 'Strong only' : 'Show all'}
                    </button>
                  </div>
                </div>
              </div>
              {corrView === 'heatmap' && (() => {
                // Build a condensed heatmap of top correlated pairs
                const pairs = data.correlations.filter(c => showAllCorr ? c.strength !== 'none' : Math.abs(c.r) >= 0.4)
                const params = Array.from(new Set(pairs.flatMap(c => [c.paramA, c.paramB]))).slice(0, 12)
                const rMap: Record<string, number> = {}
                for (const c of data.correlations) {
                  rMap[`${c.paramA}:${c.paramB}`] = c.r
                  rMap[`${c.paramB}:${c.paramA}`] = c.r
                }
                function heatColor(r: number | undefined): string {
                  if (r === undefined) return '#F9FAFB'
                  if (r === 1) return '#E0F2FE' // diagonal
                  if (r >= 0.7) return '#166534'
                  if (r >= 0.4) return '#65A30D'
                  if (r >= 0.2) return '#A7F3D0'
                  if (r <= -0.7) return '#7C3AED'
                  if (r <= -0.4) return '#A78BFA'
                  if (r <= -0.2) return '#DDD6FE'
                  return '#F3F4F6'
                }
                function heatText(r: number | undefined): string {
                  if (r === undefined) return ''
                  if (Math.abs(r) < 0.2) return ''
                  return r.toFixed(2)
                }
                const cellSize = 44
                return (
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                      Heatmap of {params.length} most-correlated parameters. Green = positive, purple = negative. Click a cell to jump to the table.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${params.length}, ${cellSize}px)`, gap: 2, fontSize: 9, userSelect: 'none' }}>
                      {/* Top labels */}
                      <div />
                      {params.map(p => (
                        <div key={p} style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500, height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
                          <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{PARAM_LABELS[p] ?? p}</span>
                        </div>
                      ))}
                      {/* Rows */}
                      {params.map(pA => (
                        <>
                          <div key={`${pA}-label`} style={{ display: 'flex', alignItems: 'center', fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', paddingRight: 4 }}>{PARAM_LABELS[pA] ?? pA}</div>
                          {params.map(pB => {
                            const r = pA === pB ? 1 : rMap[`${pA}:${pB}`]
                            const bg = heatColor(r)
                            const textCol = r != null && Math.abs(r) >= 0.4 ? '#fff' : 'var(--text-muted)'
                            return (
                              <div key={`${pA}:${pB}`} title={r != null ? `${PARAM_LABELS[pA] ?? pA} × ${PARAM_LABELS[pB] ?? pB}: r=${r?.toFixed(2) ?? '—'}` : '—'}
                                onClick={() => { if (pA !== pB) { setCorrView('table'); setShowAllCorr(true) } }}
                                style={{ width: cellSize, height: cellSize, background: bg, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: textCol, fontWeight: 600, fontSize: 9, cursor: pA !== pB ? 'pointer' : 'default' }}>
                                {pA === pB ? '—' : heatText(r)}
                              </div>
                            )
                          })}
                        </>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, fontSize: 10 }}>
                      {[['#166534','Strong +'], ['#65A30D','Moderate +'], ['#A7F3D0','Weak +'], ['#A78BFA','Moderate −'], ['#7C3AED','Strong −'], ['#F3F4F6','No data']].map(([c, l]) => (
                        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 12, height: 12, background: c, borderRadius: 2 }} />
                          <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
              {corrView === 'table' && <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Parameter A</th><th>Parameter B</th>
                        <th style={{ textAlign: 'center' }}>r</th>
                        <th style={{ textAlign: 'center' }}>Confidence</th>
                        <th>Strength</th><th>What it means</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.correlations
                        .filter(c => showAllCorr ? c.strength !== 'none' : c.strength === 'strong')
                        .map((c, i) => {
                          const rel = reliabilityBadge(c.n)
                          return (
                            <tr key={i} style={{ opacity: c.n < 5 ? 0.85 : 1 }}>
                              <td style={{ fontSize: 12, fontWeight: 500 }}>{PARAM_LABELS[c.paramA] ?? c.paramA}</td>
                              <td style={{ fontSize: 12, fontWeight: 500 }}>{PARAM_LABELS[c.paramB] ?? c.paramB}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, color: rColor(c.r) }}>{c.r.toFixed(2)}</td>
                              <td style={{ textAlign: 'center' }}>
                                <div title={rel.tip} style={{ display: 'inline-block', fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 500, background: rel.bg, color: rel.color, border: `1px solid ${rel.border}`, cursor: 'help' }}>
                                  n={c.n} · {rel.label}
                                </div>
                              </td>
                              <td>
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500,
                                  background: c.strength === 'strong' ? '#F0FDF4' : c.strength === 'moderate' ? '#FFFBEB' : '#F9FAFB',
                                  color:      c.strength === 'strong' ? '#166534' : c.strength === 'moderate' ? '#92400E' : '#6B7280',
                                }}>
                                  {c.direction === 'positive' ? '↑' : '↓'} {c.strength}
                                </span>
                              </td>
                              <td style={{ fontSize: 11, color: c.interpretation ? 'var(--text)' : 'var(--text-muted)', maxWidth: 320, lineHeight: 1.4 }}>
                                {c.interpretation || `As ${PARAM_LABELS[c.paramA] ?? c.paramA} ${c.direction === 'positive' ? 'rises' : 'falls'}, ${PARAM_LABELS[c.paramB] ?? c.paramB} tends to ${c.direction === 'positive' ? 'rise' : 'fall'} too.`}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
                {!showAllCorr && (
                  <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                    Showing strong correlations only. <button onClick={() => setShowAllCorr(true)} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>Show all {data.correlations.filter(c => c.strength !== 'none').length}</button>
                  </div>
                )}
              </div>}
            </>
          )}
        </div>
      )}

      {/* ── Anomaly Alerts tab ───────────────────────────────────── */}
      {tab === 'anomalies' && (
        <div>
          <div className="card" style={{ marginBottom: 12, padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
            Each batch is scored for chemical anomalies: statistical outliers vs the population, and known adulteration signatures. Higher score = more suspicious. This is a flag for further review — not a definitive fraud determination.
            <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[['0–19: Normal', '#16A34A'], ['20–39: Worth reviewing', '#D97706'], ['40+: Investigate', '#DC2626']].map(([l, c]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
          {data.batchAnalyses.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>No batch data yet.</div>
          ) : data.batchAnalyses.map(b => (
            <div key={b.batchId} className="card" style={{ marginBottom: 12, borderLeft: `4px solid ${ANOMALY_COLOR(b.anomalyScore)}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{b.batchId}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>population: {b.populationN} batches</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: ANOMALY_COLOR(b.anomalyScore), lineHeight: 1 }}>{b.anomalyScore}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>score /100</div>
                </div>
              </div>
              {Object.keys(b.zScores).length > 0 && (
                <div style={{ marginBottom: b.flags.length > 0 ? 10 : 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Z-scores (|z|&gt;2 = unusual)</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Object.entries(b.zScores).sort((a, bv) => bv[1] - a[1]).map(([key, z]) => (
                      <span key={key} title={`${PARAM_LABELS[key] ?? key}: ${z.toFixed(2)}σ from mean`} style={{
                        fontSize: 11, padding: '3px 8px', borderRadius: 6, cursor: 'help',
                        background: z > 3 ? '#FEF2F2' : z > 2 ? '#FFFBEB' : '#F9FAFB',
                        color:      z > 3 ? '#DC2626' : z > 2 ? '#D97706' : '#6B7280',
                        border:     `1px solid ${z > 3 ? '#FECACA' : z > 2 ? '#FDE68A' : 'var(--border)'}`,
                      }}>
                        {PARAM_LABELS[key] ?? key}: {z.toFixed(1)}σ
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {b.flags.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {b.flags.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: f.type === 'adulteration_signature' ? '#FFF8F0' : '#FAFAFA', border: `1px solid ${SEVERITY_COLOR[f.severity]}30`, borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                      <span style={{ fontSize: 14, marginTop: 1 }}>{f.type === 'adulteration_signature' ? '!' : '—'}</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: SEVERITY_COLOR[f.severity], marginBottom: 2 }}>
                          {f.type === 'adulteration_signature' ? 'Adulteration signature' : 'Statistical outlier'} — {f.severity}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{f.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#166534' }}>No anomalies detected.</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Similarity Search tab ─────────────────────────────────── */}
      {tab === 'similarity' && (
        <div>
          <div className="card" style={{ marginBottom: 12, padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text)' }}>Chemical similarity search</strong> — for each batch, finds the most similar registered batches by normalised Euclidean distance across all shared lab parameters. Useful for fraud investigation (is this batch chemically consistent with others from the same origin?), sourcing, and quality benchmarking.
            <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[['100%','Identical profile'],['70–99%','Very similar'],['40–69%','Moderately similar'],['&lt;40%','Distinct profile']].map(([pct, desc]) => (
                <div key={desc} style={{ fontSize: 11 }}><strong>{pct}</strong> {desc}</div>
              ))}
            </div>
          </div>

          {(data.similarities ?? []).length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
              Register at least 2 batches to see similarity results.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Batch selector */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '5px 0', alignSelf: 'center' }}>Show batch:</span>
                {data.similarities.map(s => (
                  <button key={s.batchId} onClick={() => setSimBatch(prev => prev === s.batchId ? null : s.batchId)} style={{
                    padding: '4px 10px', borderRadius: 99, fontSize: 11, cursor: 'pointer',
                    fontWeight: simBatch === s.batchId ? 600 : 400,
                    background: simBatch === s.batchId ? 'var(--accent)' : 'var(--surface)',
                    color:      simBatch === s.batchId ? '#fff' : 'var(--text-muted)',
                    border:     `1px solid ${simBatch === s.batchId ? 'var(--accent)' : 'var(--border)'}`,
                  }}>
                    {s.batchId}
                  </button>
                ))}
              </div>

              {/* Similarity cards */}
              {data.similarities
                .filter(s => simBatch == null || s.batchId === simBatch)
                .map(result => (
                  <div key={result.batchId} className="card">
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                      <span className="mono">{result.batchId}</span>
                      <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 10 }}>— top similar batches</span>
                    </div>
                    {result.similar.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No comparable batches yet — needs at least one other batch with shared parameters.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {result.similar.map((sim, idx) => {
                          const simColor = sim.similarity >= 70 ? '#16A34A' : sim.similarity >= 40 ? '#D97706' : '#DC2626'
                          return (
                            <div key={sim.batchId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                              {/* Rank */}
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', width: 20, textAlign: 'center', flexShrink: 0 }}>#{idx+1}</div>
                              {/* Similarity circle */}
                              <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${simColor}12`, border: `2px solid ${simColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: simColor }}>{sim.similarity}%</span>
                              </div>
                              {/* Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                  <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{sim.batchId}</span>
                                  {sim.coffeeType && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sim.coffeeType}</span>}
                                  {sim.origin && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {sim.origin}</span>}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {sim.sharedParams} shared parameters compared
                                </div>
                                {sim.closestParams.length > 0 && (
                                  <div style={{ marginTop: 5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {sim.closestParams.map(p => (
                                      <span key={p} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}>{p}</span>
                                    ))}
                                    <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>most similar</span>
                                  </div>
                                )}
                              </div>
                              {/* Similarity bar */}
                              <div style={{ width: 80, flexShrink: 0 }}>
                                <div style={{ background: 'var(--border)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', background: simColor, width: `${sim.similarity}%`, borderRadius: 99, transition: 'width 0.4s' }} />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── Terrain & Geo tab ──────────────────────────────────────── */}
      {tab === 'terrain' && (() => {
        const geo = data.geoProfile ?? { altitudeBands: [], altitudeCorrelations: [], zoneSummary: [], altitudeRange: null, keyFindings: [] }
        const noData = !geo.altitudeRange && geo.zoneSummary.length === 0

        // Key params to feature in altitude band comparison
        const BAND_PARAMS = [
          { key: 'diastase',         label: 'Diastase',       unit: 'DN',            higherBetter: true  },
          { key: 'hmf',              label: 'HMF',            unit: 'mg/kg',         higherBetter: false },
          { key: 'proline',          label: 'Proline',        unit: 'mg/kg',         higherBetter: true  },
          { key: 'conductivity',     label: 'Conductivity',   unit: 'mS/cm',         higherBetter: null  },
          { key: 'colour',           label: 'Colour',         unit: 'mm Pfund',      higherBetter: null  },
          { key: 'totalPolyphenols', label: 'Polyphenols',    unit: 'mg GAE/100g',   higherBetter: true  },
          { key: 'dpph',             label: 'DPPH Antioxid.', unit: 'mg TE/100g',    higherBetter: true  },
          { key: 'water',            label: 'Water',          unit: '%',             higherBetter: false },
          { key: 'yeastCount',       label: 'Yeast count',    unit: 'log CFU/g',     higherBetter: false },
        ]

        // Population average for delta calculation
        const popAvgs: Record<string, number> = {}
        for (const s of data.populationStats) popAvgs[s.key] = s.mean

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Header */}
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Chemical × Biological × Geographic correlations</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Shows how elevation and zone shape coffee chemistry. Higher altitude → cooler temperatures, different flora, less industrial pressure → measurably different lab profiles. Batches need a <strong>latitude/longitude or altitude</strong> value to appear here.
              </div>
              {geo.keyFindings.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {geo.keyFindings.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                      <span style={{ color: '#16A34A', fontWeight: 700, flexShrink: 0 }}>→</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {noData ? (
              <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No geographic data yet</div>
                <div style={{ fontSize: 12 }}>Add latitude/longitude or altitude when registering batches to unlock terrain analysis.</div>
              </div>
            ) : (
              <>
                {/* ── Altitude band comparison ─────────────────────────── */}
                {geo.altitudeBands.length > 0 && (
                  <div className="card" style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
                      Altitude bands — chemical profile
                    </div>

                    {/* Band headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: `160px repeat(${geo.altitudeBands.length}, 1fr)`, gap: 0, marginBottom: 4 }}>
                      <div />
                      {geo.altitudeBands.map(band => (
                        <div key={band.label} style={{ textAlign: 'center', padding: '6px 4px', background: band.min >= 1000 ? '#F0FDF4' : band.min >= 500 ? '#EFF6FF' : '#FAFAFA', borderRadius: 8, margin: '0 3px' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: band.min >= 1000 ? '#166534' : band.min >= 500 ? '#1D4ED8' : 'var(--text)' }}>
                            {band.label}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{band.count} batch{band.count !== 1 ? 'es' : ''}</div>
                        </div>
                      ))}
                    </div>

                    {/* Param rows */}
                    {BAND_PARAMS.map((p, ri) => {
                      const hasAny = geo.altitudeBands.some(b => b.paramAvgs[p.key] != null)
                      if (!hasAny) return null
                      return (
                        <div key={p.key} style={{ display: 'grid', gridTemplateColumns: `160px repeat(${geo.altitudeBands.length}, 1fr)`, gap: 0, borderTop: ri === 0 ? '1px solid var(--border)' : '1px solid var(--border)', padding: '6px 0' }}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <span style={{ fontWeight: 500, color: 'var(--text)' }}>{p.label}</span>
                            <span style={{ fontSize: 10 }}>{p.unit}</span>
                          </div>
                          {geo.altitudeBands.map(band => {
                            const val = band.paramAvgs[p.key]
                            const pop = popAvgs[p.key]
                            if (val == null) return <div key={band.label} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>—</div>
                            const diffPct = pop && pop !== 0 ? ((val - pop) / Math.abs(pop)) * 100 : 0
                            const isBetter = p.higherBetter === null ? null : p.higherBetter ? diffPct > 0 : diffPct < 0
                            const deltaColor = isBetter === null ? '#6B7280' : isBetter ? '#16A34A' : '#DC2626'
                            const deltaBg   = isBetter === null ? 'transparent' : isBetter ? '#F0FDF4' : '#FFF1F2'
                            return (
                              <div key={band.label} style={{ textAlign: 'center', padding: '4px 6px', margin: '0 3px', borderRadius: 6, background: Math.abs(diffPct) > 15 ? deltaBg : 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{val.toFixed(val < 10 ? 2 : 1)}</span>
                                {Math.abs(diffPct) >= 5 && (
                                  <span style={{ fontSize: 10, color: deltaColor, fontWeight: 600 }}>
                                    {diffPct > 0 ? '+' : ''}{diffPct.toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}

                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                      % delta shown relative to overall population average. Green = better quality; red = lower quality.
                    </div>
                  </div>
                )}

                {/* ── Parameter-altitude correlations ──────────────────── */}
                {geo.altitudeCorrelations.length > 0 && (
                  <div className="card" style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                      What rises (or falls) with altitude? — Pearson r
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                      Based on {geo.altitudeRange?.n ?? 0} batches with altitude data ({geo.altitudeRange?.min}–{geo.altitudeRange?.max} m). r &gt; 0 = higher at altitude; r &lt; 0 = lower at altitude.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {geo.altitudeCorrelations.slice(0, 10).map(c => {
                        const isPos = c.r >= 0
                        const barColor = isPos ? '#16A34A' : '#7C3AED'
                        const barBg    = isPos ? '#F0FDF4' : '#F5F3FF'
                        const barPct   = Math.abs(c.r) * 100
                        return (
                          <div key={c.param} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 42px', gap: 10, alignItems: 'center' }}>
                            {/* Label */}
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 500 }}>{c.label}</div>
                              {c.unit && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.unit}</div>}
                            </div>
                            {/* Bar */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <div style={{ background: 'var(--border)', borderRadius: 99, height: 8, overflow: 'hidden', position: 'relative' }}>
                                <div style={{ position: 'absolute', height: '100%', borderRadius: 99, background: barColor, width: `${barPct}%`, transition: 'width 0.4s' }} />
                              </div>
                              {c.interpretation && (
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>{c.interpretation}</div>
                              )}
                            </div>
                            {/* r value */}
                            <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: barColor, padding: '4px 8px', background: barBg, borderRadius: 6 }}>
                              {c.r > 0 ? '+' : ''}{c.r.toFixed(2)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 14, height: 8, borderRadius: 99, background: '#16A34A' }} /><span>Increases with altitude</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 14, height: 8, borderRadius: 99, background: '#7C3AED' }} /><span>Decreases with altitude</span></div>
                    </div>
                  </div>
                )}

                {/* ── Zone summary ─────────────────────────────────────── */}
                {geo.zoneSummary.length > 0 && (
                  <div className="card" style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                      By zone
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                      {geo.zoneSummary.map(z => {
                        const zoneColor = z.zone === 'Mountain' ? '#166534' : z.zone === 'Valley' ? '#1D4ED8' : z.zone === 'Coastal' ? '#0369A1' : '#6B7280'
                        const zoneBg    = z.zone === 'Mountain' ? '#F0FDF4' : z.zone === 'Valley' ? '#EFF6FF' : z.zone === 'Coastal' ? '#E0F2FE' : '#F9FAFB'
                        // Pick 3 most interesting params this zone has
                        const keyParams = ['diastase', 'totalPolyphenols', 'dpph', 'proline', 'conductivity', 'colour']
                          .filter(k => z.paramAvgs[k] != null)
                          .slice(0, 3)
                        return (
                          <div key={z.zone} style={{ background: zoneBg, border: `1px solid ${zoneColor}30`, borderRadius: 10, padding: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: zoneColor }}>{z.zone}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{z.count} batch{z.count !== 1 ? 'es' : ''}</div>
                            </div>
                            {z.avgAltitude != null && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>avg {z.avgAltitude} m altitude</div>
                            )}
                            {keyParams.map(k => {
                              const meta = { diastase: { l: 'Diastase', u: 'DN' }, totalPolyphenols: { l: 'Polyphenols', u: 'mg GAE' }, dpph: { l: 'DPPH', u: 'mg TE' }, proline: { l: 'Proline', u: 'mg/kg' }, conductivity: { l: 'Conductivity', u: 'mS/cm' }, colour: { l: 'Colour', u: 'mm Pfund' } }[k]
                              return meta ? (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', borderBottom: '1px solid #0001' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>{meta.l}</span>
                                  <span style={{ fontWeight: 600 }}>{(z.paramAvgs[k] as number).toFixed(z.paramAvgs[k] < 10 ? 2 : 1)} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{meta.u}</span></span>
                                </div>
                              ) : null
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* If we have altitude range but no correlations yet */}
                {geo.altitudeRange && geo.altitudeCorrelations.length === 0 && (
                  <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 12 }}>
                    {geo.altitudeRange.n} batch{geo.altitudeRange.n !== 1 ? 'es' : ''} with altitude data (too few for correlation). Register at least 3 batches with altitude to see parameter-elevation correlations.
                  </div>
                )}
              </>
            )}
          </div>
        )
      })()}

      {/* ── Predictions tab ──────────────────────────────────────────── */}
      {tab === 'predictions' && (() => {
        const preds  = (data.batchPredictions ?? []).slice().sort((a, b) => (b.mlScore ?? b.ruleScore ?? 0) - (a.mlScore ?? a.ruleScore ?? 0))
        const hasML  = preds.some(p => p.mlScore != null)
        const tierColor: Record<string, string> = {
          Exceptional: '#065F46', Premium: '#059669', 'Very Good': '#0D9488',
          Good: '#D97706', 'Non-Compliant': '#DC2626',
        }
        const tierBg: Record<string, string> = {
          Exceptional: '#F0FDF4', Premium: '#ECFDF5', 'Very Good': '#F0FDFA',
          Good: '#FFFBEB', 'Non-Compliant': '#FFF1F2',
        }
        const confColor: Record<string, string> = { high: '#16A34A', medium: '#D97706', low: '#DC2626' }
        return (
          <div>
            {/* Header */}
            <div className="card" style={{ marginBottom: 12, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>Per-Batch Quality Predictions</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {hasML
                      ? `RF model (R² ${data.rfModel.r2?.toFixed(2) ?? '—'}) is active — ML scores shown alongside EU rule-based scores. Sorted by ML score.`
                      : `RF model not yet active (need ${data.rfModel.samplesNeeded} more batch${data.rfModel.samplesNeeded !== 1 ? 'es' : ''}). Showing EU rule-based scores only — ML column will populate automatically once training activates.`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span><strong>{preds.length}</strong> batches</span>
                  {hasML && <span>Confidence: <span style={{ color: '#16A34A' }}>high</span> / <span style={{ color: '#D97706' }}>medium</span> / <span style={{ color: '#DC2626' }}>low</span></span>}
                </div>
              </div>
            </div>

            {preds.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No batches registered yet</div>
                <div style={{ fontSize: 12 }}>Register batches with lab parameters to see quality predictions here.</div>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>Batch</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>Type / Origin</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>EU Rule Score</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>ML Score</th>
                      {hasML && <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>Delta</th>}
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>Tier</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>Anomaly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preds.map((p, i) => {
                      const delta   = p.mlScore != null && p.ruleScore != null ? p.mlScore - p.ruleScore : null
                      const tcol    = p.qualityTier ? tierColor[p.qualityTier] ?? '#64748B' : '#64748B'
                      const tbg     = p.qualityTier ? tierBg[p.qualityTier]   ?? '#F8FAFC' : '#F8FAFC'
                      const anomHigh = (p.anomalyScore ?? 0) >= 40
                      const anomMed  = (p.anomalyScore ?? 0) >= 20
                      return (
                        <tr key={p.batchId} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--surface)' }}>
                          {/* Batch ID */}
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                            {p.batchId.slice(0, 16)}{p.batchId.length > 16 ? '…' : ''}
                          </td>
                          {/* Type / Origin */}
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 500 }}>{p.coffeeType ?? '—'}</div>
                            {p.origin && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.origin}</div>}
                          </td>
                          {/* Rule score */}
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {p.ruleScore != null ? (
                              <span style={{ fontWeight: 700, fontSize: 15, color: p.ruleScore >= 70 ? '#16A34A' : p.ruleScore >= 40 ? '#D97706' : '#DC2626' }}>
                                {p.ruleScore}
                              </span>
                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                          {/* ML score */}
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {p.mlScore != null ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <span style={{ fontWeight: 700, fontSize: 15, color: p.mlScore >= 70 ? '#16A34A' : p.mlScore >= 40 ? '#D97706' : '#DC2626' }}>
                                  {p.mlScore}
                                </span>
                                {p.confidence && (
                                  <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: confColor[p.confidence] }}>
                                    {p.confidence}
                                  </span>
                                )}
                              </div>
                            ) : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Training…</span>}
                          </td>
                          {/* Delta */}
                          {hasML && (
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              {delta != null ? (
                                <span style={{ fontSize: 12, fontWeight: 600, color: delta > 5 ? '#16A34A' : delta < -5 ? '#DC2626' : 'var(--text-muted)' }}>
                                  {delta > 0 ? '+' : ''}{delta}
                                </span>
                              ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </td>
                          )}
                          {/* Tier */}
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {p.qualityTier ? (
                              <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: tbg, color: tcol, border: `1px solid ${tcol}33`, whiteSpace: 'nowrap' }}>
                                {p.qualityTier}
                              </span>
                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                          {/* Anomaly */}
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {p.anomalyScore != null ? (
                              <span style={{ fontSize: 11, fontWeight: 600, color: anomHigh ? '#DC2626' : anomMed ? '#D97706' : '#16A34A' }}>
                                {anomHigh ? 'High' : anomMed ? 'Medium' : 'Normal'}
                                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>({p.anomalyScore})</span>
                              </span>
                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* Footer note */}
                <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <span>EU Rule Score: computed from official EU 2023 coffee directive thresholds.</span>
                  {hasML && <span>ML Score: Random Forest trained on your batch history. Delta = ML minus Rule.</span>}
                  {hasML && <span>Confidence reflects agreement between {data.rfModel.sampleCount > 0 ? '20' : '—'} decision trees.</span>}
                </div>
              </div>
            )}

            {/* Delta explanation when model active */}
            {hasML && (
              <div className="card" style={{ marginTop: 12, padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)', background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <strong style={{ color: '#92400E' }}>How to read the Delta column:</strong> A positive delta means the ML model scores this batch higher than EU rules alone — it found patterns in your data suggesting better quality than the rulebook captures. A large negative delta is a signal to investigate: the ML sees something the rules don't flag.
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
