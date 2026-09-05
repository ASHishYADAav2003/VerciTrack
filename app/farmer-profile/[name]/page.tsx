"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type FarmerProfile = {
  id: string;
  name: string;
  farmName?: string;
  location?: string;
  walletAddress?: string;
  status: string;
};

type CoffeeProduct = {
  id: string;
  name: string;
  batchId: string;
  origin: string;
  status: string;
  coffeeType?: string;
  farmerName?: string;
  price?: string;
  weight?: string;
  description?: string;
  image?: string;
  pdfHash?: string;
};

export default function FarmerProfilePage() {
  const params = useParams();
  const farmerName = decodeURIComponent(
    typeof params.name === "string" ? params.name : ""
  );

  const [farmer, setFarmer] = useState<FarmerProfile | null>(null);
  const [products, setProducts] = useState<CoffeeProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (farmerName) load();
  }, [farmerName]);

  async function load() {
    setLoading(true);
    try {
      const [bkRes, mpRes] = await Promise.all([
        fetch("/api/farmers"),   // public endpoint — approved farmers only
        fetch("/api/marketplace"),
      ]);
      const bkData = await bkRes.json();
      const mpData = await mpRes.json();

      const found = (bkData.farmers || []).find(
        (u: FarmerProfile) =>
          u.name.toLowerCase() === farmerName.toLowerCase()
      );
      setFarmer(found || null);

      // /api/marketplace returns a raw array
      const allProducts: CoffeeProduct[] = Array.isArray(mpData) ? mpData : mpData.batches || [];
      setProducts(
        allProducts.filter(
          (p) => p.farmerName?.toLowerCase() === farmerName.toLowerCase()
        )
      );
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }

  // Derive organic status — in a real system this would be a field on the user
  // For prototype: assume organic if location includes certain regions
  const isOrganic = farmer?.location?.toLowerCase().includes("prizren") ||
    farmer?.location?.toLowerCase().includes("rugova") || false;

  return (
    <>
      <style>{STYLES}</style>
      <div className="bp-page">

        {loading ? (
          <div className="bp-loading">
            <div className="bp-spinner" />
            <p>Loading producer profile…</p>
          </div>
        ) : !farmer ? (
          <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center", fontFamily: "'Inter',sans-serif" }}>
            <div style={{ fontSize: "3rem", marginBottom: 20 }}></div>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.75rem", fontWeight: 700, color: "#000", margin: "0 0 12px", letterSpacing: "-0.02em" }}>Producer not found</h1>
            <p style={{ fontSize: "0.95rem", color: "#4B4B4B", maxWidth: 420, lineHeight: 1.7, margin: "0 0 28px" }}>
              There is no verified producer with the name <strong>"{farmerName}"</strong> on this platform. Check the URL or browse all producers.
            </p>
            <a href="/farmer-profile" style={{ background: "#EAB307", color: "#000", borderRadius: 10, padding: "12px 24px", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none" }}>
              Browse all producers
            </a>
          </div>
        ) : (
          <>
            {/* Hero banner */}
            <div className="bp-hero">
              <div className="bp-hero-inner">
                <div className="bp-hero-text">
                  <p className="bp-commitment">
                    Our commitment to 100% traceable coffee
                  </p>
                  <h1 className="bp-hero-title">
                    Your coffee was<br />produced by:
                  </h1>
                  <h2 className="bp-farmer-name">{farmerName}</h2>

                  {isOrganic && (
                    <div className="bp-organic-badge">
                      <span></span> Organic Producer
                    </div>
                  )}
                </div>

                {/* Avatar */}
                <div className="bp-avatar-wrap">
                  <div className="bp-avatar">
                    <span>‍</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bp-wrapper">

              {/* Producer details card */}
              {farmer && (
                <div className="bp-details-card">
                  <div className="bp-detail-grid">
                    <div>
                      <p className="bp-detail-label">Farm / Plantation</p>
                      <p className="bp-detail-val">{farmer.farmName || "Independent producer"}</p>
                    </div>
                    <div>
                      <p className="bp-detail-label">Location</p>
                      <p className="bp-detail-val">{farmer.location || "Kosovo"}</p>
                    </div>
                    <div>
                      <p className="bp-detail-label">Verified status</p>
                      <p className="bp-detail-val" style={{ color: "#2E7D32", fontWeight: 600 }}>
                        {farmer.status === "approved" ? " Approved producer" : farmer.status}
                      </p>
                    </div>
                    <div>
                      <p className="bp-detail-label">Organic certification</p>
                      <p className="bp-detail-val">{isOrganic ? " Organic" : "Conventional"}</p>
                    </div>
                  </div>

                  {/* Bio — in a real system this would be a field on the user */}
                  <div className="bp-bio">
                    <p className="bp-detail-label" style={{ marginBottom: 8 }}>About this producer</p>
                    <p className="bp-bio-text">
                      {farmer.farmName
                        ? `${farmer.farmName} is a family-run plantation located in the highlands of ${farmer.location || "Kosovo"}. Their bees forage in pristine mountain meadows, producing coffee with exceptional purity and character. Every batch is independently lab-tested and registered on the blockchain for full traceability.`
                        : `${farmerName} is an independent farmer producing certified, traceable coffee. All batches are lab-tested and registered on the blockchain for authenticity.`}
                    </p>
                  </div>

                  {farmer.walletAddress && (
                    <div className="bp-wallet">
                      <p className="bp-detail-label">Blockchain wallet</p>
                      <p className="bp-wallet-addr">{farmer.walletAddress}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Map placeholder */}
              <div className="bp-map-section">
                <h2 className="bp-section-title">Plantation location</h2>
                <div className="bp-map-placeholder">
                  <div className="bp-map-pin"></div>
                  <p className="bp-map-location">
                    {farmer?.location || farmerName + "'s Plantation"}
                  </p>
                  <p className="bp-map-note">
                    Interactive map coming soon — location: {farmer?.location || "Kosovo"}
                  </p>
                </div>
              </div>

              {/* Products from this farmer */}
              <div className="bp-products-section">
                <h2 className="bp-section-title">
                  Coffee from {farmerName}
                </h2>

                {products.length === 0 ? (
                  <div className="bp-no-products">
                    <p>No products listed yet from this producer.</p>
                  </div>
                ) : (
                  <div className="bp-products-grid">
                    {products.map((p) => (
                      <Link
                        key={p.batchId}
                        href={`/product/${p.id || p.batchId}`}
                        className="bp-product-card"
                      >
                        <div className="bp-product-img">
                          {p.image ? (
                            <img src={p.image} alt={p.name} />
                          ) : (
                            <span></span>
                          )}
                        </div>
                        <p className="bp-product-name">{p.name}</p>
                        <p className="bp-product-origin">{p.origin}</p>
                        <p className="bp-product-price">
                          {p.price ? `${p.price} €` : "—"}
                        </p>
                        <div className="bp-product-actions">
                          <span className="bp-product-btn-buy">Order Online</span>
                          <span className="bp-product-btn-more">Learn More</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Traceability flow */}
              <div className="bp-trace-section">
                <h2 className="bp-trace-heading">
                  <span className="bp-trace-heading-yellow">From Plantation</span>{" "}
                  <span className="bp-trace-heading-black">to You</span>
                </h2>
                <p className="bp-trace-subtitle">Every step from farm to your jar is independently verified and recorded on the blockchain</p>

                <div className="bp-flow">
                  {([
                    {
                      n: 1, yellow: true,
                      label: "Plantation",
                      desc: "Our bees thrive in clean and natural highland environments",
                      icon: (
                        <svg viewBox="0 0 44 44" fill="none" width="42" height="42" strokeLinecap="round" strokeLinejoin="round">
                          {/* Dome roof */}
                          <path d="M22 5 C14 5 10 12 10 16 H34 C34 12 30 5 22 5Z" fill="#FFFBEB" stroke="#EAB307" strokeWidth="1.8"/>
                          {/* Top box */}
                          <rect x="10" y="16" width="24" height="7" fill="#FFFBEB" stroke="#EAB307" strokeWidth="1.8"/>
                          {/* Bottom box */}
                          <rect x="10" y="23" width="24" height="8" fill="#FFFBEB" stroke="#EAB307" strokeWidth="1.8"/>
                          {/* Entrance arch */}
                          <path d="M18 31 Q22 27 26 31" stroke="#EAB307" strokeWidth="1.6" fill="none"/>
                          {/* Divider lines */}
                          <line x1="10" y1="19.5" x2="34" y2="19.5" stroke="#EAB307" strokeWidth="0.8" opacity="0.45"/>
                          <line x1="10" y1="26.5" x2="34" y2="26.5" stroke="#EAB307" strokeWidth="0.8" opacity="0.45"/>
                          {/* Bee */}
                          <ellipse cx="37" cy="9" rx="3" ry="2" fill="#EAB307" stroke="#C99500" strokeWidth="0.8"/>
                          <path d="M35 7.5 Q32 4 34 7" stroke="#4B4B4B" strokeWidth="1.1" fill="none"/>
                          <path d="M37 7 Q40 4 38 6.5" stroke="#4B4B4B" strokeWidth="1.1" fill="none"/>
                        </svg>
                      ),
                    },
                    {
                      n: 2, yellow: true,
                      label: "Harvest",
                      desc: "Coffee is carefully harvested by experienced farmers",
                      icon: (
                        <svg viewBox="0 0 44 44" fill="none" width="42" height="42" strokeLinecap="round" strokeLinejoin="round">
                          {/* Dipper handle */}
                          <line x1="10" y1="8" x2="28" y2="26" stroke="#EAB307" strokeWidth="2.2"/>
                          {/* Dipper head (ridged cylinder) */}
                          <ellipse cx="31" cy="29" rx="5" ry="3.5" fill="#FFFBEB" stroke="#EAB307" strokeWidth="1.8"/>
                          <ellipse cx="31" cy="29" rx="5" ry="3.5" fill="none" stroke="#EAB307" strokeWidth="1.8"/>
                          {/* Ridges */}
                          <line x1="29" y1="25.8" x2="29" y2="32.2" stroke="#EAB307" strokeWidth="1"/>
                          <line x1="31" y1="25.5" x2="31" y2="32.5" stroke="#EAB307" strokeWidth="1"/>
                          <line x1="33" y1="25.8" x2="33" y2="32.2" stroke="#EAB307" strokeWidth="1"/>
                          {/* Coffee drops */}
                          <path d="M28 36 Q27 34 28 32.5 Q29 34 28 36Z" fill="#EAB307"/>
                          <path d="M32 39 Q31 36.5 32 35 Q33 36.5 32 39Z" fill="#EAB307"/>
                          <path d="M35 35 Q34.2 33 35 31.5 Q35.8 33 35 35Z" fill="#EAB307"/>
                        </svg>
                      ),
                    },
                    {
                      n: 3, yellow: false,
                      label: "Laboratory Verified",
                      desc: "Independently tested by an accredited laboratory for quality and purity",
                      icon: (
                        <svg viewBox="0 0 44 44" fill="none" width="42" height="42" strokeLinecap="round" strokeLinejoin="round" stroke="#4B4B4B" strokeWidth="1.8">
                          {/* Eyepiece */}
                          <rect x="19" y="5" width="6" height="5" rx="1" fill="#F5F5F5"/>
                          {/* Body tube */}
                          <rect x="20" y="10" width="4" height="10" rx="1" fill="#F5F5F5"/>
                          {/* Arm / nosepiece */}
                          <path d="M24 20 Q30 22 30 26" strokeWidth="2"/>
                          {/* Objective lens */}
                          <rect x="27" y="26" width="6" height="4" rx="2" fill="#EAB307" stroke="#C99500" strokeWidth="1.5"/>
                          {/* Stage */}
                          <rect x="14" y="30" width="18" height="2.5" rx="1" fill="#F5F5F5"/>
                          {/* Slide */}
                          <rect x="17" y="30" width="10" height="1.5" rx="0.5" fill="#EAB307" stroke="#C99500" strokeWidth="0.8"/>
                          {/* Base */}
                          <path d="M11 39 Q14 32.5 18 32.5 H26 Q30 32.5 33 39Z" fill="#F5F5F5"/>
                          {/* Arm support */}
                          <line x1="22" y1="20" x2="22" y2="30" strokeWidth="1.5"/>
                        </svg>
                      ),
                    },
                    {
                      n: 4, yellow: true,
                      label: "HAV Blockchain Platform",
                      desc: "Batch recorded on the HAV Blockchain — data is immutable and cannot be altered",
                      icon: (
                        <svg viewBox="0 0 44 44" fill="none" width="42" height="42" strokeLinecap="round" strokeLinejoin="round">
                          {/* Central node */}
                          <rect x="17" y="17" width="10" height="10" rx="2" fill="#FFFBEB" stroke="#EAB307" strokeWidth="1.8"/>
                          {/* Top-left node */}
                          <rect x="4" y="5" width="9" height="9" rx="2" fill="#FFFBEB" stroke="#EAB307" strokeWidth="1.6"/>
                          {/* Top-right node */}
                          <rect x="31" y="5" width="9" height="9" rx="2" fill="#FFFBEB" stroke="#EAB307" strokeWidth="1.6"/>
                          {/* Bottom-left node */}
                          <rect x="4" y="30" width="9" height="9" rx="2" fill="#FFFBEB" stroke="#EAB307" strokeWidth="1.6"/>
                          {/* Connecting lines */}
                          <line x1="13" y1="9.5" x2="17" y2="19" stroke="#EAB307" strokeWidth="1.4"/>
                          <line x1="31" y1="9.5" x2="27" y2="19" stroke="#EAB307" strokeWidth="1.4"/>
                          <line x1="13" y1="34.5" x2="17" y2="27" stroke="#EAB307" strokeWidth="1.4"/>
                          {/* Lock (bottom-right area) */}
                          <rect x="31" y="32" width="10" height="8" rx="2" fill="#EAB307" stroke="#C99500" strokeWidth="1.5"/>
                          <path d="M33 32 Q33 28 36 28 Q39 28 39 32" stroke="#EAB307" strokeWidth="1.8" fill="none"/>
                          <circle cx="36" cy="36" r="1.5" fill="#fff"/>
                          {/* Line to lock */}
                          <line x1="27" y1="27" x2="31" y2="32" stroke="#EAB307" strokeWidth="1.4"/>
                        </svg>
                      ),
                    },
                    {
                      n: 5, yellow: true,
                      label: "Available for Purchase",
                      desc: "Carefully packaged and delivered to trusted buyers",
                      icon: (
                        <svg viewBox="0 0 44 44" fill="none" width="42" height="42" strokeLinecap="round" strokeLinejoin="round">
                          {/* Jar body */}
                          <path d="M13 20 Q12 22 12 26 L12 37 Q12 39 14 39 H30 Q32 39 32 37 L32 26 Q32 22 31 20Z" fill="#FFFBEB" stroke="#EAB307" strokeWidth="1.8"/>
                          {/* Neck */}
                          <rect x="16" y="15" width="12" height="5" rx="1" fill="#FFFBEB" stroke="#EAB307" strokeWidth="1.8"/>
                          {/* Lid */}
                          <rect x="14" y="12" width="16" height="3.5" rx="1.5" fill="#EAB307" stroke="#C99500" strokeWidth="1.5"/>
                          {/* Coffee fill inside */}
                          <path d="M13 32 Q16 30 22 31 Q28 30 31 32 L31 37 Q31 38.5 30 38.5 H14 Q13 38.5 13 37Z" fill="#EAB307" opacity="0.35"/>
                          {/* QR code on label */}
                          <rect x="17" y="23" width="10" height="10" rx="1" fill="#fff" stroke="#EAB307" strokeWidth="1"/>
                          {/* QR corner squares */}
                          <rect x="18.5" y="24.5" width="2.5" height="2.5" rx="0.3" fill="#000"/>
                          <rect x="23" y="24.5" width="2.5" height="2.5" rx="0.3" fill="#000"/>
                          <rect x="18.5" y="29" width="2.5" height="2.5" rx="0.3" fill="#000"/>
                          {/* QR dots */}
                          <rect x="23" y="29" width="1.2" height="1.2" rx="0.2" fill="#000"/>
                          <rect x="24.8" y="27.5" width="1.2" height="1.2" rx="0.2" fill="#000"/>
                          <rect x="21.5" y="27.5" width="1.2" height="1.2" rx="0.2" fill="#000"/>
                          {/* Shine lines */}
                          <path d="M6 24 Q8 22 9 24" stroke="#EAB307" strokeWidth="1.5" fill="none"/>
                          <path d="M5 28 Q7 26 8.5 28" stroke="#EAB307" strokeWidth="1.5" fill="none"/>
                          <path d="M35 24 Q37 22 38 24" stroke="#EAB307" strokeWidth="1.5" fill="none"/>
                          <path d="M35.5 28 Q37.5 26 39 28" stroke="#EAB307" strokeWidth="1.5" fill="none"/>
                        </svg>
                      ),
                    },
                    {
                      n: 6, yellow: false,
                      label: "Scan QR Code to Verify",
                      desc: "Scan the QR code on the jar to see the complete journey of your coffee",
                      icon: (
                        <svg viewBox="0 0 44 44" fill="none" width="42" height="42" strokeLinecap="round" strokeLinejoin="round">
                          {/* Phone body */}
                          <rect x="11" y="4" width="22" height="36" rx="4" fill="#F5F5F5" stroke="#4B4B4B" strokeWidth="1.8"/>
                          {/* Screen area */}
                          <rect x="13.5" y="8" width="17" height="24" rx="1.5" fill="#fff" stroke="#D9D9D9" strokeWidth="1"/>
                          {/* Home indicator */}
                          <line x1="19" y1="37" x2="25" y2="37" stroke="#4B4B4B" strokeWidth="2" strokeLinecap="round"/>
                          {/* QR corner squares */}
                          <rect x="15.5" y="10" width="4.5" height="4.5" rx="0.8" fill="none" stroke="#4B4B4B" strokeWidth="1.4"/>
                          <rect x="16.5" y="11" width="2.5" height="2.5" rx="0.3" fill="#4B4B4B"/>
                          <rect x="24" y="10" width="4.5" height="4.5" rx="0.8" fill="none" stroke="#4B4B4B" strokeWidth="1.4"/>
                          <rect x="25" y="11" width="2.5" height="2.5" rx="0.3" fill="#4B4B4B"/>
                          <rect x="15.5" y="18.5" width="4.5" height="4.5" rx="0.8" fill="none" stroke="#4B4B4B" strokeWidth="1.4"/>
                          <rect x="16.5" y="19.5" width="2.5" height="2.5" rx="0.3" fill="#4B4B4B"/>
                          {/* QR dots */}
                          <rect x="24" y="18.5" width="1.5" height="1.5" rx="0.2" fill="#4B4B4B"/>
                          <rect x="26.2" y="18.5" width="1.5" height="1.5" rx="0.2" fill="#4B4B4B"/>
                          <rect x="24" y="21" width="1.5" height="1.5" rx="0.2" fill="#4B4B4B"/>
                          <rect x="26.2" y="21" width="1.5" height="1.5" rx="0.2" fill="#4B4B4B"/>
                          <rect x="21.5" y="15" width="1.5" height="1.5" rx="0.2" fill="#4B4B4B"/>
                          <rect x="21.5" y="18.5" width="1.5" height="1.5" rx="0.2" fill="#4B4B4B"/>
                          <rect x="21.5" y="21" width="1.5" height="1.5" rx="0.2" fill="#4B4B4B"/>
                          {/* Scan line */}
                          <line x1="13.5" y1="24.5" x2="30.5" y2="24.5" stroke="#EAB307" strokeWidth="1.5" opacity="0.8"/>
                          {/* Signal dots */}
                          <path d="M4 18 Q6 14 8 18" stroke="#EAB307" strokeWidth="1.5" fill="none"/>
                          <path d="M2 22 Q5 16 8 22" stroke="#EAB307" strokeWidth="1.5" fill="none" opacity="0.6"/>
                          <path d="M36 18 Q38 14 40 18" stroke="#EAB307" strokeWidth="1.5" fill="none"/>
                          <path d="M36 22 Q39 16 42 22" stroke="#EAB307" strokeWidth="1.5" fill="none" opacity="0.6"/>
                        </svg>
                      ),
                    },
                  ] as { n: number; yellow: boolean; label: string; desc: string; icon: React.ReactNode }[]).map((step, i) => (
                    <div key={i} className="bp-flow-group">
                      <div className="bp-flow-step">
                        {/* Number badge */}
                        <div className={`bp-flow-num ${step.yellow ? "bp-flow-num-yellow" : "bp-flow-num-dark"}`}>
                          {step.n}
                        </div>
                        {/* Circle icon */}
                        <div className={`bp-flow-circle ${step.yellow ? "bp-flow-circle-yellow" : "bp-flow-circle-grey"}`}>
                          {step.icon}
                        </div>
                        {/* Label + desc */}
                        <p className="bp-flow-label">{step.label}</p>
                        <p className="bp-flow-desc">{step.desc}</p>
                      </div>
                      {i < 5 && <div className="bp-flow-arrow">→</div>}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </>
  );
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap');

  .bp-page { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; background: #F5F5F5; min-height: 100vh; -webkit-font-smoothing: antialiased; }

  /* Loading */
  .bp-loading { text-align: center; padding: 120px 40px; }
  .bp-spinner { width: 36px; height: 36px; border: 3px solid #D9D9D9; border-top-color: #EAB307; border-radius: 50%; animation: bpspin 0.8s linear infinite; margin: 0 auto 16px; }
  @keyframes bpspin { to { transform: rotate(360deg); } }

  /* Hero */
  .bp-hero { background: #000; color: white; padding: 60px 40px; }
  .bp-hero-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 40px; }
  .bp-commitment { font-size: 0.72rem; font-weight: 700; color: #EAB307; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; }
  .bp-hero-title { font-size: 1rem; font-weight: 400; line-height: 1.4; margin: 0 0 8px; opacity: 0.7; }
  .bp-farmer-name { font-family: 'Space Grotesk', sans-serif; font-size: 2.25rem; font-weight: 700; margin: 0 0 20px; color: #fff; letter-spacing: -0.02em; }
  .bp-organic-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(234,179,7,0.12); border: 1px solid rgba(234,179,7,0.3); border-radius: 100px; padding: 6px 16px; font-size: 0.82rem; font-weight: 600; color: #EAB307; }
  .bp-avatar-wrap { flex-shrink: 0; }
  .bp-avatar { width: 120px; height: 120px; border-radius: 50%; background: rgba(234,179,7,0.1); border: 2px solid rgba(234,179,7,0.3); display: flex; align-items: center; justify-content: center; font-size: 3.5rem; }

  /* Wrapper */
  .bp-wrapper { max-width: 1100px; margin: 0 auto; padding: 48px 40px; }
  .bp-section-title { font-size: 1.25rem; font-weight: 700; color: #000; margin: 0 0 24px; letter-spacing: -0.01em; }

  /* Details card */
  .bp-details-card { background: white; border-radius: 14px; padding: 32px; border: 1px solid #D9D9D9; margin-bottom: 32px; }
  .bp-detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 24px; }
  .bp-detail-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #4B4B4B; margin: 0 0 4px; }
  .bp-detail-val { font-size: 0.95rem; color: #000; font-weight: 500; margin: 0; }
  .bp-bio { border-top: 1px solid #D9D9D9; padding-top: 20px; margin-bottom: 20px; }
  .bp-bio-text { font-size: 0.9rem; color: #4B4B4B; line-height: 1.7; margin: 0; }
  .bp-wallet { border-top: 1px solid #D9D9D9; padding-top: 16px; }
  .bp-wallet-addr { font-family: monospace; font-size: 0.8rem; color: #4B4B4B; word-break: break-all; margin: 4px 0 0; }

  /* Map */
  .bp-map-section { margin-bottom: 40px; }
  .bp-map-placeholder { background: #FAFAFA; border-radius: 14px; height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border: 1px solid #D9D9D9; }
  .bp-map-pin { font-size: 2rem; }
  .bp-map-location { font-size: 1rem; color: #000; font-weight: 600; margin: 0; }
  .bp-map-note { font-size: 0.8rem; color: #4B4B4B; margin: 0; }

  /* Products */
  .bp-products-section { margin-bottom: 48px; }
  .bp-no-products { background: white; border-radius: 14px; padding: 32px; text-align: center; color: #4B4B4B; border: 1px solid #D9D9D9; }
  .bp-products-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .bp-product-card { background: white; border-radius: 12px; padding: 16px; border: 1px solid #D9D9D9; text-decoration: none; display: block; transition: border-color 0.2s, box-shadow 0.2s; }
  .bp-product-card:hover { border-color: #EAB307; box-shadow: 0 4px 20px rgba(234,179,7,0.12); }
  .bp-product-img { width: 100%; aspect-ratio: 1; border-radius: 8px; background: #FAFAFA; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin-bottom: 12px; }
  .bp-product-img img { width: 100%; height: 100%; object-fit: cover; }
  .bp-product-name { font-size: 0.9rem; font-weight: 700; color: #000; margin: 0 0 4px; letter-spacing: -0.01em; }
  .bp-product-origin { font-size: 0.75rem; color: #4B4B4B; margin: 0 0 6px; }
  .bp-product-price { font-size: 1rem; font-weight: 700; color: #000; margin: 0; }
  .bp-product-actions { display: flex; gap: 6px; margin-top: 10px; }
  .bp-product-btn-buy { background: #EAB307; color: #000; border: none; font-size: 0.72rem; font-weight: 600; padding: 6px 12px; border-radius: 8px; cursor: pointer; }
  .bp-product-btn-buy:hover { background: #D6A300; }
  .bp-product-btn-more { background: white; color: #000; border: 1.5px solid #D9D9D9; font-size: 0.72rem; font-weight: 600; padding: 6px 12px; border-radius: 8px; text-decoration: none; display: flex; align-items: center; }
  .bp-product-btn-more:hover { border-color: #EAB307; }

  /* Horizontal flow infographic */
  .bp-trace-section { background: #FAFAFA; border-radius: 14px; padding: 40px 32px; border: 1px solid #D9D9D9; margin-bottom: 48px; }
  .bp-trace-heading { font-family: 'Space Grotesk', sans-serif; font-size: clamp(1.75rem, 3.5vw, 2.5rem); font-weight: 700; margin: 0 0 10px; line-height: 1.1; letter-spacing: -0.02em; }
  .bp-trace-heading-yellow { color: #EAB307; }
  .bp-trace-heading-black { color: #000; }
  .bp-trace-subtitle { font-size: 0.875rem; color: #4B4B4B; margin: 0 0 36px; max-width: 540px; line-height: 1.6; }

  .bp-flow { display: flex; align-items: flex-start; gap: 0; flex-wrap: wrap; }
  .bp-flow-group { display: flex; align-items: center; gap: 0; flex: 1; min-width: 130px; }
  .bp-flow-step { display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1; position: relative; padding: 0 4px; }

  .bp-flow-num { position: absolute; top: -8px; left: 50%; transform: translateX(-50%) translateX(-32px); width: 24px; height: 24px; border-radius: 50%; font-size: 0.72rem; font-weight: 800; display: flex; align-items: center; justify-content: center; z-index: 1; }
  .bp-flow-num-yellow { background: #EAB307; color: #000; }
  .bp-flow-num-dark { background: #000; color: #EAB307; }

  .bp-flow-circle { width: 88px; height: 88px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; flex-shrink: 0; overflow: hidden; }
  .bp-flow-circle-yellow { background: #fff; border: 2.5px solid #EAB307; }
  .bp-flow-circle-grey { background: #fff; border: 2.5px solid #D9D9D9; }

  .bp-flow-label { font-size: 0.82rem; font-weight: 700; color: #000; margin: 0 0 6px; line-height: 1.3; }
  .bp-flow-desc { font-size: 0.72rem; color: #4B4B4B; margin: 0; line-height: 1.5; }

  .bp-flow-arrow { font-size: 1.25rem; color: #4B4B4B; padding: 0 4px; margin-top: 28px; flex-shrink: 0; align-self: flex-start; }

  @media (max-width: 800px) {
    .bp-hero-inner { flex-direction: column; }
    .bp-detail-grid { grid-template-columns: 1fr; }
    .bp-products-grid { grid-template-columns: 1fr 1fr; }
    .bp-flow { gap: 8px; }
    .bp-flow-group { min-width: 100px; }
    .bp-flow-circle { width: 68px; height: 68px; }
    .bp-flow-arrow { font-size: 1rem; margin-top: 28px; }
    .bp-wrapper { padding: 32px 20px; }
    .bp-hero { padding: 40px 20px; }
    .bp-trace-steps { gap: 8px; }
  }
  @media (max-width: 500px) { .bp-products-grid { grid-template-columns: 1fr; } }
`;
