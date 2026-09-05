"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [dots, setDots] = useState(".");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) {
      router.push("/login");
    }
  }, [countdown, router]);

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 600);

    const countdownInterval = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(countdownInterval);
    };
  }, []);

  return (
    <>
      <style>{STYLES}</style>
      <div className="pa-page">
        <div className="pa-wrapper">
          <div className="pa-card">
            <div className="pa-check"></div>
            <h1 className="pa-title">Account created!</h1>
            <p className="pa-subtitle">
              Your farmer account is pending admin approval. You can log in now — your profile goes live once approved.
            </p>
            <div className="pa-actions">
              <Link href="/login" className="pa-btn-primary">Go to login</Link>
            </div>
            <p className="pa-redirect">Redirecting in {countdown}s…</p>
          </div>
        </div>
      </div>
    </>
  );
}

const STYLES = `
  .pa-page { font-family: Inter, sans-serif; background: #F5F5F5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .pa-wrapper { padding: 24px; }
  .pa-card { background: #fff; border: 1px solid #D9D9D9; border-radius: 12px; padding: 36px 32px; max-width: 380px; width: 100%; text-align: center; }
  .pa-check { width: 44px; height: 44px; border-radius: 50%; background: #F0FDF4; border: 1.5px solid #BBF7D0; color: #166534; font-size: 18px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
  .pa-title { font-size: 1.1rem; font-weight: 700; color: #000; margin: 0 0 8px; }
  .pa-subtitle { font-size: 0.82rem; color: #4B4B4B; margin: 0 0 24px; line-height: 1.6; }
  .pa-actions { margin-bottom: 16px; }
  .pa-btn-primary { display: inline-block; background: #EAB307; color: #000; border-radius: 8px; padding: 10px 24px; font-size: 0.85rem; font-weight: 600; text-decoration: none; }
  .pa-btn-primary:hover { background: #C99500; }
  .pa-redirect { font-size: 0.75rem; color: #888; margin: 0; }
`;
