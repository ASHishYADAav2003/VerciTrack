'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import HavLogo from '@/components/HavLogo'

const NAV = [
  {
    section: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: '', exact: true },
      { href: '/admin/analytics', label: 'Analytics', icon: '' },
      { href: '/admin/lab-analytics', label: 'Lab Analytics', icon: '' },
    ],
  },
  {
    section: 'Approvals',
    items: [
      { href: '/admin/approvals', label: 'Farmers', icon: '', badge: 'pending-farmers' },
      { href: '/admin/batch-approvals', label: 'Batches', icon: '', badge: 'pending-batches' },
    ],
  },
  {
    section: 'Management',
    items: [
      { href: '/admin/farmers', label: 'All Farmers', icon: '' },
      { href: '/admin/customers', label: 'Customers', icon: '' },
      { href: '/admin/orders', label: 'Orders', icon: '' },
      { href: '/admin/marketplace', label: 'Marketplace', icon: '' },
    ],
  },
  {
    section: 'System',
    items: [
      { href: '/admin/register-batch', label: 'Register Batch', icon: '' },
      { href: '/admin/coffee-types', label: 'Coffee Types', icon: '' },
      { href: '/admin/settings', label: 'Settings', icon: '' },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [pendingFarmers, setPendingFarmers] = useState(0)
  const [pendingBatches, setPendingBatches] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    fetch('/api/admin/approvals')
      .then(r => r.json())
      // Only count farmers (not admin/customers without approvalStatus) as pending
      .then(d => setPendingFarmers((d.users || []).filter((u: any) => u.role === 'farmer' && u.approvalStatus === 'pending').length))
      .catch(() => {})
    fetch('/api/admin/batch-approvals')
      .then(r => r.json())
      .then(d => setPendingBatches((d.batches || []).filter((b: any) => b.approvalStatus === 'pending').length))
      .catch(() => {})
  }, [pathname])

  const getBadge = (key?: string) => {
    if (key === 'pending-farmers') return pendingFarmers
    if (key === 'pending-batches') return pendingBatches
    return 0
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="admin-shell">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div>
            <div className="hav-mark">HAV</div>
            <div className="hav-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(group => (
            <div key={group.section} className="nav-group">
              <div className="nav-group-label">{group.section}</div>
              {group.items.map(item => {
                const badge = getBadge(item.badge)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link ${isActive(item.href, item.exact) ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    
                    <span>{item.label}</span>
                    {badge > 0 && (
                      <span className="nav-badge">{badge}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={logout} className="logout-btn">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
            
          </button>
          <div className="topbar-breadcrumb">
            {pathname.split('/').filter(Boolean).map((seg, i, arr) => (
              <span key={i}>
                {i > 0 && <span className="breadcrumb-sep"> / </span>}
                <span className={i === arr.length - 1 ? 'breadcrumb-active' : 'breadcrumb-seg'}>
                  {seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')}
                </span>
              </span>
            ))}
          </div>
          <div className="topbar-right">
            <div className="admin-avatar">AD</div>
          </div>
        </header>

        <main className="admin-content">
          {children}
        </main>
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --accent:       #EAB307;
          --accent-h:     #C99500;
          --accent-d:     #D6A300;
          --cream:        #FAFAFA;
          --sidebar-bg:   #0A0A0A;
          --sidebar-border: rgba(255,255,255,0.08);
          --sidebar-hover:  rgba(255,255,255,0.05);
          --sidebar-active: rgba(234,179,7,0.14);
          --sidebar-text:   rgba(255,255,255,0.5);
          --sidebar-text-active: #FFFFFF;
          --bg:       #F5F5F5;
          --surface:  #FFFFFF;
          --border:   #D9D9D9;
          --text:     #000000;
          --text-muted: #4B4B4B;
          --text-faint: #888888;
          --green:    #166534; --green-bg:  #F0FDF4; --green-bd: #BBF7D0;
          --amber:    #92400E; --amber-bg:  #FFFBEB; --amber-bd: #FCD34D;
          --red:      #991B1B; --red-bg:    #FEF2F2; --red-bd:   #FECACA;
          --blue:     #1E40AF; --blue-bg:   #EFF6FF; --blue-bd:  #BFDBFE;
          --radius:    10px;
          --radius-lg: 10px;
          --sidebar-width: 216px;
          --topbar-h: 56px;
        }

        body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }

        .admin-shell { display: flex; min-height: 100vh; }

        /* Sidebar */
        .admin-sidebar {
          width: var(--sidebar-width);
          flex-shrink: 0;
          background: var(--sidebar-bg);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0; left: 0; bottom: 0;
          z-index: 50;
          transition: transform 0.22s ease;
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 16px 16px;
          border-bottom: 1px solid var(--sidebar-border);
          margin-bottom: 8px;
        }
        .hav-mark {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px; font-weight: 700; letter-spacing: -0.01em;
          color: var(--accent);
          flex-shrink: 0;
        }
        .hav-name { font-size: 13px; font-weight: 600; color: #fff; letter-spacing: -0.01em; }
        .hav-sub { font-size: 10px; color: var(--sidebar-text); margin-top: 1px; letter-spacing: 0.02em; }

        .sidebar-nav { flex: 1; overflow-y: auto; padding: 4px 0; }
        .nav-group { padding: 8px 0; border-bottom: 1px solid var(--sidebar-border); }
        .nav-group:last-child { border-bottom: none; }
        .nav-group-label {
          font-size: 10px; text-transform: uppercase; letter-spacing: .08em;
          color: rgba(255,255,255,0.3); padding: 6px 16px 4px; font-weight: 500;
        }
        .nav-link {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 16px; font-size: 13px; color: var(--sidebar-text);
          text-decoration: none; border-radius: 0;
          transition: background .12s, color .12s;
          position: relative;
        }
        .nav-link:hover { background: var(--sidebar-hover); color: rgba(255,255,255,0.85); }
        .nav-link.active {
          background: var(--sidebar-active);
          color: var(--sidebar-text-active);
          font-weight: 600;
          border-left: 2px solid var(--accent);
          padding-left: 14px;
        }
        .nav-link.active::before { display: none; }

        .nav-badge {
          margin-left: auto;
          background: #DC2626;
          color: #fff;
          font-size: 10px; font-weight: 700;
          padding: 1px 6px; border-radius: 10px;
          min-width: 18px; text-align: center;
        }

        .sidebar-footer {
          padding: 12px 16px;
          border-top: 1px solid var(--sidebar-border);
        }
        .logout-btn {
          width: 100%;
          padding: 8px;
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--sidebar-border);
          border-radius: var(--radius);
          color: var(--sidebar-text);
          font-size: 13px; cursor: pointer;
          transition: background .12s, color .12s;
        }
        .logout-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

        /* Topbar */
        .admin-main {
          margin-left: var(--sidebar-width);
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .admin-topbar {
          height: var(--topbar-h);
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center;
          padding: 0 24px; gap: 12px;
          position: sticky; top: 0; z-index: 40;
        }
        .mobile-menu-btn { display: none; background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text); }
        .topbar-breadcrumb { flex: 1; font-size: 13px; color: var(--text-muted); }
        .breadcrumb-active { color: var(--text); font-weight: 500; }
        .breadcrumb-sep { opacity: 0.4; }
        .topbar-right { display: flex; align-items: center; gap: 12px; }
        .admin-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--accent);
          color: var(--text); font-size: 11px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          border: none;
        }

        .admin-content { flex: 1; padding: 24px; }

        /* Overlay for mobile */
        .sidebar-overlay {
          display: none;
          position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 45;
        }

        /* Shared page components */
        .page-header { margin-bottom: 20px; }
        .page-title { font-size: 20px; font-weight: 600; color: var(--text); }
        .page-sub { font-size: 13px; color: var(--text-muted); margin-top: 3px; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 16px;
        }
        .stat-label { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
        .stat-val { font-size: 26px; font-weight: 600; color: var(--text); line-height: 1; }
        .stat-sub { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
        .stat-up { color: var(--green); }

        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 16px 20px;
          margin-bottom: 16px;
        }
        .card-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 14px; }
        .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }

        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }

        /* Table */
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th {
          text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: .05em; color: var(--text-muted);
          padding: 10px 12px; border-bottom: 1px solid var(--border);
        }
        td { padding: 11px 12px; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        tbody tr:hover td { background: #FAFAFA; }

        /* Pill badges */
        .pill {
          display: inline-block;
          font-size: 11px; font-weight: 500;
          padding: 2px 8px; border-radius: 4px;
          white-space: nowrap; border: 1px solid;
        }
        .pill-green  { background: var(--green-bg); color: var(--green); border-color: var(--green-bd); }
        .pill-amber  { background: var(--amber-bg); color: var(--amber); border-color: var(--amber-bd); }
        .pill-red    { background: var(--red-bg);   color: var(--red);   border-color: var(--red-bd);   }
        .pill-blue   { background: var(--blue-bg);  color: var(--blue);  border-color: var(--blue-bd);  }
        .pill-purple { background: var(--blue-bg);  color: var(--blue);  border-color: var(--blue-bd);  }
        .pill-gray   { background: #F9FAFB; color: #4B5563; border-color: #D1D5DB; }

        /* Buttons */
        .btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: var(--radius);
          font-size: 13px; font-weight: 500; cursor: pointer;
          border: 1.5px solid var(--border);
          background: var(--surface); color: var(--text);
          transition: all .12s; font-family: 'Inter', sans-serif;
        }
        .btn:hover { background: var(--cream); border-color: #BFBFBF; }
        .btn-primary { background: var(--accent); color: var(--text); border-color: var(--accent); }
        .btn-primary:hover { background: var(--accent-d); border-color: var(--accent-d); box-shadow: 0 2px 8px rgba(234,179,7,0.25); }
        .btn-gold { background: var(--accent); color: var(--text); border-color: var(--accent); }
        .btn-gold:hover { background: var(--accent-d); border-color: var(--accent-d); }
        .btn-black { background: #000; color: #fff; border-color: #000; }
        .btn-black:hover { background: #222; border-color: #222; }
        .btn-outline-yellow { background: #fff; color: var(--accent); border: 2px solid var(--accent); }
        .btn-outline-yellow:hover { background: var(--accent); color: #000; }
        .btn-danger { background: var(--red-bg); color: var(--red); border-color: var(--red-bd); }
        .btn-danger:hover { background: var(--red-bd); }
        .btn-sm { padding: 5px 12px; font-size: 12px; }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Search bar */
        .toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
        .search-input {
          flex: 1; min-width: 200px;
          padding: 8px 12px;
          border: 1px solid var(--border); border-radius: var(--radius);
          font-size: 13px; background: var(--surface); color: var(--text);
        }
        .search-input:focus { outline: none; border-color: var(--accent); }
        .filter-select {
          padding: 8px 10px;
          border: 1px solid var(--border); border-radius: var(--radius);
          font-size: 12px; background: var(--surface); color: var(--text); cursor: pointer;
        }

        /* Mono for batch IDs */
        .mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px; }

        /* Modal */
        .modal-backdrop {
          display: none;
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 200;
          align-items: center; justify-content: center;
        }
        .modal-backdrop.open { display: flex; }
        .modal {
          background: var(--surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          padding: 24px;
          width: 420px; max-width: 95vw;
          max-height: 90vh; overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }
        .modal-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: var(--text); }
        .modal-row {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 13px; padding: 8px 0;
          border-bottom: 1px solid var(--border);
        }
        .modal-row:last-of-type { border-bottom: none; }
        .modal-row-label { color: var(--text-muted); }
        .modal-row-val { color: var(--text); font-weight: 500; }
        .modal-actions { display: flex; gap: 8px; margin-top: 20px; }
        .modal-actions .btn { flex: 1; justify-content: center; }

        /* Chart bars */
        .bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 130px; }
        .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
        .bar { width: 100%; background: var(--accent); border-radius: 3px 3px 0 0; transition: opacity .15s; min-height: 4px; }
        .bar:hover { opacity: 0.8; }
        .bar-label { font-size: 10px; color: var(--text-muted); }
        .bar-val { font-size: 10px; font-weight: 600; color: var(--text); }

        /* Responsive */
        @media (max-width: 768px) {
          .admin-sidebar { transform: translateX(-100%); }
          .admin-sidebar.open { transform: translateX(0); }
          .sidebar-overlay { display: block; }
          .admin-main { margin-left: 0; }
          .mobile-menu-btn { display: block; }
          .two-col { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  )
}
