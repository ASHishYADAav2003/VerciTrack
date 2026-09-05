import Link from "next/link";
import { WeightSelector, AddToCartButton } from "@/components/ProductActions";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

type CoffeeBatch = {
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
  description?: string;
  benefits?: string;
  farmerBio?: string;
  pdfHash?: string;
  certificateUrl?: string;
  image?: string;
  qualityScore?: number | null;
  qualityTier?: string | null;
};

async function getProduct(id: string): Promise<CoffeeBatch | null> {
  try {
    const res = await fetch("http://localhost:3000/api/marketplace", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const list: CoffeeBatch[] = Array.isArray(data) ? data : (data.batches ?? []);
    return list.find((b) => b.id === id || b.batchId === id) ?? null;
  } catch {
    return null;
  }
}

async function getOtherProducts(excludeBatchId: string, farmerName?: string): Promise<CoffeeBatch[]> {
  try {
    const res = await fetch("http://localhost:3000/api/marketplace", { cache: "no-store" });
    const data = await res.json();
    const list: CoffeeBatch[] = Array.isArray(data) ? data : (data.batches ?? []);
    return list.filter((p) => p.batchId !== excludeBatchId).slice(0, 3);
  } catch {
    return [];
  }
}

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Exceptional": { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0" },
  "Premium":     { bg: "#FEFCE8", text: "#854D0E", border: "#FDE68A" },
  "Very Good":   { bg: "#F8FAFC", text: "#334155", border: "#CBD5E1" },
  "Good":        { bg: "#F9FAFB", text: "#4B5563", border: "#E5E7EB" },
  "Non-Compliant": { bg: "#FFF5F5", text: "#991B1B", border: "#FECACA" },
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="pd-page">
          <div style={{ maxWidth: 600, margin: "120px auto", textAlign: "center", padding: "0 24px" }}>
            <p style={{ fontSize: "3rem", marginBottom: 16 }}>—</p>
            <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, color: "#000", marginBottom: 12 }}>
              Product not found
            </h1>
            <p style={{ color: "#4B4B4B", marginBottom: 24 }}>This batch ID doesn't exist or hasn't been approved yet.</p>
            <Link href="/marketplace" className="pd-btn-primary" style={{ display: "inline-block" }}>
              ← Back to marketplace
            </Link>
          </div>
        </div>
      </>
    );
  }

  const otherProducts = await getOtherProducts(product.batchId, product.farmerName);
  const tierStyle = product.qualityTier ? TIER_COLORS[product.qualityTier] ?? TIER_COLORS["Good"] : null;
  const jarLabel = product.jarSizeG
    ? product.jarSizeG >= 1000 ? `${product.jarSizeG / 1000}kg` : `${product.jarSizeG}g`
    : product.weight ?? null;

  return (
    <>
      <style>{STYLES}</style>
      <div className="pd-page">
        <div className="pd-wrapper">

          {/* Breadcrumb */}
          <div className="pd-breadcrumb">
            <Link href="/marketplace">Products</Link>
            <span> / </span>
            <span>{product.name}</span>
          </div>

          {/* Main product section */}
          <div className="pd-main">

            {/* Image column */}
            <div className="pd-img-col">
              <div className="pd-img-wrap">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="pd-img" />
                ) : (
                  <div className="pd-img-placeholder" />
                )}
                <div className="pd-verified-badge">Blockchain verified</div>
              </div>
            </div>

            {/* Info column */}
            <div className="pd-info-col">

              {/* Tags */}
              <div className="pd-badges">
                {product.origin && <span className="pd-badge pd-badge-origin">{product.origin}</span>}
                {product.coffeeType && <span className="pd-badge pd-badge-type">{product.coffeeType}</span>}
                {tierStyle && product.qualityTier && (
                  <span style={{
                    fontSize: "0.72rem", fontWeight: 700, padding: "4px 12px", borderRadius: 100,
                    background: tierStyle.bg, color: tierStyle.text, border: `1px solid ${tierStyle.border}`,
                  }}>
                    {product.qualityTier}{product.qualityScore ? ` · ${product.qualityScore}/100` : ""}
                  </span>
                )}
              </div>

              <h1 className="pd-title">{product.name}</h1>

              {product.farmerName && (
                <p className="pd-producer">
                  by{" "}
                  <Link href={`/farmer-profile/${encodeURIComponent(product.farmerName)}`} className="pd-producer-link">
                    {product.farmerName}
                  </Link>
                  {product.harvestYear ? ` · Harvest ${product.harvestYear}` : ""}
                </p>
              )}

              <div className="pd-price">
                {product.price ? `€${product.price}` : "Price on request"}
                {jarLabel && product.price && <span className="pd-price-unit">/ {jarLabel}</span>}
              </div>

              {/* Stock */}
              {(() => {
                const left = product.remaining ?? product.totalStock ?? 0;
                if (left <= 0) return <p className="pd-stock" style={{ color: "#DC2626" }}>Sold out</p>;
                if (product.totalStock && left <= Math.ceil(product.totalStock * 0.15))
                  return <p className="pd-stock" style={{ color: "#B45309" }}>Only {left} of {product.totalStock} jars left</p>;
                return null;
              })()}

              <p className="pd-desc">
                {product.description ||
                  "Pure, natural coffee with blockchain-verified origin and quality. Every jar comes with a traceable lab certificate confirming its authenticity."}
              </p>

              {/* Size + Add to basket */}
              <WeightSelector weight={product.weight} jarSizeG={product.jarSizeG} />
              <AddToCartButton product={product} />

              {/* Verify link — subtle */}
              <div style={{ marginTop: 16 }}>
                <Link href={`/verify/${product.batchId}`} style={{ fontSize: "0.8rem", color: "#4B4B4B", textDecoration: "none", borderBottom: "1px solid #D9D9D9", paddingBottom: 1 }}>
                  Verify authenticity →
                </Link>
              </div>

            </div>
          </div>

          {/* Info tabs — only shown if content from registration */}
          {(product.description || product.benefits || product.farmerBio || product.certificateUrl) && (
            <div className="pd-tabs-section">
              <div className="pd-tabs">
                {product.description && <span className="pd-tab pd-tab-active">Information</span>}
                {product.benefits   && <span className="pd-tab">Benefits</span>}
                {product.farmerBio && <span className="pd-tab">Farmer</span>}
              </div>
              <div className="pd-tab-content">
                <p>{product.description}</p>
                {product.certificateUrl && (
                  <a href={product.certificateUrl} target="_blank" rel="noopener noreferrer" className="pd-cert-link">
                    Download certificate (PDF)
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Other products */}
          {otherProducts.length > 0 && (
            <div className="pd-other">
              <h2 className="pd-other-title">More from our marketplace</h2>
              <div className="pd-other-grid">
                {otherProducts.map((p) => {
                  const pJarLabel = p.jarSizeG ? (p.jarSizeG >= 1000 ? `${p.jarSizeG / 1000}kg` : `${p.jarSizeG}g`) : p.weight ?? null;
                  return (
                    <Link href={`/product/${p.batchId}`} key={p.batchId} className="pd-other-card">
                      <div className="pd-other-img">
                        {p.image ? <img src={p.image} alt={p.name} /> : <div className="pd-img-placeholder" />}
                      </div>
                      <p className="pd-other-name">{p.name}</p>
                      <p className="pd-other-origin">{p.origin}{p.coffeeType ? ` · ${p.coffeeType}` : ""}</p>
                      <p className="pd-other-price">
                        {p.price ? `€${p.price}` : "—"}
                        {pJarLabel && p.price && <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#4B4B4B", marginLeft: 4 }}>/ {pJarLabel}</span>}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@700&display=swap');

  :root {
    --accent: #EAB307;
    --accent-h: #C99500;
    --text: #000000;
    --muted: #4B4B4B;
    --border: #D9D9D9;
    --bg: #FFFFFF;
    --card: #FAFAFA;
  }

  .pd-page {
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    background: var(--bg);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    color: var(--text);
  }

  .pd-wrapper { max-width: 1100px; margin: 0 auto; padding: 40px 40px 80px; }

  /* Breadcrumb */
  .pd-breadcrumb { font-size: 14px; color: var(--muted); margin-bottom: 36px; }
  .pd-breadcrumb a { color: var(--muted); text-decoration: none; }
  .pd-breadcrumb a:hover { color: var(--text); }

  /* Layout */
  .pd-main { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: start; margin-bottom: 72px; }

  /* Image */
  .pd-img-col { position: relative; }
  .pd-img-wrap { position: relative; border-radius: 20px; overflow: hidden; background: var(--card); border: 1px solid var(--border); aspect-ratio: 1; }
  .pd-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pd-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 6rem; background: #FEFCE8; }
  .pd-verified-badge { position: absolute; bottom: 16px; left: 16px; background: rgba(0,0,0,0.75); color: white; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 100px; backdrop-filter: blur(4px); letter-spacing: 0.01em; }

  /* Info */
  .pd-badges { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
  .pd-badge { font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 100px; border: 1px solid; }
  .pd-badge-origin { background: #FEFCE8; color: #854D0E; border-color: #FDE68A; }
  .pd-badge-type { background: var(--card); color: var(--muted); border-color: var(--border); }

  .pd-title { font-family: 'Inter', sans-serif; font-size: 36px; font-weight: 800; color: var(--text); margin: 0 0 8px; line-height: 1.1; letter-spacing: -0.02em; }
  .pd-producer { font-size: 14px; color: var(--muted); margin: 0 0 20px; }
  .pd-producer-link { color: var(--text); text-decoration: none; font-weight: 600; border-bottom: 1px solid var(--border); }
  .pd-producer-link:hover { border-color: var(--text); }

  .pd-price { font-size: 32px; font-weight: 700; color: var(--text); margin-bottom: 6px; letter-spacing: -0.02em; }
  .pd-price-unit { font-size: 15px; font-weight: 400; color: var(--muted); margin-left: 6px; }

  .pd-stock { font-size: 13px; color: var(--muted); margin: 0 0 16px; }
  .pd-desc { font-size: 15px; color: var(--muted); line-height: 1.7; margin-bottom: 28px; }

  /* Size selector */
  .pd-weight { margin-bottom: 20px; }
  .pd-weight-label { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
  .pd-weight-options { display: flex; gap: 8px; }
  .pd-weight-btn { border: 1.5px solid var(--border); background: var(--bg); border-radius: 8px; padding: 8px 20px; font-size: 14px; font-family: 'Inter', sans-serif; font-weight: 500; cursor: pointer; transition: all 0.15s; color: var(--text); }
  .pd-weight-btn-active { border-color: var(--accent); background: var(--accent); color: #000; font-weight: 600; }

  /* Cart row */
  .pd-cart-row { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; }
  .pd-btn-primary { background: var(--accent); color: #000; border: none; border-radius: 10px; padding: 13px 24px; font-size: 15px; font-family: 'Inter', sans-serif; font-weight: 600; cursor: pointer; transition: background 0.15s; text-decoration: none; display: inline-block; }
  .pd-btn-primary:hover { background: var(--accent-h); }
  .pd-qty { display: flex; align-items: center; border: 1.5px solid var(--border); border-radius: 10px; overflow: hidden; }
  .pd-qty-btn { background: var(--bg); border: none; padding: 10px 14px; font-size: 16px; cursor: pointer; color: var(--text); font-family: 'Inter', sans-serif; }
  .pd-qty-btn:hover { background: var(--card); }
  .pd-qty-val { padding: 0 12px; font-size: 14px; font-weight: 600; min-width: 32px; text-align: center; }

  /* Tabs — only shown when data exists */
  .pd-tabs-section { border-top: 1px solid var(--border); padding-top: 48px; margin-bottom: 72px; }
  .pd-tabs { display: flex; gap: 32px; margin-bottom: 28px; border-bottom: 1px solid var(--border); }
  .pd-tab { font-size: 15px; font-weight: 500; color: var(--muted); padding-bottom: 14px; cursor: pointer; }
  .pd-tab-active { color: var(--text); border-bottom: 2px solid var(--accent); font-weight: 600; }
  .pd-tab-content { font-size: 15px; color: var(--muted); line-height: 1.75; max-width: 640px; }
  .pd-cert-link { display: inline-block; margin-top: 20px; background: #000; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; }

  /* Other products */
  .pd-other { border-top: 1px solid var(--border); padding-top: 48px; }
  .pd-other-title { font-size: 24px; font-weight: 700; color: var(--text); margin: 0 0 28px; letter-spacing: -0.01em; }
  .pd-other-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .pd-other-card { background: var(--card); border-radius: 14px; padding: 16px; border: 1px solid var(--border); text-decoration: none; display: block; transition: border-color 0.2s, box-shadow 0.2s; }
  .pd-other-card:hover { border-color: var(--accent); box-shadow: 0 8px 24px rgba(234,179,7,0.1); }
  .pd-other-img { width: 100%; aspect-ratio: 1; border-radius: 10px; background: #FEFCE8; border: 1px solid #FDE68A; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin-bottom: 12px; }
  .pd-other-img img { width: 100%; height: 100%; object-fit: cover; }
  .pd-other-name { font-size: 14px; font-weight: 700; color: var(--text); margin: 0 0 4px; }
  .pd-other-origin { font-size: 12px; color: var(--muted); margin: 0 0 8px; }
  .pd-other-price { font-size: 16px; font-weight: 700; color: var(--text); margin: 0; }

  @media (max-width: 800px) {
    .pd-main { grid-template-columns: 1fr; gap: 32px; }
    .pd-other-grid { grid-template-columns: 1fr 1fr; }
    .pd-wrapper { padding: 24px 20px 60px; }
  }
  @media (max-width: 500px) {
    .pd-other-grid { grid-template-columns: 1fr; }
    .pd-title { font-size: 28px; }
  }
`;
