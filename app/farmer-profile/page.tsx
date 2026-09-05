"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Farmer = {
  id: string;
  name: string;
  farmName?: string;
  location?: string;
  walletAddress?: string;
  status: string;
};

type Product = {
  batchId: string;
  farmerName?: string;
  coffeeType?: string;
  image?: string;
};

export default function FarmersDirectoryPage() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [bkRes, mpRes] = await Promise.all([
          fetch("/api/farmers"),        // public endpoint — approved farmers only
          fetch("/api/marketplace"),
        ]);
        const bkData = await bkRes.json();
        const mpData = await mpRes.json();
        setFarmers(bkData.farmers || []);
        // /api/marketplace returns a raw array
        setProducts(Array.isArray(mpData) ? mpData : mpData.batches || []);
      } catch {
        // non-fatal
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function getProductsForFarmer(name: string) {
    return products.filter(
      (p) => p.farmerName?.toLowerCase() === name.toLowerCase()
    );
  }

  function getCoffeeTypes(name: string): string {
    const types = getProductsForFarmer(name)
      .map((p) => p.coffeeType)
      .filter(Boolean) as string[];
    return [...new Set(types)].join(", ") || "—";
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="bkd-page">

        {/* Hero */}
        <div className="bkd-hero">
          <div className="bkd-hero-inner">
            <p className="bkd-hero-label">Our producers</p>
            <h1 className="bkd-hero-title">
              Meet the<br />
              <span>Farmers</span>
            </h1>
            <p className="bkd-hero-sub">
              Every jar of coffee is traceable back to its producer.
              These are the verified farmers on our platform —
              each batch they register is permanently recorded on the blockchain.
            </p>
          </div>
        </div>

        <div className="bkd-wrapper">

          {loading ? (
            <div className="bkd-loading">
              <div className="bkd-spinner" />
              <p>Loading producers…</p>
            </div>
          ) : farmers.length === 0 ? (
            <div className="bkd-empty">
              <p className="bkd-empty-icon"></p>
              <h2>No producers yet</h2>
              <p>
                Farmers will appear here once they register and are
                approved on the platform.
              </p>
              <Link href="/register/farmer" className="bkd-btn-primary">
                Register as a farmer
              </Link>
            </div>
          ) : (
            <>
              <p className="bkd-count">
                {farmers.length} verified producer{farmers.length !== 1 ? "s" : ""}
              </p>

              <div className="bkd-grid">
                {farmers.map((bk) => {
                  const bkProducts = getProductsForFarmer(bk.name);
                  const coffeeTypes = getCoffeeTypes(bk.name);

                  return (
                    <Link
                      key={bk.id}
                      href={`/farmer-profile/${encodeURIComponent(bk.name)}`}
                      className="bkd-card"
                    >
                      {/* Avatar */}
                      <div className="bkd-avatar">
                        <span>‍</span>
                      </div>

                      <div className="bkd-card-body">
                        <div className="bkd-card-header">
                          <h2 className="bkd-card-name">{bk.name}</h2>
                          <span className="bkd-verified-badge"> Verified</span>
                        </div>

                        {bk.farmName && (
                          <p className="bkd-card-farm">{bk.farmName}</p>
                        )}

                        <div className="bkd-card-meta">
                          {bk.location && (
                            <span className="bkd-meta-pill">
                               {bk.location}
                            </span>
                          )}
                          <span className="bkd-meta-pill">
                             {bkProducts.length} batch{bkProducts.length !== 1 ? "es" : ""}
                          </span>
                        </div>

                        {coffeeTypes !== "—" && (
                          <p className="bkd-card-types">
                            <span className="bkd-types-label">Coffee types: </span>
                            {coffeeTypes}
                          </p>
                        )}

                        <div className="bkd-card-footer">
                          <span className="bkd-view-btn">
                            View profile →
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap');

  .bkd-page { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; background: #F5F5F5; min-height: 100vh; -webkit-font-smoothing: antialiased; }

  /* Hero */
  .bkd-hero { background: #000; color: white; padding: 72px 40px 60px; }
  .bkd-hero-inner { max-width: 1100px; margin: 0 auto; }
  .bkd-hero-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #EAB307; margin-bottom: 16px; }
  .bkd-hero-title { font-family: 'Space Grotesk', sans-serif; font-size: clamp(2.25rem, 5vw, 3.25rem); font-weight: 700; line-height: 1.08; margin: 0 0 20px; letter-spacing: -0.02em; }
  .bkd-hero-title span { color: #EAB307; }
  .bkd-hero-sub { font-size: 0.95rem; color: rgba(255,255,255,0.6); max-width: 520px; line-height: 1.7; margin: 0; }

  /* Wrapper */
  .bkd-wrapper { max-width: 1100px; margin: 0 auto; padding: 48px 40px; }
  .bkd-count { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #4B4B4B; margin-bottom: 28px; }

  /* Loading */
  .bkd-loading { text-align: center; padding: 80px 0; }
  .bkd-spinner { width: 36px; height: 36px; border: 3px solid #D9D9D9; border-top-color: #EAB307; border-radius: 50%; animation: bkdspin 0.8s linear infinite; margin: 0 auto 16px; }
  @keyframes bkdspin { to { transform: rotate(360deg); } }
  .bkd-loading p { color: #4B4B4B; font-size: 0.9rem; }

  /* Empty */
  .bkd-empty { text-align: center; background: white; border-radius: 14px; padding: 64px 40px; border: 1px solid #D9D9D9; }
  .bkd-empty-icon { font-size: 3rem; margin-bottom: 16px; }
  .bkd-empty h2 { font-size: 1.25rem; font-weight: 700; color: #000; margin: 0 0 8px; letter-spacing: -0.01em; }
  .bkd-empty p { color: #4B4B4B; font-size: 0.9rem; margin: 0 0 24px; }

  /* Grid */
  .bkd-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }

  /* Card */
  .bkd-card { background: white; border-radius: 14px; border: 1px solid #D9D9D9; overflow: hidden; text-decoration: none; display: flex; flex-direction: column; transition: border-color 0.2s, box-shadow 0.2s; }
  .bkd-card:hover { border-color: #EAB307; box-shadow: 0 8px 32px rgba(234,179,7,0.12); }

  .bkd-avatar { width: 100%; aspect-ratio: 3/2; background: #0A0A0A; display: flex; align-items: center; justify-content: center; font-size: 4rem; }

  .bkd-card-body { padding: 20px; flex: 1; display: flex; flex-direction: column; gap: 10px; }

  .bkd-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .bkd-card-name { font-size: 1rem; font-weight: 700; color: #000; margin: 0; line-height: 1.3; letter-spacing: -0.01em; }
  .bkd-verified-badge { flex-shrink: 0; background: #F0FDF4; color: #166534; font-size: 0.68rem; font-weight: 700; padding: 3px 9px; border-radius: 4px; border: 1px solid #BBF7D0; white-space: nowrap; }

  .bkd-card-farm { font-size: 0.82rem; color: #4B4B4B; margin: 0; font-weight: 500; }

  .bkd-card-meta { display: flex; gap: 6px; flex-wrap: wrap; }
  .bkd-meta-pill { background: #FAFAFA; color: #4B4B4B; font-size: 0.75rem; font-weight: 500; padding: 4px 10px; border-radius: 100px; border: 1px solid #D9D9D9; }

  .bkd-card-types { font-size: 0.8rem; color: #4B4B4B; margin: 0; line-height: 1.5; }
  .bkd-types-label { font-weight: 600; color: #000; }

  .bkd-card-footer { margin-top: auto; padding-top: 12px; border-top: 1px solid #F5F5F5; }
  .bkd-view-btn { font-size: 0.82rem; font-weight: 600; color: #000; }

  /* Buttons */
  .bkd-btn-primary { background: #EAB307; color: #000; border-radius: 10px; padding: 12px 24px; font-size: 0.9rem; font-family: 'Inter', sans-serif; font-weight: 600; text-decoration: none; display: inline-block; transition: background 0.15s; }
  .bkd-btn-primary:hover { background: #D6A300; }

  @media (max-width: 900px) { .bkd-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 580px) {
    .bkd-grid { grid-template-columns: 1fr; }
    .bkd-hero { padding: 48px 20px 40px; }
    .bkd-wrapper { padding: 32px 20px; }
  }
`;
