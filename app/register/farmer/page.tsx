"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function FarmerRegistrationPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [farmName, setFarmName] = useState("");
  const [location, setLocation] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !farmName) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        role: "farmer",
        farmName,
        location,
        walletAddress,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Registration failed.");
      return;
    }

    // Redirect to pending approval page instead of login
    router.push("/pending-approval");
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="br-page">

        {/* Nav */}
        <nav className="br-nav">
          <Link href="/marketplace" className="br-nav-logo">
            HAV<span> Platform</span>
          </Link>
          <div className="br-nav-links">
            <Link href="/marketplace">Products</Link>
            <Link href="/login">Login</Link>
          </div>
        </nav>

        <div className="br-wrapper">
          <div className="br-card">

            {/* Header */}
            <div className="br-header">
              <div className="br-icon"></div>
              <h1 className="br-title">Farmer Registration</h1>
              <p className="br-subtitle">
                Register as a verified producer and upload traceable coffee
                batches to the blockchain marketplace.
              </p>
            </div>

            <form onSubmit={handleRegister} className="br-form">

              <div className="br-field">
                <label className="br-label">Full name <span className="br-required">*</span></label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="br-input"
                />
              </div>

              <div className="br-field">
                <label className="br-label">Email address <span className="br-required">*</span></label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  className="br-input"
                />
              </div>

              <div className="br-grid">
                <div className="br-field">
                  <label className="br-label">Plantation / Farm name <span className="br-required">*</span></label>
                  <input
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    placeholder="e.g. Bleta Farm"
                    className="br-input"
                  />
                </div>
                <div className="br-field">
                  <label className="br-label">Farm location</label>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Prizren, Kosovo"
                    className="br-input"
                  />
                </div>
              </div>

              <div className="br-field">
                <label className="br-label">Wallet address <span className="br-optional">(optional)</span></label>
                <input
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x... — used to sign blockchain transactions"
                  className="br-input br-mono"
                />
              </div>

              <div className="br-field">
                <label className="br-label">Password <span className="br-required">*</span></label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a secure password"
                  type="password"
                  className="br-input"
                />
              </div>

              {error && (
                <div className="br-error">{error}</div>
              )}

              <button type="submit" disabled={loading} className="br-btn">
                {loading ? "Creating account…" : "Create Farmer Account"}
              </button>

              <div className="br-footer-links">
                <Link href="/login" className="br-link">
                  Already have an account? Login
                </Link>
                <Link href="/register/customer" className="br-link">
                  Register as customer instead
                </Link>
              </div>

            </form>
          </div>
        </div>
      </div>
    </>
  );
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap');

  .br-page { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; background: #FAFAFA; min-height: 100vh; -webkit-font-smoothing: antialiased; }

  .br-nav { background: white; border-bottom: 1px solid #D9D9D9; padding: 0 40px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
  .br-nav-logo { font-family: 'Space Grotesk', sans-serif; font-size: 1.05rem; font-weight: 700; color: #000; text-decoration: none; letter-spacing: -0.01em; }
  .br-nav-logo span { color: #EAB307; }
  .br-nav-links { display: flex; gap: 24px; }
  .br-nav-links a { font-size: 0.85rem; color: #4B4B4B; text-decoration: none; font-weight: 500; transition: color 0.12s; }
  .br-nav-links a:hover { color: #000; }

  .br-wrapper { display: flex; justify-content: center; padding: 56px 20px; }

  .br-card { background: white; border-radius: 16px; border: 1px solid #D9D9D9; padding: 48px 44px; max-width: 560px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }

  .br-header { text-align: center; margin-bottom: 36px; }
  .br-icon { font-size: 2rem; margin-bottom: 12px; }
  .br-title { font-size: 1.5rem; font-weight: 700; color: #000; margin: 0 0 8px; letter-spacing: -0.02em; }
  .br-subtitle { font-size: 0.875rem; color: #4B4B4B; margin: 0; line-height: 1.6; max-width: 400px; margin-left: auto; margin-right: auto; }

  .br-form { display: flex; flex-direction: column; gap: 18px; }
  .br-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .br-field { display: flex; flex-direction: column; gap: 6px; }
  .br-label { font-size: 0.75rem; font-weight: 600; color: #000; text-transform: uppercase; letter-spacing: 0.06em; }
  .br-required { color: #991B1B; }
  .br-optional { color: #4B4B4B; font-weight: 400; text-transform: none; letter-spacing: 0; }
  .br-input { border: 1.5px solid #D9D9D9; border-radius: 10px; padding: 13px 16px; font-size: 0.9rem; font-family: 'Inter', sans-serif; color: #000; background: white; outline: none; transition: border-color 0.15s; }
  .br-input:focus { border-color: #EAB307; box-shadow: 0 0 0 3px rgba(234,179,7,0.12); }
  .br-mono { font-family: monospace; font-size: 0.82rem !important; }

  .br-error { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; padding: 12px 16px; font-size: 0.85rem; color: #991B1B; }

  .br-btn { background: #EAB307; color: #000; border: none; border-radius: 10px; padding: 15px 24px; font-size: 0.95rem; font-family: 'Inter', sans-serif; font-weight: 600; cursor: pointer; transition: background 0.15s; margin-top: 4px; width: 100%; }
  .br-btn:hover { background: #D6A300; }
  .br-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .br-footer-links { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
  .br-link { font-size: 0.8rem; color: #4B4B4B; text-decoration: none; font-weight: 500; border-bottom: 1px solid #D9D9D9; }
  .br-link:hover { color: #000; border-bottom-color: #EAB307; }

  @media (max-width: 560px) {
    .br-card { padding: 32px 24px; }
    .br-grid { grid-template-columns: 1fr; }
  }
`;
