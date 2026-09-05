"use client";
// app/verify/[batchId]/page.tsx

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  TIER_COLOR, TIER_BG, TIER_BORDER, TIER_DESC, PARAM_DESC,
  type QualityTier, type ParameterScore,
} from "@/lib/coffeeQuality";

type Batch = {
  batchId: string; name: string; coffeeType: string; origin: string;
  farmerName: string; harvestYear: number | null;
  price: string | number | null; weight: string | null;
  description: string | null; image: string | null;
  pdfHash: string | null; certificateUrl: string | null;
  txHash: string | null; approvedAt: string | null; createdAt: string | null;
  qualityStatus: "passed" | "caution" | "failed";
  qualityScore: number | null; qualityTier: QualityTier | null;
  qualityBreakdown: ParameterScore[] | null; qualityFlags: string[];
  humidity: number | null; hmf: number | null; colour: number | null;
  diastase: number | null; freeAcidity: number | null; proline: number | null;
  conductivity: number | null; fructoseGlucose: number | null;
  sucrose: number | null; residuesClean: boolean | null;
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: "1px solid #F3F4F6" }}>
      <span style={{ fontSize: 13, color: "#6B7280", flexShrink: 0, width: 140 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#111827", textAlign: "right", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

function ScoreBar({ score, tier }: { score: number; tier: ParameterScore["tier"] }) {
  const color =
    tier === "exceptional" ? "#166534" :
    tier === "premium"     ? "#1E40AF" :
    tier === "good"        ? "#374151" :
    tier === "caution"     ? "#D97706" :
    tier === "fail"        ? "#DC2626" : "#9CA3AF";
  return (
    <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 3, transition: "width .5s ease" }} />
    </div>
  );
}

type PageStatus = "loading" | "found" | "not-found" | "forbidden" | "error";

export default function VerifyBatchPage() {
  const params  = useParams();
  const batchId = typeof params?.batchId === "string" ? decodeURIComponent(params.batchId)
                : Array.isArray(params?.batchId)      ? decodeURIComponent(params.batchId[0])
                : null;

  const [batch,  setBatch]  = useState<Batch | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) { setStatus("not-found"); return; }
    setStatus("loading");
    fetch(`/api/verify/${encodeURIComponent(batchId)}`)
      .then(async res => {
        if (res.ok)              { const d = await res.json(); setBatch(d.batch); setStatus("found"); }
        else if (res.status === 404) setStatus("not-found");
        else if (res.status === 403) setStatus("forbidden");
        else                         setStatus("error");
      })
      .catch(() => setStatus("error"));
  }, [batchId]);

  if (status === "loading") {
    return (
      <main style={{ minHeight: "100vh", background: "#F8F9FA", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #E5E7EB", borderTopColor: "#2563EB", animation: "spin .8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 13, color: "#9CA3AF" }}>Verifying <span style={{ fontFamily: "monospace" }}>{batchId}</span>…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  if (status !== "found" || !batch) {
    const msgs: Record<string, { heading: string; body: string }> = {
      "not-found": { heading: "Batch not found",     body: `No batch "${batchId}" in the registry. Check the label.` },
      forbidden:   { heading: "Not yet available",   body: "This batch hasn't been approved for public verification yet." },
      error:       { heading: "Something went wrong", body: "Couldn't load this batch — please try again." },
    };
    const m = msgs[status] ?? msgs.error;
    return (
      <main style={{ minHeight: "100vh", background: "#F8F9FA", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: "40px 32px", maxWidth: 400, width: "100%", textAlign: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{m.heading}</h1>
          <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 24, lineHeight: 1.6 }}>{m.body}</p>
          <Link href="/verify" style={{ display: "inline-block", background: "#2563EB", color: "#fff", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            Try another batch
          </Link>
        </div>
      </main>
    );
  }

  const tier = batch.qualityTier;
  const hasScore = batch.qualityScore !== null && tier;
  const breakdown = (batch.qualityBreakdown ?? []).filter(p => p.tier !== "na");

  return (
    <main style={{ minHeight: "100vh", background: "#F8F9FA", padding: "32px 16px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Nav */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <Link href="/verify" style={{ fontSize: 12, color: "#9CA3AF", textDecoration: "none" }}>← Verify another batch</Link>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>HAV Coffee Traceability Platform</span>
        </div>

        {/* ── Verified header ────────────────────────────────────────────── */}
        <div style={{ background: "#1F2937", borderRadius: "12px 12px 0 0", padding: "20px 24px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>

          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Verified authentic</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{batch.name}</div>
          </div>
          {hasScore && tier && (
            <div style={{ background: TIER_BG[tier], border: `1px solid ${TIER_BORDER[tier]}`, borderRadius: 6, padding: "6px 12px", flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: TIER_COLOR[tier] }}>{tier}</div>
              <div style={{ fontSize: 10, color: "#6B7280", marginTop: 1 }}>{batch.qualityScore}/100</div>
            </div>
          )}
        </div>

        {/* ── Quality score card ─────────────────────────────────────────── */}
        {hasScore && tier && breakdown.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderTop: "none", padding: "24px" }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", marginBottom: 16 }}>Quality score</h2>

            {/* Overall score bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              {/* Circular score */}
              <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
                <svg viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#F3F4F6" strokeWidth="7" />
                  <circle cx="32" cy="32" r="26" fill="none" stroke={TIER_COLOR[tier]} strokeWidth="7"
                    strokeDasharray={`${2 * Math.PI * 26}`}
                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - (batch.qualityScore ?? 0) / 100)}`}
                    strokeLinecap="round" style={{ transition: "stroke-dashoffset .6s ease" }} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: TIER_COLOR[tier] }}>
                  {batch.qualityScore}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: TIER_COLOR[tier], marginBottom: 3 }}>{tier}</div>
                <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>{TIER_DESC[tier]}</div>
              </div>
            </div>

            {/* Per-parameter breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
              {breakdown.map(p => (
                <div key={p.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <button
                      onClick={() => setExpanded(expanded === p.key ? null : p.key)}
                      style={{ fontSize: 11, color: "#374151", fontWeight: 600, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
                      {p.label} {expanded === p.key ? "▲" : "▼"}
                    </button>
                    <span style={{ fontSize: 10, color: "#9CA3AF" }}>{p.score}/100</span>
                  </div>
                  <ScoreBar score={p.score} tier={p.tier} />
                  {p.value !== null && (
                    <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
                      {p.key === "purity" ? "Score" : `Measured: ${typeof p.value === "number" ? p.value.toFixed(p.unit === "mS/cm" ? 2 : p.unit === "%" ? 1 : 0) : p.value} ${p.unit}`}
                    </div>
                  )}
                  {expanded === p.key && (
                    <div style={{ marginTop: 6, padding: "8px 10px", background: "#F9FAFB", borderRadius: 6, fontSize: 11, color: "#4B5563", lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{p.note}</div>
                      <div style={{ color: "#6B7280" }}>{PARAM_DESC[p.key] ?? ""}</div>
                      {p.ideal && <div style={{ marginTop: 4, color: "#6B7280" }}>Ideal: {p.ideal} · EU limit: {p.euLimit}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {batch.qualityFlags.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #F3F4F6" }}>
                {batch.qualityFlags.map((f, i) => (
                  <p key={i} style={{ fontSize: 11, color: "#92400E", marginTop: 3 }}>! {f}</p>
                ))}
              </div>
            )}

            <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 14 }}>
              Score is a weighted composite of {breakdown.length} lab parameters per EU Directive 2001/110/EC. Click any parameter to learn more.
            </p>
          </div>
        )}

        {/* ── Main detail card ───────────────────────────────────────────── */}
        <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderTop: "none", padding: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 40px" }}>

            {/* Batch details */}
            <div>
              <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", marginBottom: 12 }}>Batch details</h2>
              <InfoRow label="Batch ID"     value={<span style={{ fontFamily: "monospace", color: "#2563EB", fontSize: 12 }}>{batch.batchId}</span>} />
              <InfoRow label="Coffee type"   value={batch.coffeeType} />
              <InfoRow label="Origin"       value={batch.origin} />
              <InfoRow label="Harvest year" value={batch.harvestYear} />
              <InfoRow label="Weight"       value={batch.weight} />
              <InfoRow label="Price"        value={batch.price ? `€${batch.price}` : null} />
              <InfoRow label="Description"  value={batch.description} />
            </div>

            {/* Lab values */}
            <div>
              <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", marginBottom: 12 }}>Lab values</h2>
              {[
                ["Water content", batch.humidity,        "%",      "max 20%"],
                ["HMF",           batch.hmf,             "mg/kg",  "max 40"],
                ["Colour",        batch.colour,          "mm Pfund","—"],
                ["Diastase",      batch.diastase,        "DN",     "min 8"],
                ["Free acidity",  batch.freeAcidity,     "meq/kg", "max 50"],
                ["Proline",       batch.proline,         "mg/kg",  "min 300"],
                ["Conductivity",  batch.conductivity,    "mS/cm",  "max 0.8"],
                ["Fructose+Glucose", batch.fructoseGlucose, "%",   "min 60%"],
                ["Sucrose",       batch.sucrose,         "%",      "max 5%"],
              ].filter(([,v]) => v !== null && v !== undefined).map(([label, value, unit, limit]) => (
                <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>{label as string}</span>
                  <span style={{ fontSize: 12, color: "#111827", fontWeight: 500 }}>
                    {typeof value === "number" ? value.toFixed(unit === "mS/cm" ? 2 : label === "Colour" || label === "Proline" ? 0 : 1) : String(value)} {unit as string}
                    <span style={{ fontSize: 10, color: "#9CA3AF", marginLeft: 4 }}>({limit as string})</span>
                  </span>
                </div>
              ))}
              {batch.residuesClean !== null && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>Residues</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: batch.residuesClean ? "#166534" : "#991B1B" }}>
                    {batch.residuesClean ? "All clean" : "Detected"}
                  </span>
                </div>
              )}
              {!batch.humidity && !batch.hmf && !batch.diastase && (
                <p style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", padding: "20px 0" }}>No lab data recorded.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Producer ──────────────────────────────────────────────────── */}
        <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderTop: "none", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#374151", flexShrink: 0 }}>
              {(batch.farmerName || "B").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{batch.farmerName}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>Registered farmer</div>
            </div>
          </div>
          <Link href={`/farmer-profile/${encodeURIComponent(batch.farmerName)}`}
            style={{ fontSize: 12, fontWeight: 600, color: "#2563EB", textDecoration: "none", flexShrink: 0 }}>
            View profile →
          </Link>
        </div>

        {/* ── Lab report PDF ─────────────────────────────────────────────── */}
        {batch.certificateUrl ? (
          <a href={batch.certificateUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 14, background: "#2563EB", borderRadius: "0 0 12px 12px", padding: "16px 24px", textDecoration: "none" }}>
            <div style={{ width: 38, height: 38, background: "rgba(255,255,255,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 18 }}>↗</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>View lab report (PDF)</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Accredited laboratory certificate · opens in new tab</div>
            </div>
          </a>
        ) : (
          <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderTop: "none", borderRadius: "0 0 12px 12px", padding: "16px 24px", display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 38, height: 38, background: "#F3F4F6", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 16, flexShrink: 0 }}>?</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#6B7280" }}>Lab report not available</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>No PDF certificate uploaded for this batch</div>
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: "#9CA3AF", marginTop: 20, paddingBottom: 8 }}>
          Verified {batch.approvedAt ? new Date(batch.approvedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"} · HAV Coffee Authenticity Verification Platform
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
