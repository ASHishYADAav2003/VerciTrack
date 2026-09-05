"use client";
// app/login/page.tsx — inline nav removed, PublicNav handles it via root layout

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Login failed.");
      return;
    }

    const role = data.user.role;
    if (role === "admin")           router.push("/admin");
    else if (role === "farmer")  router.push("/farmer");
    else                            router.push("/marketplace");
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="lp-page">
        <div className="lp-wrapper">
          <div className="lp-card">

            <div className="lp-header">
              <div className="lp-logo">HAV <span>Platform</span></div>
              <h1 className="lp-title">Welcome back</h1>
              <p className="lp-subtitle">Sign in to your HAV account to continue.</p>
            </div>

            <form onSubmit={handleLogin} className="lp-form">
              <div className="lp-field">
                <label className="lp-label">Email address <span className="lp-required">*</span></label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  className="lp-input"
                  required
                />
              </div>

              <div className="lp-field">
                <label className="lp-label">Password <span className="lp-required">*</span></label>
                <div className="lp-password-wrap">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    type="password"
                    className="lp-input"
                    required
                  />
                  <Link href="/forgot-password" className="lp-forgot">Forgot password?</Link>
                </div>
              </div>

              {error && <div className="lp-error">{error}</div>}

              <button type="submit" disabled={loading} className="lp-btn">
                {loading ? "Signing in…" : "Login"}
              </button>

              <div className="lp-divider"><span>or</span></div>

              <div className="lp-footer-links">
                <p className="lp-new">
                  New customer?{" "}
                  <Link href="/register/customer" className="lp-link">Create an account</Link>
                </p>
                <Link href="/register/farmer" className="lp-bk-btn">
                  Register as a Farmer
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
  :root { --accent:#EAB307; --accent-h:#C99500; --accent-d:#D6A300; }

  .lp-page { font-family:'Inter','Segoe UI',system-ui,sans-serif; background:#FAFAFA; min-height:100vh; -webkit-font-smoothing:antialiased; }
  .lp-wrapper { display:flex; justify-content:center; padding:56px 20px; }
  .lp-card { background:white; border-radius:16px; border:1px solid #D9D9D9; padding:48px 44px; max-width:460px; width:100%; box-shadow:0 4px 24px rgba(0,0,0,0.06); }

  .lp-header { text-align:center; margin-bottom:36px; }
  .lp-logo { font-family:'Space Grotesk',sans-serif; font-size:1.1rem; font-weight:700; color:#000; margin:0 0 24px; letter-spacing:-0.01em; }
  .lp-logo span { color:#EAB307; }
  .lp-title { font-size:1.5rem; font-weight:700; color:#000; margin:0 0 8px; letter-spacing:-0.02em; }
  .lp-subtitle { font-size:0.875rem; color:#4B4B4B; margin:0; line-height:1.6; }

  .lp-form { display:flex; flex-direction:column; gap:18px; }
  .lp-field { display:flex; flex-direction:column; gap:6px; }
  .lp-label { font-size:0.75rem; font-weight:600; color:#000; text-transform:uppercase; letter-spacing:0.06em; }
  .lp-required { color:#991B1B; }
  .lp-input { width:100%; border:1.5px solid #D9D9D9; border-radius:10px; padding:13px 16px; font-size:0.9rem; font-family:'Inter',sans-serif; color:#000; background:white; outline:none; transition:border-color 0.15s; box-sizing:border-box; }
  .lp-input:focus { border-color:#EAB307; box-shadow:0 0 0 3px rgba(234,179,7,0.12); }

  .lp-password-wrap { position:relative; }
  .lp-password-wrap .lp-input { padding-right:130px; }
  .lp-forgot { position:absolute; right:14px; top:50%; transform:translateY(-50%); font-size:0.78rem; color:#4B4B4B; text-decoration:none; white-space:nowrap; }
  .lp-forgot:hover { color:#000; }

  .lp-error { background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; padding:12px 16px; font-size:0.85rem; color:#991B1B; }

  .lp-btn { background:#EAB307; color:#000; border:none; border-radius:10px; padding:15px 24px; font-size:0.95rem; font-family:'Inter',sans-serif; font-weight:600; cursor:pointer; transition:background 0.15s; width:100%; }
  .lp-btn:hover { background:#D6A300; }
  .lp-btn:disabled { opacity:0.5; cursor:not-allowed; }

  .lp-divider { display:flex; align-items:center; gap:12px; }
  .lp-divider::before, .lp-divider::after { content:''; flex:1; height:1px; background:#D9D9D9; }
  .lp-divider span { font-size:0.75rem; color:#4B4B4B; }

  .lp-footer-links { display:flex; flex-direction:column; gap:12px; align-items:center; }
  .lp-new { font-size:0.85rem; color:#4B4B4B; margin:0; }
  .lp-link { color:#000; font-weight:600; text-decoration:none; border-bottom:1.5px solid #EAB307; }
  .lp-link:hover { color:#EAB307; }

  .lp-bk-btn { display:block; text-align:center; width:100%; border:1.5px solid #D9D9D9; color:#000; border-radius:10px; padding:13px 24px; font-size:0.9rem; font-family:'Inter',sans-serif; font-weight:500; text-decoration:none; transition:all 0.15s; box-sizing:border-box; }
  .lp-bk-btn:hover { border-color:#EAB307; background:#FEFCE8; }

  @media (max-width:520px) {
    .lp-card { padding:32px 24px; }
    .lp-password-wrap .lp-input { padding-right:16px; }
    .lp-forgot { position:static; display:block; margin-top:4px; transform:none; }
  }
`;
