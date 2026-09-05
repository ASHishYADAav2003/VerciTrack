"use client";
// app/farmer/batches/page.tsx — Full batch list for the farmer

import { useState, useEffect } from "react";
import Link from "next/link";

export default function FarmerBatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [loading,   setLoading]   = useState(true);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = () => {
    fetch("/api/farmer/batches")
      .then(r => r.json())
      .then(d => { setBatches(d.batches || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const deleteBatch = async (batchId: string) => {
    setDeleting(batchId);
    try {
      const res = await fetch(`/api/farmer/batches?batchId=${encodeURIComponent(batchId)}`, { method: "DELETE" });
      if (res.ok) setBatches(prev => prev.filter(b => b.batchId !== batchId));
    } catch { }
    setDeleting(null);
    setConfirmId(null);
  };

  const mine = batches; // already filtered server-side

  const counts = {
    all:       mine.length,
    approved:  mine.filter(b => b.approvalStatus === "approved").length,
    pending:   mine.filter(b => b.approvalStatus === "pending").length,
    rejected:  mine.filter(b => b.approvalStatus === "rejected").length,
    suspended: mine.filter(b => b.approvalStatus === "suspended").length,
  };

  const visible = mine
    .filter(b => filter === "all" || b.approvalStatus === filter)
    .filter(b => !search ||
      (b.batchId    || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.coffeeType  || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.origin     || "").toLowerCase().includes(search.toLowerCase())
    );

  const qualityPill = (s: string) => {
    const l = (s || "").toLowerCase();
    if (l === "passed")  return <span className="pill pill-green">Pass</span>;
    if (l === "caution") return <span className="pill pill-amber">Caution</span>;
    if (l === "failed")  return <span className="pill pill-red">Fail</span>;
    return <span className="pill pill-gray">—</span>;
  };

  const approvalPill = (s: string) => {
    if (s === "approved")  return <span className="pill pill-green">Approved</span>;
    if (s === "rejected")  return <span className="pill pill-red">Rejected</span>;
    if (s === "suspended") return <span className="pill pill-blue">Suspended</span>;
    return <span className="pill pill-amber">Pending</span>;
  };

  const filterTabs = [
    { key: "all",       label: "All",       count: counts.all       },
    { key: "approved",  label: "Approved",  count: counts.approved  },
    { key: "pending",   label: "Pending",   count: counts.pending   },
    { key: "rejected",  label: "Rejected",  count: counts.rejected  },
    { key: "suspended", label: "Suspended", count: counts.suspended },
  ];

  return (
    <>
      <header className="bk-topbar">
        <div>
          <div className="bk-topbar-title">My batches</div>
          <div className="bk-topbar-sub">Track your registered coffee batches and their approval status</div>
        </div>
        <Link href="/farmer/register-batch" className="bk-btn bk-btn-gold">+ Register batch</Link>
      </header>

      <div className="bk-content">

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {filterTabs.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              style={{
                padding: "6px 14px", borderRadius: "var(--radius)",
                fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid",
                background: filter === t.key ? "var(--accent)" : "var(--surface)",
                color:      filter === t.key ? "#fff"          : "var(--text)",
                borderColor: filter === t.key ? "var(--accent)" : "var(--border)",
              }}>
              {t.label} <span style={{ opacity: 0.7 }}>({t.count})</span>
            </button>
          ))}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search batch ID, type, origin…"
            style={{
              marginLeft: "auto", padding: "6px 12px", borderRadius: "var(--radius)",
              border: "1px solid var(--border)", fontSize: 12, outline: "none",
              fontFamily: "inherit", minWidth: 220,
            }}
          />
        </div>

        <div className="bk-card">
          {loading ? (
            <div className="bk-empty">Loading…</div>
          ) : visible.length === 0 ? (
            <div className="bk-empty">
              <div style={{ fontSize: 32, marginBottom: 8 }}></div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                {mine.length === 0 ? "No batches registered yet" : "No batches match this filter"}
              </div>
              {mine.length === 0 && (
                <Link href="/farmer/register-batch" className="bk-btn bk-btn-primary" style={{ marginTop: 8 }}>
                  Register first batch
                </Link>
              )}
            </div>
          ) : (
            <div className="bk-table-wrap">
              <table className="bk-table">
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Origin</th>
                    <th>Humidity</th>
                    <th>HMF</th>
                    <th>Quality</th>
                    <th>Stock left</th>
                    <th>Approval</th>
                    <th>Admin note</th>
                    <th>Verify</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(b => {
                    const humDisplay = b.humidity ? (b.humidity / 10).toFixed(1) + "%" : "—";
                    const hmfDisplay = b.hmf      ? (b.hmf      / 10).toFixed(1) + " mg/kg" : "—";
                    const humNum = b.humidity ?? 0;
                    const hmfNum = b.hmf      ?? 0;
                    const canDelete    = b.approvalStatus !== "approved" && !b.onChain;
                    const isConfirming = confirmId === b.batchId;
                    const isDeleting   = deleting  === b.batchId;
                    return (
                      <tr key={b.batchId}>
                        <td><span className="bk-mono">{b.batchId}</span></td>
                        <td>{b.name || "—"}</td>
                        <td>{b.coffeeType || "—"}</td>
                        <td>{b.origin || "—"}</td>
                        <td style={{ color: humNum > 200 ? "var(--red)" : humNum > 186 ? "var(--amber)" : undefined }}>
                          {humDisplay}
                        </td>
                        <td style={{ color: hmfNum > 400 ? "var(--red)" : hmfNum > 300 ? "var(--amber)" : undefined }}>
                          {hmfDisplay}
                        </td>
                        <td>{qualityPill(b.qualityStatus)}</td>
                        <td style={{ fontWeight: 600, fontSize: 12,
                          color: b.remaining === 0 ? "var(--red)"
                               : b.remaining != null && b.remaining < (b.totalStock || 10) * 0.2 ? "var(--amber)"
                               : "var(--green)" }}>
                          {b.totalStock != null
                            ? `${b.remaining ?? b.totalStock}/${b.totalStock} ${b.unit || "jars"}`
                            : "—"}
                        </td>
                        <td>{approvalPill(b.approvalStatus)}</td>
                        <td style={{ fontSize: 11, color: "var(--bk-muted)", maxWidth: 140 }}>
                          {b.adminNote || <span style={{ opacity: 0.4 }}>—</span>}
                        </td>
                        <td>
                          <Link href={`/verify/${b.batchId}`} className="bk-btn bk-btn-sm" target="_blank">
                            View ↗
                          </Link>
                        </td>
                        <td>
                          {canDelete && !isConfirming && (
                            <button className="bk-btn bk-btn-sm" onClick={() => setConfirmId(b.batchId)}
                              style={{ color: "var(--red)", borderColor: "var(--red)", background: "transparent" }}>
                              Delete
                            </button>
                          )}
                          {canDelete && isConfirming && (
                            <div style={{ display: "flex", gap: 4 }}>
                              <button className="bk-btn bk-btn-sm" disabled={isDeleting}
                                onClick={() => deleteBatch(b.batchId)}
                                style={{ background: "var(--red)", color: "#fff", border: "none" }}>
                                {isDeleting ? "…" : "Yes"}
                              </button>
                              <button className="bk-btn bk-btn-sm" onClick={() => setConfirmId(null)}>No</button>
                            </div>
                          )}
                          {!canDelete && <span style={{ fontSize: 10, color: "var(--bk-muted)" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Approval status legend */}
        <div style={{
          marginTop: 16, padding: "12px 16px",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", fontSize: 12, color: "var(--bk-muted)", lineHeight: 1.8,
        }}>
          <strong style={{ color: "var(--text)" }}>Approval status guide:</strong>&nbsp;
          <span className="pill pill-amber" style={{ fontSize: 10 }}>Pending</span> Under admin review &nbsp;·&nbsp;
          <span className="pill pill-green" style={{ fontSize: 10 }}>Approved</span> Live on marketplace &nbsp;·&nbsp;
          <span className="pill pill-red"   style={{ fontSize: 10 }}>Rejected</span> Not listed — see admin note &nbsp;·&nbsp;
          <span className="pill pill-blue"  style={{ fontSize: 10 }}>Suspended</span> Temporarily removed
        </div>

        <div className="bk-eu-note">
          <strong>EU Directive 2001/110/EC:</strong>&nbsp;
          Humidity ≤18.6% = Pass · 18.6–20% = Caution · &gt;20% = Fail &nbsp;|&nbsp;
          HMF ≤30 mg/kg = Pass · 30–40 = Caution · &gt;40 = Fail
        </div>
      </div>
    </>
  );
}
