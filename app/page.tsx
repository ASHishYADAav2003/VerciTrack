// app/page.tsx
"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";


function VerifyWidget({ dark }: { dark?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    router.push(`/verify/${encodeURIComponent(trimmed)}`);
  };

  const inputBorder = dark ? "rgba(255,255,255,0.15)" : "#D9D9D9";
  const inputBg = dark ? "rgba(255,255,255,0.07)" : "#fff";
  const inputColor = dark ? "#fff" : "#000";
  const hintColor = dark ? "rgba(255,255,255,0.35)" : "#888";
  const linkColor = dark ? "rgba(255,255,255,0.7)" : "#000";

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <form onSubmit={handleVerify} style={{ display: "flex", gap: 10 }}>
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Enter batch code, e.g. HON-KOS-ACE-24-0001"
          style={{
            flex: 1, border: `1.5px solid ${inputBorder}`, borderRadius: 10,
            padding: "13px 16px", fontSize: "0.9rem", fontFamily: "'Inter', sans-serif",
            color: inputColor, background: inputBg, outline: "none", transition: "border-color 0.15s",
          }}
          onFocus={e => { e.target.style.borderColor = "#EAB307"; e.target.style.boxShadow = "0 0 0 3px rgba(234,179,7,0.15)"; }}
          onBlur={e => { e.target.style.borderColor = inputBorder; e.target.style.boxShadow = "none"; }}
        />
        <button
          type="submit"
          style={{
            padding: "13px 22px", background: "#EAB307", color: "#000",
            border: "none", borderRadius: 10, fontFamily: "'Inter', sans-serif",
            fontWeight: 600, fontSize: "0.9rem", cursor: "pointer",
            transition: "background 0.15s", whiteSpace: "nowrap",
          }}
          onMouseOver={e => ((e.target as HTMLButtonElement).style.background = "#D6A300")}
          onMouseOut={e => ((e.target as HTMLButtonElement).style.background = "#EAB307")}
        >
          Check quality
        </button>
      </form>
      <p style={{ fontSize: "0.75rem", color: hintColor, marginTop: 10 }}>
        Or{" "}
        <Link href="/verify" style={{ color: linkColor, fontWeight: 500, borderBottom: "1px solid rgba(255,255,255,0.3)", textDecoration: "none" }}>
          open the QR scanner
        </Link>
        {" "}to use your camera.
      </p>
    </div>
  );
}

type Product = {
  batchId: string;
  farmerName: string;
  coffeeType: string;
  origin: string;
  price: number | null;
  image: string | null;
  qualityTier: string | null;
  qualityScore: number | null;
  jarSizeG: number | null;
  stockLeft: number | null;
};

const TIER_COLOR: Record<string, string> = {
  Exceptional: "#166534", Premium: "#1D4ED8", "Very Good": "#6D28D9", Good: "#92400E", "Non-Compliant": "#991B1B",
};
const TIER_BG: Record<string, string> = {
  Exceptional: "#DCFCE7", Premium: "#DBEAFE", "Very Good": "#EDE9FE", Good: "#FEF3C7", "Non-Compliant": "#FEE2E2",
};

export default function HomePage() {
  const [heroImg, setHeroImg] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/marketplace")
      .then(r => r.json())
      .then((d: any) => {
        const list: Product[] = (Array.isArray(d) ? d : d.batches ?? [])
          .filter((b: any) => b.approvalStatus === "approved" || !b.approvalStatus)
          .slice(0, 3);
        setProducts(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then(r => r.json())
      .then(d => { if (d.heroImageUrl) setHeroImg(d.heroImageUrl); })
      .catch(() => {});
  }, []);

  return (
    <main style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", background: "#fff", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .hp-hero { background: #000; padding: 96px 48px; position: relative; overflow: hidden; }
        .hp-hero-bg { position: absolute; inset: 0; background-size: cover; background-position: center; background-repeat: no-repeat; }
        .hp-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.3)); }
        .hp-hero-left { flex: 1; position: relative; z-index: 1; max-width: 600px; }
        .hp-hero-tag {
          display: inline-block; background: rgba(234,179,7,0.12);
          color: #EAB307; font-size: 0.72rem; font-weight: 600;
          padding: 5px 14px; border-radius: 100px;
          letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 24px;
          border: 1px solid rgba(234,179,7,0.25);
        }
        .hp-hero h1 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 700; color: #fff;
          line-height: 1.08; margin-bottom: 20px;
          letter-spacing: -0.02em;
        }
        .hp-hero h1 span { color: #EAB307; }
        .hp-hero p {
          font-size: 1rem; color: rgba(255,255,255,0.6);
          line-height: 1.75; max-width: 480px; margin-bottom: 40px;
        }
        .hp-cta-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .hp-btn-primary {
          padding: 14px 28px; background: #EAB307; color: #000;
          border-radius: 10px; font-weight: 600; font-size: 0.9rem;
          text-decoration: none; border: none; cursor: pointer;
          transition: background 0.15s; font-family: 'Inter', sans-serif;
        }
        .hp-btn-primary:hover { background: #D6A300; }
        .hp-btn-ghost {
          padding: 14px 28px; background: transparent;
          border: 1.5px solid rgba(255,255,255,0.25); color: #fff;
          border-radius: 10px; font-weight: 500; font-size: 0.9rem;
          text-decoration: none; transition: border-color 0.15s, background 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .hp-btn-ghost:hover { border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.05); }

        .hp-hero-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex-shrink: 0; }
        .hp-hero-stats {
          display: flex; gap: 32px; margin-top: 48px; position: relative; z-index: 1;
        }
        .hp-hero-stat-val { font-size: 1.5rem; font-weight: 800; color: #EAB307; letter-spacing: -0.02em; }
        .hp-hero-stat-label { font-size: 0.72rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }

        .hp-trust {
          background: #EAB307; padding: 10px 48px;
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .hp-trust span {
          color: #000; font-size: 0.75rem; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
        }

        .hp-steps { background: #FAFAFA; padding: 96px 48px; }
        .hp-steps-inner { max-width: 1060px; margin: 0 auto; }
        .hp-section-tag {
          font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; color: #4B4B4B; margin-bottom: 10px;
        }
        .hp-steps h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(1.6rem, 3vw, 2.25rem);
          font-weight: 700; color: #000;
          margin-bottom: 52px; letter-spacing: -0.02em;
        }
        .hp-steps-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
        .hp-prod-card {
          background: #fff; border-radius: 16px; overflow: hidden;
          border: 1px solid #E5E7EB; text-decoration: none; color: inherit;
          transition: box-shadow 0.2s, border-color 0.2s; display: flex; flex-direction: column;
        }
        .hp-prod-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.1); border-color: #EAB307; }
        .hp-prod-img {
          width: 100%; aspect-ratio: 4/3; object-fit: cover; background: #F3F4F6;
          display: flex; align-items: center; justify-content: center; font-size: 3.5rem;
        }
        .hp-prod-img img { width: 100%; height: 100%; object-fit: cover; }
        .hp-prod-body { padding: 18px 20px 20px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .hp-prod-type { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6B7280; }
        .hp-prod-name { font-size: 1rem; font-weight: 700; color: #111; letter-spacing: -0.01em; line-height: 1.3; }
        .hp-prod-origin { font-size: 0.8rem; color: #6B7280; }
        .hp-prod-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 14px; }
        .hp-prod-price { font-size: 1.1rem; font-weight: 800; color: #000; }
        .hp-prod-tier { font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 100px; }

        .hp-cta { background: #000; padding: 80px 48px; text-align: center; }
        .hp-cta h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(1.75rem, 3.5vw, 2.5rem);
          font-weight: 700; color: #fff;
          margin-bottom: 14px; letter-spacing: -0.02em;
        }
        .hp-cta h2 span { color: #EAB307; }
        .hp-cta p { font-size: 1rem; color: rgba(255,255,255,0.55); margin-bottom: 32px; }

        .hp-footer {
          background: #000; border-top: 1px solid rgba(255,255,255,0.08);
          padding: 24px 48px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .hp-footer-logo { font-family: 'Space Grotesk', sans-serif; color: #EAB307; font-weight: 700; font-size: 0.9rem; }
        .hp-footer-copy { color: rgba(255,255,255,0.3); font-size: 0.8rem; }

        @media (max-width: 768px) {
          .hp-hero { padding: 60px 24px; }
          .hp-hero-stats { gap: 20px; }
          .hp-steps { padding: 60px 24px; }
          .hp-steps-grid { grid-template-columns: 1fr; }
          .hp-cta { padding: 60px 24px; }
          .hp-trust { padding: 10px 24px; text-align: center; }
          .hp-footer { flex-direction: column; gap: 8px; text-align: center; padding: 20px 24px; }
        }
      `}</style>

      {/* Hero */}
      <section className="hp-hero">
        {/* Background image + overlay */}
        {heroImg && (
          <>
            <div className="hp-hero-bg" style={{ backgroundImage: `url(${heroImg})` }} />
            <div className="hp-hero-overlay" />
          </>
        )}

        <div className="hp-hero-left">        
          <div>
          </div>
          <div>
          </div>
          <div>
          </div>
          <div className="hp-hero-tag">Blockchain-verified coffee</div>
          <h1>
            From farm to <span>jar</span> —<br/>fully traceable
          </h1>
          <p>
            Every batch on HAV is backed by laboratory analysis and immutable
            blockchain records. Verify authenticity in seconds.
          </p>
          <div className="hp-cta-row">
            <Link href="/marketplace" className="hp-btn-primary">Browse products</Link>
            <Link href="/register/farmer" className="hp-btn-ghost">I am a farmer</Link>
          </div>

          <div className="hp-hero-stats">
            <div>
            </div>
            <div>
            </div>
            <div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div className="hp-trust">
        <span>All batches carry lab-verified certificates stored on blockchain</span>
      </div>

      

      {/* Featured products */}
      <section className="hp-steps">
        <div className="hp-steps-inner">
          <p className="hp-section-tag">Featured products</p>
          <h2 style={{ marginBottom: products.length ? 52 : 20 }}>
          </h2>
          {products.length === 0 ? (
            <p style={{ color: "#6B7280", fontSize: "0.9rem" }}>
              No products listed yet.{" "}
              <Link href="/marketplace" style={{ color: "#EAB307", fontWeight: 600, textDecoration: "none" }}>
                Browse marketplace →
              </Link>
            </p>
          ) : (
            <>
              <div className="hp-steps-grid">
                {products.map(p => (
                  <Link key={p.batchId} href={`/product/${p.batchId}`} className="hp-prod-card">
                    <div className="hp-prod-img">
                      {p.image
                        ? <img src={p.image} alt={p.coffeeType} />
                        : ""}
                    </div>
                    <div className="hp-prod-body">
                      <span className="hp-prod-type">{p.coffeeType}</span>
                      <span className="hp-prod-name">{p.coffeeType} Coffee</span>
                      <span className="hp-prod-origin"> {p.origin} · {p.farmerName}</span>
                      <div className="hp-prod-footer">
                        <span className="hp-prod-price">
                          {p.price ? `€${p.price.toFixed(2)}` : "—"}
                          {p.jarSizeG && <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#6B7280" }}> / {p.jarSizeG}g</span>}
                        </span>
                        {p.qualityTier && (
                          <span className="hp-prod-tier" style={{
                            background: TIER_BG[p.qualityTier] ?? "#F3F4F6",
                            color: TIER_COLOR[p.qualityTier] ?? "#374151",
                          }}>
                            {p.qualityTier}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div style={{ textAlign: "center", marginTop: 36 }}>
                <Link href="/marketplace" className="hp-btn-primary" style={{ display: "inline-block" }}>
                  View all products →
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA + Verify section */}
      <section className="hp-cta">
        <h2>Ready to trace your <span>coffee</span>?</h2>
        <p>Already have a jar? Enter your batch code below to see the full lab report and blockchain proof.</p>
        <VerifyWidget dark />
      </section>

      {/* Footer */}
      <footer className="hp-footer">
        <span className="hp-footer-logo">HAV — Coffee Authenticity Verification</span>
        <span className="hp-footer-copy">Dissertation prototype · University of Bath · 202</span>
      </footer>
    </main>
  );
}
