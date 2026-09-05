"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CustomerRegistrationPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!firstName || !email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${firstName} ${lastName}`.trim(),
        email,
        password,
        role: "customer",
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Registration failed.");
      return;
    }

    const loginRes = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (loginRes.ok) router.push("/marketplace");
    else router.push("/login");
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="cr-page">
        <nav className="cr-nav">
          <Link href="/marketplace" className="cr-nav-logo">HAV <span>Platform</span></Link>
          <div className="cr-nav-links">
            <Link href="/marketplace">Shop</Link>
            <Link href="/farmer-profile">Producers</Link>
            <Link href="/login">Login</Link>
          </div>
        </nav>

        <div className="cr-wrapper">
          <div className="cr-card">
            <div className="cr-header">
              <div className="cr-icon"></div>
              <h1 className="cr-title">Create Account</h1>
              <p className="cr-subtitle">
                Join HAV to buy verified coffee directly from traceable producers.
              </p>
            </div>

            <form onSubmit={handleRegister} className="cr-form">
              <div className="cr-grid">
                <div className="cr-field">
                  <label className="cr-label">First name <span className="cr-required">*</span></label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Your first name" className="cr-input" required />
                </div>
                <div className="cr-field">
                  <label className="cr-label">Last name</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)}
                    placeholder="Your last name" className="cr-input" />
                </div>
              </div>

              <div className="cr-field">
                <label className="cr-label">Email address <span className="cr-required">*</span></label>
                <input value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" type="email" className="cr-input" required />
              </div>

              <div className="cr-field">
                <label className="cr-label">Password <span className="cr-required">*</span></label>
                <input value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a secure password" type="password" className="cr-input" required />
              </div>

              {error && <div className="cr-error">{error}</div>}

              <button type="submit" disabled={loading} className="cr-btn">
                {loading ? "Creating account…" : "Create Account"}
              </button>

              <div className="cr-footer-links">
                <Link href="/login" className="cr-link">Already have an account? Login</Link>
                <Link href="/register/farmer" className="cr-link">Register as a farmer instead</Link>
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
  .cr-page { font-family:'Inter','Segoe UI',system-ui,sans-serif; background:#FAFAFA; min-height:100vh; -webkit-font-smoothing:antialiased; }
  .cr-nav { background:white; border-bottom:1px solid #D9D9D9; padding:0 40px; height:60px; display:flex; align-items:center; justify-content:space-between; }
  .cr-nav-logo { font-family:'Space Grotesk',sans-serif; font-size:1.05rem; font-weight:700; color:#000; text-decoration:none; letter-spacing:-0.01em; }
  .cr-nav-logo span { color:#EAB307; }
  .cr-nav-links { display:flex; gap:24px; }
  .cr-nav-links a { font-size:0.85rem; color:#4B4B4B; text-decoration:none; font-weight:500; transition:color 0.12s; }
  .cr-nav-links a:hover { color:#000; }
  .cr-wrapper { display:flex; justify-content:center; padding:56px 20px; }
  .cr-card { background:white; border-radius:16px; border:1px solid #D9D9D9; padding:48px 44px; max-width:560px; width:100%; box-shadow:0 4px 24px rgba(0,0,0,0.06); }
  .cr-header { text-align:center; margin-bottom:36px; }
  .cr-icon { font-size:2rem; margin-bottom:12px; }
  .cr-title { font-size:1.5rem; font-weight:700; color:#000; margin:0 0 8px; letter-spacing:-0.02em; }
  .cr-subtitle { font-size:0.875rem; color:#4B4B4B; margin:0; line-height:1.6; }
  .cr-form { display:flex; flex-direction:column; gap:18px; }
  .cr-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .cr-field { display:flex; flex-direction:column; gap:6px; }
  .cr-label { font-size:0.75rem; font-weight:600; color:#000; text-transform:uppercase; letter-spacing:0.06em; }
  .cr-required { color:#991B1B; }
  .cr-input { border:1.5px solid #D9D9D9; border-radius:10px; padding:13px 16px; font-size:0.9rem; font-family:'Inter',sans-serif; color:#000; background:white; outline:none; transition:border-color 0.15s; }
  .cr-input:focus { border-color:#EAB307; box-shadow:0 0 0 3px rgba(234,179,7,0.12); }
  .cr-error { background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; padding:12px 16px; font-size:0.85rem; color:#991B1B; }
  .cr-btn { background:#EAB307; color:#000; border:none; border-radius:10px; padding:15px 24px; font-size:0.95rem; font-family:'Inter',sans-serif; font-weight:600; cursor:pointer; transition:background 0.15s; width:100%; }
  .cr-btn:hover { background:#D6A300; }
  .cr-btn:disabled { opacity:0.5; cursor:not-allowed; }
  .cr-footer-links { display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; }
  .cr-link { font-size:0.8rem; color:#4B4B4B; text-decoration:none; font-weight:500; border-bottom:1px solid #D9D9D9; }
  .cr-link:hover { color:#000; border-bottom-color:#EAB307; }
  @media (max-width:560px) { .cr-card { padding:32px 24px; } .cr-grid { grid-template-columns:1fr; } .cr-nav { padding:0 20px; } .cr-nav-links { display:none; } }
`;
