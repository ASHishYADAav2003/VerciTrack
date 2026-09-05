// app/farmer/layout.tsx
// Shared sidebar layout for all farmer pages
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/farmer",               label: "Dashboard"      },
  { href: "/farmer/batches",       label: "My Batches"     },
  { href: "/farmer/orders",        label: "Orders"         },
  { href: "/farmer/register-batch",label: "Register Batch" },
  { href: "/farmer/certificates",  label: "Certificates"   },
  { href: "/farmer/profile",       label: "My Profile"     },
  { href: "/marketplace",             label: "Marketplace"    },
];

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser] = useState<any>(null);
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    const raw = document.cookie.split("; ").find(r => r.startsWith("auth_user="))?.split("=").slice(1).join("=");
    if (raw) { try { setUser(JSON.parse(decodeURIComponent(raw))); } catch {} }
  }, []);

  useEffect(() => {
    fetch("/api/farmer/stats")
      .then(r => r.json())
      .then(d => setPendingOrders(d.orders?.pending ?? 0))
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="bk-shell">
      <aside className="bk-sidebar">
        <div className="bk-logo">
          <div>
            <div className="bk-mark">HAV Platform</div>
            <div className="bk-logo-sub">Farmer Portal</div>
          </div>
        </div>

        <nav className="bk-nav">
          {NAV.map(n => {
            const active = n.href === "/farmer"
              ? pathname === "/farmer"
              : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={`bk-nav-item${active ? " active" : ""}`}>
                <span>{n.label}</span>
                {n.href === "/farmer/orders" && pendingOrders > 0 && (
                  <span className="bk-badge">{pendingOrders}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="bk-sidebar-footer">
          {user && (
            <div className="bk-user-row">
              <div className="bk-avatar">{(user.name || "BK").slice(0, 2).toUpperCase()}</div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div className="bk-user-name">{user.name}</div>
                <div className="bk-user-email">{user.email}</div>
              </div>
            </div>
          )}
          <button className="bk-logout" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <div className="bk-main">{children}</div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --accent:   #EAB307;
          --accent-h: #C99500;
          --accent-d: #D6A300;
          --bg:       #F5F5F5;
          --surface:  #FFFFFF;
          --border:   #D9D9D9;
          --text:     #000000;
          --bk-muted: #4B4B4B;
          --cream:    #FAFAFA;

          /* Status */
          --green:    #166534; --green-bg:  #F0FDF4; --green-bd: #BBF7D0;
          --amber:    #92400E; --amber-bg:  #FFFBEB; --amber-bd: #FCD34D;
          --red:      #991B1B; --red-bg:    #FEF2F2; --red-bd:   #FECACA;
          --blue:     #1E40AF; --blue-bg:   #EFF6FF; --blue-bd:  #BFDBFE;

          /* Sidebar */
          --bk-sidebar:     #0A0A0A;
          --bk-border:      rgba(255,255,255,0.08);
          --bk-hover:       rgba(255,255,255,0.05);
          --bk-active-bg:   rgba(234,179,7,0.14);
          --bk-active-line: #EAB307;
          --bk-text:        rgba(255,255,255,0.5);
          --bk-text-active: #FFFFFF;

          --radius:    10px;
          --radius-lg: 10px;
          --sidebar-w: 216px;
        }
        body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }

        .bk-shell { display: flex; min-height: 100vh; }

        /* ── Sidebar ─────────────────────────────────── */
        .bk-sidebar {
          width: var(--sidebar-w); flex-shrink: 0; background: var(--bk-sidebar);
          display: flex; flex-direction: column;
          position: fixed; top: 0; left: 0; bottom: 0; z-index: 50;
        }
        .bk-logo {
          display: flex; align-items: center; gap: 10px;
          padding: 18px 16px 14px; border-bottom: 1px solid var(--bk-border); margin-bottom: 6px;
        }
        .bk-mark {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px; font-weight: 700; letter-spacing: -0.01em;
          color: var(--accent); flex-shrink: 0;
        }
        .bk-logo-name { font-size: 13px; font-weight: 600; color: #fff; letter-spacing: -.01em; }
        .bk-logo-sub  { font-size: 10px; color: var(--bk-text); margin-top: 1px; letter-spacing: 0.02em; }

        .bk-nav { flex: 1; padding: 6px 8px; overflow-y: auto; }
        .bk-nav-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 10px; margin-bottom: 1px;
          font-size: 13px; color: var(--bk-text); text-decoration: none;
          transition: background .1s, color .1s; position: relative;
          border-radius: var(--radius);
        }
        .bk-nav-item:hover { background: var(--bk-hover); color: rgba(255,255,255,0.85); }
        .bk-nav-item.active {
          background: var(--bk-active-bg); color: var(--bk-text-active); font-weight: 600;
          border-left: 2px solid var(--bk-active-line); margin-left: 0; padding-left: 8px;
        }
        .bk-badge {
          background: #DC2626; color: #fff;
          font-size: 10px; font-weight: 700; border-radius: 10px;
          padding: 1px 6px; min-width: 18px; text-align: center;
        }

        .bk-sidebar-footer { padding: 10px 12px; border-top: 1px solid var(--bk-border); }
        .bk-user-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .bk-avatar {
          width: 28px; height: 28px; border-radius: 50%; background: var(--accent);
          color: #000; font-size: 10px; font-weight: 700; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .bk-user-name  { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.9); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bk-user-email { font-size: 10px; color: var(--bk-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bk-logout {
          width: 100%; padding: 6px; background: transparent;
          border: 1px solid var(--bk-border); border-radius: var(--radius);
          color: var(--bk-text); font-size: 12px; cursor: pointer; transition: all .1s;
        }
        .bk-logout:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); }

        /* ── Main area ───────────────────────────────── */
        .bk-main { margin-left: var(--sidebar-w); flex: 1; display: flex; flex-direction: column; min-width: 0; }

        .bk-topbar {
          height: 52px; background: var(--surface); border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; position: sticky; top: 0; z-index: 40;
        }
        .bk-topbar-title { font-size: 14px; font-weight: 600; }
        .bk-topbar-sub   { font-size: 11px; color: var(--bk-muted); margin-top: 1px; }
        .bk-content { padding: 20px 24px; flex: 1; }

        /* Banners — subtle left-border style */
        .bk-banner {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 14px; border-radius: var(--radius);
          font-size: 13px; margin-bottom: 20px;
          border: 1px solid var(--border); border-left: 3px solid;
          background: var(--surface);
        }
        .bk-banner-amber { border-left-color: #D97706; color: var(--text); }
        .bk-banner-green { border-left-color: #16A34A; color: var(--text); }
        .bk-banner-red   { border-left-color: #DC2626; color: var(--text); }

        /* Stats */
        .bk-stat {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius-lg); padding: 16px 18px;
        }
        .bk-stat-val   { font-size: 26px; font-weight: 700; line-height: 1; color: var(--text); }
        .bk-stat-label { font-size: 11px; color: var(--bk-muted); margin-top: 4px; text-transform: uppercase; letter-spacing: .04em; }

        /* Section */
        .bk-section-title { font-size: 12px; font-weight: 600; margin-bottom: 10px; color: var(--bk-muted); text-transform: uppercase; letter-spacing: .05em; }

        /* Action cards */
        .bk-action-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius-lg); padding: 16px;
          text-decoration: none; color: var(--text);
          transition: border-color .15s, box-shadow .15s;
          display: flex; flex-direction: column; gap: 4px;
        }
        .bk-action-card:hover { border-color: var(--accent); box-shadow: 0 1px 8px rgba(37,99,235,0.08); }
        .bk-action-label { font-size: 13px; font-weight: 600; }
        .bk-action-sub   { font-size: 11px; color: var(--bk-muted); line-height: 1.4; }

        /* Card */
        .bk-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius-lg); overflow: hidden;
        }
        .bk-empty { text-align: center; padding: 40px 20px; color: var(--bk-muted); font-size: 13px; }

        /* Table */
        .bk-table-wrap { overflow-x: auto; }
        .bk-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .bk-table th {
          text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: .05em; color: var(--bk-muted);
          padding: 9px 14px; border-bottom: 1px solid var(--border); background: var(--cream);
        }
        .bk-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .bk-table tr:last-child td { border-bottom: none; }
        .bk-table tbody tr:hover td { background: #FAFAFA; }

        /* Buttons */
        .bk-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 8px 16px; border-radius: var(--radius);
          font-size: 13px; font-weight: 500; cursor: pointer;
          border: 1.5px solid var(--border); background: var(--surface); color: var(--text);
          text-decoration: none; transition: all .1s; white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }
        .bk-btn:hover { background: var(--cream); border-color: #BFBFBF; }
        .bk-btn-primary { background: var(--accent); color: #000; border-color: var(--accent); }
        .bk-btn-primary:hover { background: var(--accent-d); border-color: var(--accent-d); box-shadow: 0 2px 8px rgba(234,179,7,0.25); }
        .bk-btn-black { background: #000; color: #fff; border-color: #000; }
        .bk-btn-black:hover { background: #222; border-color: #222; }
        .bk-btn-gold { background: var(--accent); color: #000; border-color: var(--accent); }
        .bk-btn-gold:hover { background: var(--accent-d); border-color: var(--accent-d); }
        .bk-btn-sm { padding: 5px 12px; font-size: 12px; }

        /* Pills — border-based, low saturation */
        .pill { display: inline-block; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 4px; white-space: nowrap; border: 1px solid; }
        .pill-green { background: var(--green-bg); color: var(--green); border-color: var(--green-bd); }
        .pill-amber { background: var(--amber-bg); color: var(--amber); border-color: var(--amber-bd); }
        .pill-red   { background: var(--red-bg);   color: var(--red);   border-color: var(--red-bd);   }
        .pill-blue  { background: var(--blue-bg);  color: var(--blue);  border-color: var(--blue-bd);  }
        .pill-gray  { background: #F9FAFB; color: #4B5563; border-color: #D1D5DB; }

        .bk-mono { font-family: 'SF Mono','Fira Code',monospace; font-size: 11px; color: var(--bk-muted); }

        /* EU note — plain, no background color */
        .bk-eu-note {
          margin-top: 16px; padding: 10px 14px;
          border: 1px solid var(--border); border-left: 3px solid #D1D5DB;
          border-radius: var(--radius); font-size: 12px; color: var(--bk-muted); line-height: 1.6;
          background: var(--surface);
        }

        @media (max-width: 1024px) {
          .bk-stats        { grid-template-columns: repeat(2,1fr); }
          .bk-actions-grid { grid-template-columns: repeat(2,1fr); }
        }
        @media (max-width: 640px) {
          .bk-sidebar { display: none; }
          .bk-main    { margin-left: 0; }
        }
      `}</style>
    </div>
  );
}