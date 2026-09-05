"use client";
// app/verify/page.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import jsQR from "jsqr";

type BatchSummary = {
  batchId: string;
  name: string;
  coffeeType: string;
  origin: string;
  farmerName: string;
  price: string | number | null;
  weight: string | null;
  image: string | null;
  approvedAt: string | null;
  qualityStatus: string;
};

function QualityDot({ status }: { status: string }) {
  const bg =
    status === "passed" ? "#4ADE80"
    : status === "caution" ? "#EAB307"
    : "#F87171";
  return (
    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: bg, flexShrink: 0 }} />
  );
}

export default function VerifyLandingPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [query, setQuery] = useState("");
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [search, setSearch] = useState("");
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [detected, setDetected] = useState(false);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    fetch("/api/customer/batches")
      .then((r) => r.json())
      .then((d) => setBatches(d.batches || []))
      .catch(() => {})
      .finally(() => setLoadingBatches(false));
  }, []);

  // ── QR scanning loop ──────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

    if (code) {
      // Extract batch ID — handle full URL or bare ID
      let batchId = code.data.trim();
      try {
        const url = new URL(batchId);
        const parts = url.pathname.split("/").filter(Boolean);
        // e.g. /verify/HON-PRZ-MDW-26-0001
        const idx = parts.indexOf("verify");
        if (idx !== -1 && parts[idx + 1]) batchId = decodeURIComponent(parts[idx + 1]);
        else batchId = parts[parts.length - 1] || batchId;
      } catch {
        // not a URL — use as-is
      }
      setDetected(true);
      stopCamera();
      router.push(`/verify/${encodeURIComponent(batchId)}`);
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [router]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCamError(null);
    setDetected(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Permission denied") || msg.includes("NotAllowed")) {
        setCamError("Camera permission was denied. Please allow camera access in your browser and try again.");
      } else if (msg.includes("NotFound") || msg.includes("DevicesNotFound")) {
        setCamError("No camera found on this device.");
      } else {
        setCamError("Could not access camera: " + msg);
      }
    }
  }, [tick]);

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Form submit ────────────────────────────────────────────────────────────
  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/verify/${encodeURIComponent(trimmed)}`);
  };

  const filtered = batches.filter(
    (b) =>
      !search ||
      (b.batchId || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.coffeeType || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.origin || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: "#F5F5F5", minHeight: "100vh", WebkitFontSmoothing: "antialiased" as const }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap');
        .vl-input:focus { outline: none; border-color: #EAB307 !important; box-shadow: 0 0 0 3px rgba(234,179,7,0.15) !important; }
        .vl-search:focus { outline: none; border-color: #EAB307 !important; box-shadow: 0 0 0 3px rgba(234,179,7,0.12) !important; }
        .vl-row:hover { border-color: #EAB307 !important; box-shadow: 0 4px 16px rgba(234,179,7,0.1) !important; }
        .vl-row:hover .vl-arrow { color: #EAB307 !important; }
        @keyframes vl-spin { to { transform: rotate(360deg); } }
        .vl-spinner { animation: vl-spin 0.8s linear infinite; }
        @keyframes scan-line { 0%,100%{top:10%} 50%{top:82%} }
        .scan-line { animation: scan-line 2s ease-in-out infinite; }
      `}</style>

      {/* Hero */}
      <div style={{ background: "#000", padding: "72px 24px 60px", textAlign: "center" }}>
        <p style={{ color: "#EAB307", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
          CoffeeTrace · Authenticity Registry
        </p>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "clamp(2rem,4vw,2.75rem)", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", margin: "0 0 14px", lineHeight: 1.1 }}>
          Verify your coffee
        </h1>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.95rem", maxWidth: 480, margin: "0 auto 36px", lineHeight: 1.7 }}>
          Enter the batch ID printed on your jar to confirm authenticity, origin, and lab results.
        </p>

        <form onSubmit={handleVerify} style={{ display: "flex", gap: 10, maxWidth: 520, margin: "0 auto" }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. HON-PRZ-MDW-26-0001"
            className="vl-input"
            style={{ flex: 1, borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.15)", padding: "13px 16px", fontSize: "0.9rem", fontFamily: "'Inter',sans-serif", background: "rgba(255,255,255,0.07)", color: "#fff", transition: "border-color 0.15s, box-shadow 0.15s" }}
          />
          <button
            type="submit"
            disabled={!query.trim()}
            style={{ padding: "13px 22px", background: "#EAB307", color: "#000", border: "none", borderRadius: 10, fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: "0.9rem", cursor: query.trim() ? "pointer" : "not-allowed", opacity: !query.trim() ? 0.5 : 1, transition: "background 0.15s", whiteSpace: "nowrap" }}
            onMouseOver={e => { if (query.trim()) (e.currentTarget).style.background = "#D6A300"; }}
            onMouseOut={e => (e.currentTarget).style.background = "#EAB307"}
          >
            Verify
          </button>
        </form>

        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", marginTop: 12 }}>
          The batch ID is printed on the label or QR code of your jar.
        </p>

        {/* QR Scanner toggle */}
        <div style={{ marginTop: 20 }}>
          {!scanning ? (
            <button
              onClick={startCamera}
              style={{ background: "transparent", border: "1.5px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.7)", padding: "9px 20px", borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}
              onMouseOver={e => { e.currentTarget.style.borderColor = "#EAB307"; e.currentTarget.style.color = "#EAB307"; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/><path d="M17 17h4v4h-4z"/>
              </svg>
              Scan QR code with camera
            </button>
          ) : (
            <button
              onClick={stopCamera}
              style={{ background: "transparent", border: "1.5px solid #F87171", color: "#F87171", padding: "9px 20px", borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer" }}
            >
              Stop camera
            </button>
          )}
        </div>

        {camError && (
          <p style={{ color: "#F87171", fontSize: "0.78rem", marginTop: 10, maxWidth: 420, margin: "10px auto 0" }}>{camError}</p>
        )}

        {/* Camera viewfinder */}
        {scanning && (
          <div style={{ maxWidth: 360, margin: "20px auto 0", position: "relative" }}>
            <div style={{ borderRadius: 14, overflow: "hidden", border: "2px solid #EAB307", position: "relative", background: "#000" }}>
              <video
                ref={videoRef}
                muted
                playsInline
                style={{ width: "100%", display: "block" }}
              />
              {/* Scanning overlay */}
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                {/* Corner marks */}
                {[["0","0","0","0"],["0","0","auto","auto"],["auto","auto","0","0"],["auto","auto","auto","auto"]].map(([t,l,b,r], i) => (
                  <div key={i} style={{ position: "absolute", top: t === "0" ? 12 : "auto", left: l === "0" ? 12 : "auto", bottom: b === "0" ? 12 : "auto", right: r === "0" ? 12 : "auto", width: 24, height: 24,
                    borderTop: (t === "0") ? "3px solid #EAB307" : "none",
                    borderLeft: (l === "0") ? "3px solid #EAB307" : "none",
                    borderBottom: (b === "0") ? "3px solid #EAB307" : "none",
                    borderRight: (r === "0") ? "3px solid #EAB307" : "none",
                  }} />
                ))}
                {/* Scan line */}
                <div className="scan-line" style={{ position: "absolute", left: "8%", right: "8%", height: 2, background: "rgba(234,179,7,0.7)", boxShadow: "0 0 6px rgba(234,179,7,0.5)" }} />
              </div>
            </div>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", marginTop: 10 }}>
              Point your camera at the QR code on the coffee jar
            </p>
          </div>
        )}

        {/* Hidden canvas for jsQR */}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

      {/* How it works strip */}
      <div style={{ background: "#fff", borderBottom: "1px solid #D9D9D9", padding: "32px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24, textAlign: "center" }}>
          {[
            { step: "1", title: "Enter batch ID", body: "Scan the QR code or enter the Batch ID from your coffee jar." },
            { step: "2", title: "View Quality Report", body: "Review laboratory results, origin, and quality indicators." },
            { step: "3", title: "Verify Authenticity", body: "Confirm that the product information is authentic and has not been altered." },
          ].map((s) => (
            <div key={s.step}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#000", color: "#EAB307", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.85rem", margin: "0 auto 12px" }}>{s.step}</div>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#EAB307", marginBottom: 6 }}>Step {s.step}</p>
              <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "#000", marginBottom: 4 }}>{s.title}</p>
              <p style={{ fontSize: "0.8rem", color: "#4B4B4B", lineHeight: 1.6, margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Approved batch listing */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" as const, marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#000", letterSpacing: "-0.01em", marginBottom: 4 }}>Verified batches</h2>
            <p style={{ fontSize: "0.75rem", color: "#4B4B4B", margin: 0 }}>
              {batches.length} batch{batches.length !== 1 ? "es" : ""} approved and on-registry
            </p>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name, type, origin…"
            className="vl-search"
            style={{ border: "1.5px solid #D9D9D9", borderRadius: 10, padding: "9px 14px", fontSize: "0.875rem", fontFamily: "'Inter',sans-serif", background: "#fff", color: "#000", width: 240, transition: "border-color 0.15s, box-shadow 0.15s" }}
          />
        </div>

        {loadingBatches ? (
          <div style={{ background: "#fff", border: "1px solid #D9D9D9", borderRadius: 14, padding: "64px 24px", textAlign: "center" }}>
            <div className="vl-spinner" style={{ width: 32, height: 32, border: "3px solid #D9D9D9", borderTopColor: "#EAB307", borderRadius: "50%", margin: "0 auto" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #D9D9D9", borderRadius: 14, padding: "64px 24px", textAlign: "center" }}>
            <p style={{ color: "#4B4B4B", fontSize: "0.9rem", margin: 0 }}>
              {search ? `No batches match "${search}".` : "No approved batches yet."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
            {filtered.map((b) => (
              <Link
                key={b.batchId}
                href={`/verify/${encodeURIComponent(b.batchId)}`}
                className="vl-row"
                style={{ display: "flex", alignItems: "center", gap: 16, background: "#fff", border: "1px solid #D9D9D9", borderRadius: 12, padding: "14px 16px", textDecoration: "none", transition: "border-color 0.15s, box-shadow 0.15s" }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 10, background: "#F5F5F5", border: "1px solid #D9D9D9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                  {b.image ? (
                    <img src={b.image} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: "1.5rem" }}></span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" as const }}>
                    <span style={{ fontFamily: "'SF Mono','Fira Code',monospace", fontSize: "0.75rem", fontWeight: 700, color: "#EAB307" }}>{b.batchId}</span>
                    <QualityDot status={b.qualityStatus} />
                    <span style={{ fontSize: "0.72rem", color: "#4B4B4B", textTransform: "capitalize" as const }}>{b.qualityStatus}</span>
                  </div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "#000", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{b.name}</p>
                  <p style={{ fontSize: "0.775rem", color: "#4B4B4B", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                    {b.farmerName} · {b.origin}{b.weight ? ` · ${b.weight}` : ""}
                  </p>
                </div>

                <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                  {b.price && <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "#000", margin: 0 }}>€{b.price}</p>}
                  {b.weight && <p style={{ fontSize: "0.75rem", color: "#4B4B4B", margin: "2px 0 0" }}>{b.weight}</p>}
                </div>
                <span className="vl-arrow" style={{ color: "#D9D9D9", fontSize: "1.1rem", transition: "color 0.15s" }}>→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
