'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X, ArrowRight } from 'lucide-react';

export default function HeaderNav() {
  const pathname = usePathname();
  const isPartnershipPage = pathname === '/partnership';

  const [menuOpen, setMenuOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);

  // Authentication State
  const [user, setUser] = useState<{
    id?: string;
    name?: string;
    email?: string;
    avatar?: string;
    credit?: number;
    plan?: string;
  } | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedToken = localStorage.getItem('auth_token') || localStorage.getItem('resumeok_token');
    const savedUser = localStorage.getItem('auth_user') || localStorage.getItem('resumeok_user');
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
      } catch (e) {}
    }

    const handleAuthChange = () => {
      const t = localStorage.getItem('auth_token') || localStorage.getItem('resumeok_token');
      const u = localStorage.getItem('auth_user') || localStorage.getItem('resumeok_user');
      if (t && u) {
        try {
          setToken(t);
          setUser(JSON.parse(u));
        } catch(e) {}
      } else {
        setToken(null);
        setUser(null);
      }
    };

    window.addEventListener('storage', handleAuthChange);
    return () => window.removeEventListener('storage', handleAuthChange);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('resumeok_token');
    localStorage.removeItem('resumeok_user');
    setToken(null);
    setUser(null);
    window.postMessage({ type: 'APPLYDESK_AUTH_LOGOUT' }, '*');
  };

  if (isPartnershipPage) return null;

  return (
    <>
      {/* 1. Top Announcement Bar */}
      {bannerVisible && (
        <div className="top-announcement-bar no-print">
          <div className="announcement-content">
            <span>14 job seekers landed offers this week 👏 </span>
            <a href="#stories" className="announcement-link">See their stories</a>
          </div>
          <button className="announcement-close-btn" onClick={() => setBannerVisible(false)} aria-label="Close">
            ✕
          </button>
        </div>
      )}

      {/* 2. Top Navigation Bar */}
      <nav className="navbar no-print">
        <div className="nav-container-resumeok">
          <div className="nav-brand-group">
            {/* Logo */}
            <Link href="/" className="resumeok-brand-logo" onClick={() => setMenuOpen(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <img src="/assets/extension-logo.svg" alt="ApplyDesk Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'contain' }} />
              <span>ApplyDesk</span>
            </Link>

            {/* Desktop Left Nav Menu */}
            <div className="nav-links-left desktop-only-flex">
              <Link href="/jobs" className={`resumeok-nav-item ${pathname === '/jobs' ? 'active' : ''}`}>
                Auto Apply
              </Link>
              <Link href="/build" className={`resumeok-nav-item ${pathname === '/build' ? 'active' : ''}`}>
                AI Resume Builder
              </Link>
              <Link href="/audit" className={`resumeok-nav-item ${pathname === '/audit' ? 'active' : ''}`}>
                Resume Scoring
              </Link>
              <Link href="/jobs" className={`resumeok-nav-item ${pathname === '/jobs' ? 'active' : ''}`}>
                Job Board
              </Link>
              <div className="resumeok-dropdown-wrapper">
                <span className="resumeok-nav-item">
                  All Features <ChevronDown className="w-3 h-3 ml-0.5 inline-block opacity-75" />
                </span>
                <div className="resumeok-dropdown-menu">
                  <Link href="/match">Match Resume</Link>
                  <Link href="/cover-letter">Cover Letter AI</Link>
                  <Link href="/profile-sections">Profile Sections</Link>
                  <Link href="/tasks">Earn Credits</Link>
                  <Link href="/library">Library</Link>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Right Nav Menu & CTAs */}
          <div className="nav-links-right desktop-only-flex">
            <Link href="/settings" className="resumeok-nav-item">About us</Link>
            <Link href="/pricing" className={`resumeok-nav-item ${pathname === '/pricing' ? 'active' : ''}`}>Pricing</Link>
            <div className="resumeok-dropdown-wrapper">
              <span className="resumeok-nav-item">
                Resources <ChevronDown className="w-3 h-3 ml-0.5 inline-block opacity-75" />
              </span>
              <div className="resumeok-dropdown-menu">
                <Link href="/partnership">Partner Program</Link>
                <Link href="/tasks">Daily Rewards</Link>
                <Link href="/settings">Help & Support</Link>
              </div>
            </div>

            {/* Action Buttons & Vertical Divider */}
            <div className="resumeok-nav-actions">
              {user || token ? (
                <>
                  <Link href="/profile" className="btn-resumeok-black" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#ffffff', color: '#0f172a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
                      {((user?.name || 'U')[0]).toUpperCase()}
                    </span>
                    <span>{user?.name || 'Profile'}</span>
                  </Link>
                  <span className="resumeok-nav-divider"></span>
                  <button onClick={handleLogout} className="btn-resumeok-outline" style={{ cursor: 'pointer' }}>
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-resumeok-black">
                    Sign up for free
                  </Link>
                  <span className="resumeok-nav-divider"></span>
                  <Link href="/login" className="btn-resumeok-outline">
                    Log in <ArrowRight className="w-3 h-3 ml-1 inline-block" />
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            className="nav-toggle-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle Menu"
          >
            {menuOpen ? <X className="w-6 h-6 text-black" /> : <Menu className="w-6 h-6 text-black" />}
          </button>
        </div>

        {/* Professional Mobile Drawer Overlay Menu */}
        {menuOpen && (
          <div className="mobile-drawer-overlay no-print" onClick={() => setMenuOpen(false)}>
            <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-menu-section">
                <div className="mobile-menu-label">FEATURES</div>
                <Link href="/jobs" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Auto Apply</Link>
                <Link href="/build" onClick={() => setMenuOpen(false)} className="mobile-nav-link">AI Resume Builder</Link>
                <Link href="/audit" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Resume Scoring</Link>
                <Link href="/jobs" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Job Board</Link>
                <Link href="/match" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Match Resume</Link>
                <Link href="/cover-letter" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Cover Letter AI</Link>
              </div>

              <div className="mobile-menu-section">
                <div className="mobile-menu-label">COMPANY & RESOURCES</div>
                <Link href="/partnership" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Partner Program</Link>
                <Link href="/settings" onClick={() => setMenuOpen(false)} className="mobile-nav-link">About us</Link>
                <Link href="/pricing" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Pricing</Link>
                <Link href="/library" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Library</Link>
                <Link href="/tasks" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Daily Rewards</Link>
                <Link href="/settings" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Help & Support</Link>
              </div>

              <div className="mobile-menu-actions">
                {user || token ? (
                  <>
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="btn-resumeok-black full-w">
                      Profile ({user?.name || 'Account'})
                    </Link>
                    <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="btn-resumeok-outline full-w" style={{ marginTop: '8px', cursor: 'pointer' }}>
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMenuOpen(false)} className="btn-resumeok-black full-w">
                      Sign up for free
                    </Link>
                    <Link href="/login" onClick={() => setMenuOpen(false)} className="btn-resumeok-outline full-w">
                      Log in <ArrowRight className="w-3.5 h-3.5 ml-1 inline-block" />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
