'use client'
// components/PublicNav.tsx
// Shared public navbar — used on all non-admin pages via app/layout.tsx

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function PublicNav() {
  const pathname  = usePathname()
  const router    = useRouter()
  const [user,    setUser]    = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    // auth_user is httpOnly — must use the /api/auth/me endpoint
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : { user: null })
      .then(data => { if (data.user) setUser(data.user) })
      .catch(() => {})
    // Read cart from localStorage
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]')
      setCartCount(cart.length)
    } catch {}
  }, [pathname])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.push('/login')
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  // Hide on admin and farmer dashboard routes — they have their own nav
  // Note: /farmer-profile is a public page and should NOT be hidden
  if (
    pathname.startsWith('/admin') ||
    pathname === '/farmer' ||
    pathname.startsWith('/farmer/')
  ) return null

  const dashboardHref =
    user?.role === 'admin'     ? '/admin' :
    user?.role === 'farmer' ? '/farmer' :
    '/customer'

  return (
    <>
      <nav className="pub-nav">
        <div className="pub-nav-inner">
          {/* Logo */}
          <Link href="/" className="pub-nav-logo">
            HAV <span>Platform</span>
          </Link>

          {/* Centre links */}
          <div className="pub-nav-links">
            <Link href="/" className={`pub-nav-link ${pathname === '/' ? 'active' : ''}`}>
              Home
            </Link>
            <Link href="/marketplace" className={`pub-nav-link ${isActive('/marketplace') ? 'active' : ''}`}>
              Products
            </Link>
            <Link href="/farmer-profile" className={`pub-nav-link ${isActive('/farmer-profile') ? 'active' : ''}`}>
              Producers
            </Link>
            <Link href="/verify" className={`pub-nav-link ${isActive('/verify') ? 'active' : ''}`}>
              Verify
            </Link>
          </div>

          {/* Right side */}
          <div className="pub-nav-right">
            {user ? (
              <>
                <Link href={dashboardHref} className="pub-nav-link">
                  Dashboard
                </Link>
                <Link href="/cart" className="pub-nav-cart">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                  {cartCount > 0 && <span className="pub-nav-cart-badge">{cartCount}</span>}
                </Link>
                <div className="pub-nav-user" onClick={() => setMenuOpen(o => !o)}>
                  <div className="pub-nav-avatar">
                    {(user.name || user.email || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="pub-nav-username">{user.name || user.email}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>

                  {menuOpen && (
                    <div className="pub-nav-dropdown">
                      <Link href={dashboardHref} className="pub-nav-dd-item" onClick={() => setMenuOpen(false)}>
                        My dashboard
                      </Link>
                      {user.role === 'farmer' && (
                        <Link href="/farmer/batches" className="pub-nav-dd-item" onClick={() => setMenuOpen(false)}>
                          My batches
                        </Link>
                      )}
                      <div className="pub-nav-dd-divider" />
                      <button className="pub-nav-dd-item pub-nav-dd-logout" onClick={logout}>
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="pub-nav-btn-ghost">Log in</Link>
                <Link href="/register/customer" className="pub-nav-btn-primary">Register</Link>
                <Link href="/cart" className="pub-nav-cart">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                  {cartCount > 0 && <span className="pub-nav-cart-badge">{cartCount}</span>}
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="pub-nav-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="pub-nav-mobile">
            <Link href="/"                className="pub-nav-mobile-link" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link href="/marketplace"      className="pub-nav-mobile-link" onClick={() => setMenuOpen(false)}>Products</Link>
            <Link href="/farmer-profile" className="pub-nav-mobile-link" onClick={() => setMenuOpen(false)}>Producers</Link>
            <Link href="/verify"            className="pub-nav-mobile-link" onClick={() => setMenuOpen(false)}>Verify</Link>
            <div className="pub-nav-mobile-divider" />
            {user ? (
              <>
                <Link href={dashboardHref} className="pub-nav-mobile-link" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <button className="pub-nav-mobile-link pub-nav-mobile-logout" onClick={logout}>Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login"             className="pub-nav-mobile-link" onClick={() => setMenuOpen(false)}>Log in</Link>
                <Link href="/register/customer" className="pub-nav-mobile-link" onClick={() => setMenuOpen(false)}>Register</Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Styles are in globals.css */}
    </>
  )
}
