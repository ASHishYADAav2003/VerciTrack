"use client";
// app/marketplace/page.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPublicClient, http } from "viem";
import { CONTRACT_ABI, CONTRACT_ADDRESS, hardhatLocalhost } from "@/lib/contractConfig";

type CoffeeProduct = {
  id: string;
  name: string;
  batchId: string;
  origin: string;
  status: string;
  coffeeType?: string;
  farmerName?: string;
  harvestYear?: number;
  price?: string;
  weight?: string;
  jarSizeG?: number;
  totalStock?: number;
  remaining?: number;
  sold?: number;
  description?: string;
  pdfHash?: string;
  certificateUrl?: string;
  image?: string;
  source?: "chain" | "api";
  qualityScore?: number | null;
  qualityTier?: string | null;
  // On-chain quality params (decoded)
  humidity?: number | null;     // %
  hmf?: number | null;          // mg/kg
  diastase?: number | null;     // DN
  freeAcidity?: number | null;  // meq/kg
  proline?: number | null;      // mg/kg
};

type CartItem = { product: CoffeeProduct; qty: number };

export default function MarketplacePage() {
  const [products,    setProducts]   = useState<CoffeeProduct[]>([]);
  const [search,      setSearch]     = useState("");
  const [loading,     setLoading]    = useState(true);
  const [toast,       setToast]      = useState<{ text: string; ok: boolean } | null>(null);
  const [authUser,    setAuthUser]   = useState<any>(null);
  const [chainError,  setChainError] = useState<string | null>(null);
  const [cart,        setCart]       = useState<CartItem[]>([]);
  const [cartOpen,    setCartOpen]   = useState(false);
  const [ordering,    setOrdering]   = useState(false);

  useEffect(() => {
    loadProducts();
    // auth_user is httpOnly — fetch via /api/auth/me
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : { user: null })
      .then(d => { if (d.user) setAuthUser(d.user); })
      .catch(() => {});
  }, []);

  const showToast = (text: string, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 4000);
  };

  async function loadProducts() {
    setLoading(true);
    const results: CoffeeProduct[] = [];

    // 1. On-chain
    try {
      const client = createPublicClient({
        chain: hardhatLocalhost,
        transport: http("http://127.0.0.1:8545"),
      });
      const ids = (await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getAllBatchIds" as const,
        args: [],
      })) as string[];

      await Promise.all(
        ids.map(async (id) => {
          const [core, quality, listing] = await Promise.all([
            client.readContract({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "getBatchCore" as const, args: [id] as [string] }),
            client.readContract({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "getBatchQuality" as const, args: [id] as [string] }).catch(() => null),
            client.readContract({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "getBatchListing" as const, args: [id] as [string] }).catch(() => null),
          ]);

          const c = core as readonly [string, string, string, string, string, string, boolean];
          if (!c[6]) return;

          // Decode quality (all ×10 or ×1000 encoded)
          const q = quality as readonly [bigint,string,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint] | null;
          const l = listing as readonly [bigint,bigint,bigint,bigint,bigint,string] | null;

          const qualityScore = q ? Number(q[0]) : null;
          const qualityTier  = q ? q[1] : null;
          const humDisplay   = q ? Number(q[2]) / 10 : null;
          const hmfDisplay   = q ? Number(q[3]) / 10 : null;
          const diasDisplay  = q ? Number(q[4]) / 10 : null;
          const acidDisplay  = q ? Number(q[5]) / 10 : null;
          const prolDisplay  = q ? Number(q[6]) : null;

          const jarSizeG   = l ? Number(l[1]) : null;
          const totalStock = l ? Number(l[2]) : null;
          const soldCount  = l ? Number(l[3]) : null;
          const harvestYear= l ? Number(l[4]) : null;
          const remaining  = (totalStock && soldCount != null) ? totalStock - soldCount : null;

          results.push({
            id: c[0], name: `${c[3]} Coffee`, batchId: c[0],
            origin: c[2], status: "Verified", coffeeType: c[3],
            farmerName: c[1], pdfHash: c[4], source: "chain",
            qualityScore, qualityTier,
            humidity: humDisplay, hmf: hmfDisplay,
            diastase: diasDisplay, freeAcidity: acidDisplay, proline: prolDisplay,
            jarSizeG: jarSizeG ?? undefined,
            totalStock: totalStock ?? undefined,
            remaining: remaining ?? undefined,
            sold: soldCount ?? undefined,
            harvestYear: harvestYear ?? undefined,
          });
        })
      );
    } catch (chainErr) {
      console.warn("[Blockchain] read failed:", chainErr);
      setChainError(chainErr instanceof Error ? chainErr.message : String(chainErr));
    }

    // 2. Off-chain marketplace — only approved batches
    try {
      const res  = await fetch("/api/marketplace");
      const data = await res.json();
      const batches: CoffeeProduct[] = Array.isArray(data) ? data : (data.batches || []);
      const existingIds = new Set(results.map((r) => r.batchId));
      batches
        .filter((p: CoffeeProduct) => (p as any).approvalStatus === "approved" || !(p as any).approvalStatus)
        .forEach((p: CoffeeProduct) => {
          if (!existingIds.has(p.batchId)) {
            results.push({ ...p, source: "api" });
          } else {
            const idx = results.findIndex((r) => r.batchId === p.batchId);
            if (idx !== -1) {
              results[idx] = {
                ...results[idx],
                price:          p.price,
                weight:         p.weight,
                description:    p.description,
                certificateUrl: p.certificateUrl,
                image:          p.image,
                // Fill quality tier/score from JSON if not on chain yet
                qualityScore:   results[idx].qualityScore ?? (p as any).qualityScore ?? null,
                qualityTier:    results[idx].qualityTier  ?? (p as any).qualityTier  ?? null,
              };
            }
          }
        });
    } catch { /* non-fatal */ }

    setProducts(results);
    setLoading(false);
  }

  // ── Cart functions ────────────────────────────────────────────────────────
  function addToCart(product: CoffeeProduct) {
    setCart(prev => {
      const existing = prev.find(i => i.product.batchId === product.batchId);
      if (existing) return prev.map(i => i.product.batchId === product.batchId ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1 }];
    });
    setCartOpen(true);
    showToast(`${product.name} added to cart`, true);
  }

  function removeFromCart(batchId: string) {
    setCart(prev => prev.filter(i => i.product.batchId !== batchId));
  }

  async function placeOrder() {
    if (cart.length === 0) return;
    setOrdering(true);
    try {
      for (const item of cart) {
        await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchId:       item.product.batchId,
            coffeeType:     item.product.coffeeType,
            farmerName: item.product.farmerName,
            customerName:  authUser?.name  ?? "Anonymous",
            customerEmail: authUser?.email ?? "",
            quantity:      item.qty,
            total:         item.product.price ? (parseFloat(item.product.price) * item.qty).toFixed(2) : "0",
            status:        "confirmed",
          }),
        });
      }
      setCart([]);
      setCartOpen(false);
      showToast("Order placed successfully!", true);
    } catch {
      showToast("Failed to place order. Try again.", false);
    }
    setOrdering(false);
  }

  const cartTotal = cart.reduce((sum, i) => sum + (parseFloat(i.product.price || "0") * i.qty), 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const filtered = products.filter((p) => {
    const s = search.toLowerCase();
    return (
      !s ||
      p.name.toLowerCase().includes(s) ||
      p.batchId.toLowerCase().includes(s) ||
      p.origin.toLowerCase().includes(s) ||
      (p.coffeeType      ?? "").toLowerCase().includes(s) ||
      (p.farmerName  ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap');
        :root { --accent:#EAB307; --accent-h:#C99500; --accent-d:#D6A300; }
        .mp-page { font-family:'Inter','Segoe UI',system-ui,sans-serif; background:#F5F5F5; min-height:100vh; -webkit-font-smoothing:antialiased; }
        .mp-hero { background:#000; color:white; padding:64px 40px 52px; }
        .mp-hero-inner { max-width:1100px; margin:0 auto; }
        .mp-hero h1 { font-family:'Space Grotesk',sans-serif; font-size:clamp(2rem,4vw,3rem); font-weight:700; line-height:1.08; margin:0 0 12px; letter-spacing:-0.02em; }
        .mp-hero h1 span { color:#EAB307; }
        .mp-hero p { font-size:0.95rem; color:rgba(255,255,255,0.6); max-width:440px; line-height:1.7; margin:0 0 28px; }
        .mp-search { display:flex; align-items:center; background:white; border-radius:10px; padding:5px 5px 5px 16px; max-width:480px; gap:8px; border:1.5px solid #D9D9D9; }
        .mp-search input { border:none; outline:none; flex:1; font-size:0.9rem; font-family:'Inter',sans-serif; color:#000; background:transparent; }
        .mp-search-btn { background:#EAB307; color:#000; border:none; border-radius:8px; padding:8px 18px; font-size:0.85rem; font-family:'Inter',sans-serif; font-weight:600; cursor:pointer; transition:background 0.15s; }
        .mp-search-btn:hover { background:#D6A300; }
        .mp-stats { background:white; border-bottom:1px solid #D9D9D9; }
        .mp-stats-inner { max-width:1100px; margin:0 auto; padding:14px 40px; display:flex; align-items:center; gap:28px; }
        .mp-stat { display:flex; align-items:center; gap:8px; font-size:0.83rem; color:#4B4B4B; }
        .mp-stat strong { color:#000; font-weight:600; }
        .mp-stat-dot { width:6px; height:6px; border-radius:50%; background:#EAB307; }
        .mp-grid-wrapper { max-width:1100px; margin:0 auto; padding:40px; }
        .mp-section-label { font-size:0.72rem; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:#4B4B4B; margin-bottom:20px; }
        .mp-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .mp-card { background:white; border-radius:14px; overflow:hidden; transition:border-color 0.2s,box-shadow 0.2s; border:1px solid #D9D9D9; display:block; text-decoration:none; color:inherit; }
        .mp-card:hover { border-color:#EAB307; box-shadow:0 8px 32px rgba(234,179,7,0.12); }
        .mp-card-img { width:100%; aspect-ratio:4/3; object-fit:cover; display:block; }
        .mp-card-img-placeholder { width:100%; aspect-ratio:4/3; background:#FAFAFA; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; border-bottom:1px solid #D9D9D9; }
        .mp-card-body { padding:18px 20px 20px; }
        .mp-card-badges { display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap; }
        .mp-badge { font-size:0.68rem; font-weight:600; padding:3px 9px; border-radius:4px; border:1px solid; }
        .mp-badge-verified { background:#F0FDF4; color:#166534; border-color:#BBF7D0; }
        .mp-badge-chain { background:#FEFCE8; color:#854D0E; border-color:#FDE68A; }
        .mp-card-name { font-family:'Inter',sans-serif; font-size:1rem; font-weight:700; color:#000; margin:0 0 4px; letter-spacing:-0.01em; }
        .mp-card-meta { font-size:0.78rem; color:#4B4B4B; margin:0 0 12px; }
        .mp-card-price { font-size:1.2rem; font-weight:700; color:#000; margin:0 0 14px; }
        .mp-card-price span { font-size:0.78rem; font-weight:400; color:#4B4B4B; margin-left:4px; }
        .mp-card-actions { display:flex; gap:8px; }
        .mp-btn-primary { flex:1; background:#EAB307; color:#000; border:none; border-radius:10px; padding:10px; font-size:0.82rem; font-family:'Inter',sans-serif; font-weight:600; cursor:pointer; transition:background 0.15s; }
        .mp-btn-primary:hover:not(:disabled) { background:#D6A300; }
        .mp-btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
        .mp-btn-secondary { background:white; color:#000; border:1.5px solid #D9D9D9; border-radius:10px; padding:10px 14px; font-size:0.82rem; font-family:'Inter',sans-serif; font-weight:500; cursor:pointer; transition:all 0.15s; text-decoration:none; display:flex; align-items:center; }
        .mp-btn-secondary:hover { border-color:#EAB307; background:#FEFCE8; }
        .mp-empty { text-align:center; padding:80px 40px; }
        .mp-empty-icon { font-size:3rem; margin-bottom:16px; }
        .mp-empty h2 { font-size:1.25rem; font-weight:700; color:#000; margin:0 0 8px; letter-spacing:-0.01em; }
        .mp-empty p { color:#4B4B4B; font-size:0.9rem; }
        .mp-loading { text-align:center; padding:80px 40px; }
        .mp-spinner { width:36px; height:36px; border:3px solid #D9D9D9; border-top-color:#EAB307; border-radius:50%; animation:spin 0.8s linear infinite; margin:0 auto 16px; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .mp-toast { position:fixed; bottom:24px; right:24px; padding:12px 20px; border-radius:10px; font-size:0.875rem; font-weight:500; z-index:999; animation:slideUp 0.3s ease; max-width:340px; line-height:1.4; }
        .mp-toast-ok  { background:#EAB307; color:#000; }
        .mp-toast-err { background:#991B1B; color:white; }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @media(max-width:900px){.mp-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:600px){.mp-grid{grid-template-columns:1fr}.mp-hero,.mp-grid-wrapper{padding-left:20px;padding-right:20px}}
      `}</style>

      <div className="mp-page">

        {/* Toast */}
        {toast && (
          <div className={`mp-toast ${toast.ok ? "mp-toast-ok" : "mp-toast-err"}`}>
            {toast.text}
          </div>
        )}

        {/* Hero */}
        <div className="mp-hero">
          <div className="mp-hero-inner">
            <h1>Verified <span>Coffee</span><br />Marketplace</h1>
            <p>Every jar is blockchain-verified — from farm to your table.</p>
            <div className="mp-search">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by type, origin, producer…" />
              <button className="mp-search-btn">Search</button>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        {!loading && (
          <div className="mp-stats">
            <div className="mp-stats-inner">
              <div className="mp-stat"><div className="mp-stat-dot" /><strong>{products.length}</strong> products listed</div>
              <div className="mp-stat"><div className="mp-stat-dot" /><strong>{products.filter(p => p.source === "chain").length}</strong> blockchain-verified</div>
              <div className="mp-stat"><div className="mp-stat-dot" /><strong>{new Set(products.map(p => p.farmerName).filter(Boolean)).size}</strong> producers</div>
              {chainError && (
                <div style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#991B1B", background: "#FFF5F5", border: "1px solid #FECACA", borderRadius: 6, padding: "4px 10px", maxWidth: 400 }}>
                  Chain error: {chainError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="mp-grid-wrapper">
          {loading ? (
            <div className="mp-loading">
              <div className="mp-spinner" />
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Loading products…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mp-empty">
              <div className="mp-empty-icon"></div>
              <h2>{products.length === 0 ? "No products yet" : "No results found"}</h2>
              <p>{products.length === 0 ? "Farmers will add their coffee batches here once registered." : "Try a different search term."}</p>
            </div>
          ) : (
            <>
              <div className="mp-section-label">
                HAV Coffee — {filtered.length} product{filtered.length !== 1 ? "s" : ""}
              </div>
              <div className="mp-grid">
                {filtered.map(product => (
                  <ProductCard
                    key={product.batchId}
                    product={product}
                    onAddToCart={() => addToCart(product)}
                    inCart={cart.some(i => i.product.batchId === product.batchId)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Cart drawer */}
        {cartOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
            {/* Backdrop */}
            <div
              onClick={() => setCartOpen(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
            />
            {/* Drawer */}
            <div style={{
              position: "relative", width: 400, maxWidth: "95vw",
              background: "white", height: "100%", display: "flex", flexDirection: "column",
              boxShadow: "-4px 0 32px rgba(0,0,0,0.15)",
            }}>
              {/* Header */}
              <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: "1.05rem" }}>Your Basket</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: 2 }}>{cartCount} item{cartCount !== 1 ? "s" : ""}</div>
                </div>
                <button onClick={() => setCartOpen(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94A3B8", lineHeight: 1 }}>×</button>
              </div>

              {/* Items */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
                {cart.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 0", color: "#94A3B8" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: 12, color: "#CBD5E1" }}>( )</div>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Basket is empty</div>
                    <div style={{ fontSize: "0.85rem" }}>Add some coffee to get started</div>
                  </div>
                ) : cart.map(item => {
                  const jarLabel = item.product.jarSizeG
                    ? item.product.jarSizeG >= 1000 ? `${item.product.jarSizeG / 1000}kg` : `${item.product.jarSizeG}g`
                    : item.product.weight ?? "";
                  return (
                    <div key={item.product.batchId} style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 0", borderBottom: "1px solid #F1F5F9",
                    }}>
                      {/* Thumbnail */}
                      <div style={{ width: 52, height: 52, borderRadius: 10, background: "#FEFCE8", border: "1px solid #FDE68A", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.product.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: 2 }}>
                          {jarLabel && `${jarLabel} · `}×{item.qty}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>
                          €{item.product.price ? (parseFloat(item.product.price) * item.qty).toFixed(2) : "—"}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.batchId)}
                          style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: "0.75rem", marginTop: 2 }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              {cart.length > 0 && (
                <div style={{ padding: "16px 24px 24px", borderTop: "1px solid #E2E8F0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontFamily: "'Inter',sans-serif" }}>
                    <span style={{ color: "#64748B" }}>Total</span>
                    <span style={{ fontWeight: 700, fontSize: "1.15rem" }}>€{cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={placeOrder}
                    disabled={ordering}
                    style={{
                      width: "100%", background: "#EAB307", color: "#000",
                      border: "none", borderRadius: 12, padding: "13px",
                      fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: "0.95rem",
                      cursor: ordering ? "not-allowed" : "pointer", opacity: ordering ? 0.6 : 1,
                    }}
                  >
                    {ordering ? "Placing order…" : "Place Order"}
                  </button>
                  <div style={{ fontSize: "0.72rem", color: "#94A3B8", textAlign: "center", marginTop: 10 }}>
                    Blockchain-verified · Secure checkout
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  );
}

// ── Quality helpers ───────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Exceptional": { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0" },
  "Premium":     { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" },
  "Very Good":   { bg: "#F8FAFC", text: "#334155", border: "#CBD5E1" },
  "Good":        { bg: "#F9FAFB", text: "#4B5563", border: "#E5E7EB" },
  "Non-Compliant": { bg: "#FFF5F5", text: "#991B1B", border: "#FECACA" },
};

type MetricMini = { label: string; value: number | null | undefined; unit: string; limit: number; lowerBetter: boolean };

function QualityMiniMetrics({ product }: { product: CoffeeProduct }) {
  const metrics: MetricMini[] = [
    { label: "Water", value: product.humidity,    unit: "%",     limit: 20,  lowerBetter: true  },
    { label: "HMF",   value: product.hmf,         unit: "mg/kg", limit: 40,  lowerBetter: true  },
    { label: "Proline",value: product.proline,    unit: "mg/kg", limit: 300, lowerBetter: false },
    { label: "Diastase",value: product.diastase,  unit: "DN",    limit: 8,   lowerBetter: false },
  ].filter(m => m.value != null && m.value > 0);

  if (metrics.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
      {metrics.map(m => {
        const v = m.value!;
        const good = m.lowerBetter ? v <= m.limit * 0.75 : v >= m.limit;
        const caution = m.lowerBetter ? (v > m.limit * 0.75 && v <= m.limit) : (v >= m.limit * 0.6 && v < m.limit);
        const color = good ? "#16A34A" : caution ? "#D97706" : "#DC2626";
        const display = v >= 100 ? Math.round(v) : v.toFixed(1);
        return (
          <div key={m.label} style={{
            display: "flex", alignItems: "center", gap: 3,
            background: "#F8FAFC", borderRadius: 6, padding: "2px 6px",
            border: "1px solid #E2E8F0",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ fontSize: "0.68rem", color: "#64748B", fontWeight: 500 }}>{m.label}</span>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#1E293B" }}>{display}</span>
            <span style={{ fontSize: "0.62rem", color: "#94A3B8" }}>{m.unit}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onAddToCart,
  inCart,
}: {
  product: CoffeeProduct;
  onAddToCart: () => void;
  inCart: boolean;
}) {
  const [added, setAdded] = useState(false);
  const soldOut = (product.remaining ?? 1) <= 0;

  const tierStyle = product.qualityTier ? TIER_COLORS[product.qualityTier] ?? TIER_COLORS["Good"] : null;
  const jarLabel = product.jarSizeG
    ? product.jarSizeG >= 1000 ? `${product.jarSizeG / 1000}kg` : `${product.jarSizeG}g`
    : product.weight ?? null;

  function handleAddToCart(e: React.MouseEvent) {
    e.stopPropagation(); // don't navigate when clicking button
    if (soldOut) return;
    onAddToCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <Link href={`/product/${product.batchId}`} className="mp-card" style={{ textDecoration: "none", color: "inherit", cursor: "pointer", display: "block" }}>
      {product.image
        ? <img src={product.image} alt={product.name} className="mp-card-img" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        : (
          <div className="mp-card-img-placeholder">
            <svg viewBox="0 0 48 48" fill="none" width="48" height="48" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 22 Q15 25 15 29 L15 40 Q15 42 17 42 H31 Q33 42 33 40 L33 29 Q33 25 32 22Z" fill="#FEF9C3" stroke="#EAB307" strokeWidth="2"/>
              <rect x="18" y="16" width="12" height="6" rx="1" fill="#FEF9C3" stroke="#EAB307" strokeWidth="2"/>
              <rect x="16" y="13" width="16" height="3.5" rx="1.5" fill="#EAB307" stroke="#D6A300" strokeWidth="1.5"/>
              <path d="M16 34 Q20 31 24 32 Q28 31 32 34 L32 40 Q32 41.5 31 41.5 H17 Q16 41.5 16 40Z" fill="#EAB307" opacity="0.3"/>
            </svg>
            <span style={{ fontSize: "0.7rem", color: "#94A3B8", fontFamily: "'Inter',sans-serif" }}>No photo</span>
          </div>
        )
      }
      <div className="mp-card-body">

        {/* Badges row */}
        <div className="mp-card-badges">
          {product.source === "chain" && (
            <span className="mp-badge" style={{ background: "#EDE7F6", color: "#512DA8" }}>On-chain</span>
          )}
          {tierStyle && product.qualityTier && (
            <span style={{
              fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 100,
              background: tierStyle.bg, color: tierStyle.text, border: `1px solid ${tierStyle.border}`,
            }}>
              {product.qualityTier}
              {product.qualityScore ? ` · ${product.qualityScore}/100` : ""}
            </span>
          )}
        </div>

        {/* Name + origin */}
        <h3 className="mp-card-name">{product.name}</h3>
        <p className="mp-card-meta">
          {product.origin}
          {product.farmerName ? ` · ${product.farmerName}` : ""}
          {product.harvestYear ? ` · ${product.harvestYear}` : ""}
        </p>

        {/* Quality mini metrics from chain */}
        <QualityMiniMetrics product={product} />

        {/* Jar + stock — only show when low or sold out */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: "0.78rem" }}>
          {jarLabel && <span style={{ color: "#64748B" }}>{jarLabel} jar</span>}
          {(() => {
            const left = product.remaining ?? product.totalStock ?? 0;
            const total = product.totalStock ?? 0;
            if (left <= 0 && total > 0)
              return <span style={{ fontWeight: 600, color: "#DC2626" }}>· Sold out</span>;
            if (total > 0 && product.remaining != null && product.remaining <= Math.ceil(total * 0.15))
              return <span style={{ fontWeight: 600, color: "#B45309" }}>· Only {product.remaining} left</span>;
            return null;
          })()}
        </div>

        {/* Price */}
        <div className="mp-card-price">
          {product.price ? `€${product.price}` : "—"}
          {jarLabel && product.price && <span>/ {jarLabel}</span>}
        </div>

        {/* Add to cart button */}
        <button
          className="mp-btn-primary"
          onClick={handleAddToCart}
          disabled={soldOut}
          style={
            soldOut ? { background: "#9CA3AF", cursor: "not-allowed", width: "100%" } :
            added   ? { background: "#16A34A", width: "100%" } :
            inCart  ? { background: "#D6A300", width: "100%" } :
            { width: "100%" }
          }
        >
          {soldOut ? "Sold out" : added ? "Added!" : inCart ? "In basket" : product.price ? `Add to Basket · €${product.price}` : "Enquire"}
        </button>

      </div>
    </Link>
  );
}
