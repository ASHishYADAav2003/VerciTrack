'use client'

import { useState, useEffect, useRef } from 'react'
import { CONTRACT_ADDRESS } from '@/lib/contractConfig'

export default function SettingsPage() {
  const [heroImg, setHeroImg] = useState("")
  const [heroTitle, setHeroTitle] = useState("")
  const [heroSub, setHeroSub] = useState("")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then(r => r.json())
      .then(d => {
        setHeroImg(d.heroImageUrl || "")
        setHeroTitle(d.heroTitle || "")
        setHeroSub(d.heroSubtitle || "")
      })
      .catch(() => {})
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
  }

  const uploadImage = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append("image", file)
    try {
      const res = await fetch('/api/admin/upload-hero', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        setHeroImg(data.url)
        setMsg({ text: "Hero image updated — refresh homepage to see it.", ok: true })
        setPreview(null)
        if (fileRef.current) fileRef.current.value = ""
      } else {
        setMsg({ text: data.error || "Upload failed.", ok: false })
      }
    } catch {
      setMsg({ text: "Network error.", ok: false })
    }
    setUploading(false)
    setTimeout(() => setMsg(null), 4000)
  }

  const removeImage = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heroImageUrl: "" }),
      })
      if (res.ok) {
        setHeroImg("")
        setMsg({ text: "Hero image removed.", ok: true })
      }
    } catch {}
    setSaving(false)
    setTimeout(() => setMsg(null), 3000)
  }

  const saveText = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heroTitle, heroSubtitle: heroSub }),
      })
      if (res.ok) setMsg({ text: "Homepage text saved.", ok: true })
      else setMsg({ text: "Failed to save.", ok: false })
    } catch {
      setMsg({ text: "Network error.", ok: false })
    }
    setSaving(false)
    setTimeout(() => setMsg(null), 3000)
  }

  const sysSettings = [
    {
      section: 'Blockchain',
      items: [
        { label: 'Contract address', value: CONTRACT_ADDRESS, mono: true, status: { text: 'Live', cls: 'pill-green' } },
        { label: 'Network', value: 'Hardhat localhost — chain ID 31337', status: { text: 'Local', cls: 'pill-blue' } },
        { label: 'Contract', value: 'CoffeeTraceability.sol — Solidity 0.8.28' },
        { label: 'Deploy command', value: 'npx hardhat run scripts/deploy.ts --network localhost', mono: true },
      ],
    },
    {
      section: 'AI / Lab parsing',
      items: [
        { label: 'Claude model', value: 'claude-sonnet-4-20250514', mono: true, status: { text: 'Active', cls: 'pill-green' } },
        { label: 'PDF upload endpoint', value: '/api/upload-lab-report', mono: true },
        { label: 'Parsed fields', value: 'humidity · HMF · colour · diastase · acidity · proline · conductivity · sugars · ash · isotopic diff' },
      ],
    },
    {
      section: 'Auth & data',
      items: [
        { label: 'Auth method', value: 'Cookie-based (auth_user JSON + user_role)', status: { text: 'Prototype', cls: 'pill-amber' } },
        { label: 'User store', value: 'data/users.json', mono: true, status: { text: 'Plain text passwords', cls: 'pill-red' } },
        { label: 'Batch store', value: 'data/marketplaceBatches.json', mono: true },
        { label: 'Roles', value: 'admin · farmer · customer' },
      ],
    },
  ]

  return (
    <div>
      {/* Toast */}
      {msg && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 999,
          background: msg.ok ? '#EAB307' : '#991B1B',
          color: msg.ok ? '#000' : '#fff',
          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>{msg.text}</div>
      )}

      <div className="page-header">
        <div className="page-title">Settings</div>
        <div className="page-sub">Homepage customisation and system configuration</div>
      </div>

      {/* ── Homepage Hero ────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
          Homepage Hero
        </div>

        {/* Current image preview */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Background image
          </div>
          {(preview || heroImg) ? (
            <div style={{ position: 'relative', width: '100%', height: 200, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview || heroImg}
                alt="Hero background"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.7) 40%, transparent)', display: 'flex', alignItems: 'flex-end', padding: 16 }}>
                <span style={{ color: '#EAB307', fontWeight: 700, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>Hero preview</span>
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', height: 140, border: '2px dashed var(--border)', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, background: 'var(--cream)' }}>
              <span style={{ fontSize: 28 }}></span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No background image set — homepage shows solid black</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="hero-file-input"
            />
            <label htmlFor="hero-file-input" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'var(--surface)', transition: 'border-color 0.15s' }}>
              Choose image
            </label>
            {preview && (
              <button className="btn btn-primary btn-sm" onClick={uploadImage} disabled={uploading}>
                {uploading ? "Uploading…" : "Upload & save"}
              </button>
            )}
            {heroImg && !preview && (
              <button className="btn btn-danger btn-sm" onClick={removeImage} disabled={saving}>
                Remove image
              </button>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 8 }}>JPG, PNG or WebP. Recommended: 1920×1080px or wider. The image will be darkened automatically so white text remains readable.</p>
        </div>

        {/* Hero text */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            Hero text
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Headline</label>
              <input
                value={heroTitle}
                onChange={e => setHeroTitle(e.target.value)}
                placeholder="From farm to jar — fully traceable"
                style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 10, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Subheading</label>
              <textarea
                value={heroSub}
                onChange={e => setHeroSub(e.target.value)}
                rows={2}
                placeholder="Every batch on HAV is backed by laboratory analysis…"
                style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', resize: 'vertical' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <button className="btn btn-primary btn-sm" onClick={saveText} disabled={saving} style={{ marginTop: 4 }}>
                {saving ? "Saving…" : "Save text"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── System settings ──────────────────────────────────────── */}
      <div style={{ background: 'var(--amber-bg)', border: '1px solid #f0c96a', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--amber)' }}>
        <strong>Prototype note:</strong> Passwords stored in plain text. Do not use real credentials.
      </div>

      {sysSettings.map(group => (
        <div key={group.section} className="card" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>{group.section}</div>
          {group.items.map((item: any) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 220, fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{item.label}</div>
              <div style={{ flex: 1, fontSize: 12, fontFamily: item.mono ? "'SF Mono','Fira Code',monospace" : undefined, color: 'var(--text)' }}>{item.value}</div>
              {item.status && <span className={`pill ${item.status.cls}`}>{item.status.text}</span>}
            </div>
          ))}
        </div>
      ))}

      <div className="card">
        <div className="card-title">Useful commands</div>
        {[
          { label: 'Start Hardhat node', cmd: 'npx hardhat node' },
          { label: 'Deploy contract', cmd: 'npx hardhat run scripts/deploy.ts --network localhost' },
          { label: 'Start dev server', cmd: 'npm run dev' },
        ].map(({ label, cmd }) => (
          <div key={label} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 200, fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</div>
            <code style={{ flex: 1, background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 10px', fontSize: 12, fontFamily: "'SF Mono','Fira Code',monospace" }}>{cmd}</code>
          </div>
        ))}
      </div>
    </div>
  )
}
