import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom';
import { Sparkles, Zap, Menu, X, LogIn, Settings } from 'lucide-react';
import './App.css';

// Import Pages
import Home from './pages/Home';
import Match from './pages/Match';
import Builder from './pages/Builder';
import CoverLetter from './pages/CoverLetter';
import Library from './pages/Library';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Pricing from './pages/Pricing';
import Checkout from './pages/Checkout';

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3030'
  : 'http://188.166.164.115:3030';

export default function App() {
  const [guestId, setGuestId] = useState('');
  const [credits, setCredits] = useState(100);
  const [menuOpen, setMenuOpen] = useState(false);

  // Profile Dropdown state
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Authentication State
  const [user, setUser] = useState<{ 
    id: string; 
    name: string; 
    email?: string; 
    avatar?: string; 
    credit: number;
    plan?: string;
    referralCode?: string;
    totalJoined?: number;
    referralLevel?: number;
    googleId?: string;
  } | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Initialize Guest Account, Auth Session and Credits
  useEffect(() => {
    // 1. Initialize Guest Device ID
    let id = localStorage.getItem('guest_id');
    if (!id) {
      id = 'guest_web_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      localStorage.setItem('guest_id', id);
    }
    setGuestId(id);

    // 2. Initialize Auth User & Token
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    let currentUser: any = null;

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        setCredits(parsedUser.credit);
        currentUser = parsedUser;
      } catch (e) {
        console.error(e);
      }
    }

    // 3. Sync Credits from Server
    async function loadCredits() {
      if (currentUser) {
        // Sync logged-in user
        try {
          const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${savedToken}` }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.user && typeof data.user.credit === 'number') {
              setCredits(data.user.credit);
              setUser(data.user);
              localStorage.setItem('auth_user', JSON.stringify(data.user));
              return;
            }
          }
        } catch (err) {
          console.log('Skipping backend user sync.');
        }
      } else {
        // Sync guest credits
        const cached = localStorage.getItem('guest_credits');
        if (cached) {
          setCredits(parseInt(cached));
        }
        try {
          const response = await fetch(`${API_URL}/api/guest/${id}/credits`);
          if (response.ok) {
            const data = await response.json();
            if (typeof data.credit === 'number') {
              setCredits(data.credit);
              localStorage.setItem('guest_credits', String(data.credit));
              return;
            }
          }
        } catch (err) {
          console.log('Skipping backend guest sync.');
        }

        if (!cached) {
          localStorage.setItem('guest_credits', '100');
          setCredits(100);
        }
      }
    }

    loadCredits();
  }, []);

  const handleLogin = (userToken: string, userData: any) => {
    localStorage.setItem('auth_token', userToken);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
    setCredits(userData.credit);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
    const cachedGuestCredits = localStorage.getItem('guest_credits');
    setCredits(cachedGuestCredits ? parseInt(cachedGuestCredits) : 100);
  };

  // Profile updates are handled inside the Profile page component

  const deductCredits = async (amount: number): Promise<boolean> => {
    const updated = Math.max(0, credits - amount);
    setCredits(updated);
    if (user) {
      const updatedUser = { ...user, credit: updated };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    } else {
      localStorage.setItem('guest_credits', String(updated));
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_URL}/api/credits/deduct`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ deviceId: guestId, amount })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.user && typeof data.user.credit === 'number') {
          setCredits(data.user.credit);
          if (user) {
            const syncedUser = { ...user, credit: data.user.credit };
            setUser(syncedUser);
            localStorage.setItem('auth_user', JSON.stringify(syncedUser));
          } else {
            localStorage.setItem('guest_credits', String(data.user.credit));
          }
        }
      }
    } catch (e) {
      console.log('Offline credit deduction succeeded locally.');
    }
    return true;
  };

  const refundCredits = async (amount: number): Promise<void> => {
    const updated = credits + amount;
    setCredits(updated);
    if (user) {
      const updatedUser = { ...user, credit: updated };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    } else {
      localStorage.setItem('guest_credits', String(updated));
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch(`${API_URL}/api/credits/refund`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ deviceId: guestId, amount })
      });
    } catch (e) {
      console.log('Offline credit refund succeeded locally.');
    }
  };

  return (
    <Router>
      <div className="app-layout">
        {/* Navigation Navbar */}
        <nav className="navbar no-print">
          <div className="container nav-container">
            <Link to="/" className="logo" onClick={() => setMenuOpen(false)}>
              <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
              Resume<span>OK</span>
            </Link>

            <div className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`}>
              <NavLink to="/match" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMenuOpen(false)}>
                Match Resume
              </NavLink>
              <NavLink to="/build" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMenuOpen(false)}>
                Resume Builder
              </NavLink>
              <NavLink to="/cover-letter" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMenuOpen(false)}>
                Cover Letter
              </NavLink>
              <NavLink to="/library" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMenuOpen(false)}>
                Library
              </NavLink>
              <NavLink to="/pricing" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMenuOpen(false)}>
                Pricing
              </NavLink>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {user ? (
                <div style={{ position: 'relative' }}>
                  <button 
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--dark-border)', cursor: 'pointer', outline: 'none' }}
                  >
                    {user.avatar ? (
                      <img src={user.avatar} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                    ) : (
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700' }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--dark-text)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.name.split(' ')[0]}
                    </span>
                  </button>

                  {profileDropdownOpen && (
                    <div 
                      className="animate-fade-in"
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '44px',
                        width: '260px',
                        backgroundColor: 'rgba(30, 41, 59, 0.75)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        padding: '20px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        textAlign: 'left'
                      }}
                    >
                      {/* Dropdown Header: Profile Identity */}
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {user.avatar ? (
                          <img src={user.avatar} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.1)' }} alt="" />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800' }}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--dark-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{user.email || 'OAuth Login'}</div>
                        </div>
                      </div>

                      {/* Dropdown Credits Pill Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))', border: '1px solid rgba(99,102,241,0.22)', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Zap className="w-4 h-4 text-indigo-400 fill-indigo-400 animate-pulse" />
                          <span style={{ fontSize: '12.5px', fontWeight: '750', color: '#a5b4fc' }}>{credits} Credits</span>
                        </div>
                        <Link 
                          to="/pricing" 
                          onClick={() => setProfileDropdownOpen(false)}
                          style={{ fontSize: '11px', fontWeight: '750', color: '#fff', textDecoration: 'none', background: 'var(--primary)', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          Buy +
                        </Link>
                      </div>

                      <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', margin: '0 -4px' }}></div>

                      {/* Dropdown Menu Items */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <Link 
                          to="/pricing"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="btn btn-secondary" 
                          style={{ width: '100%', padding: '10px 12px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '10px', border: 'none', background: 'rgba(255,255,255,0.02)', textDecoration: 'none', color: 'var(--dark-text)', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.15s ease' }}
                        >
                          <Zap className="w-4 h-4 text-indigo-400" />
                          Buy Credits
                        </Link>
                        
                        <Link 
                          to="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="btn btn-secondary" 
                          style={{ width: '100%', padding: '10px 12px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '10px', border: 'none', background: 'rgba(255,255,255,0.02)', textDecoration: 'none', color: 'var(--dark-text)', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.15s ease' }}
                        >
                          <Settings className="w-4 h-4 text-indigo-400" />
                          Account Settings
                        </Link>
                        
                        <button 
                          onClick={() => { handleLogout(); setProfileDropdownOpen(false); }}
                          className="btn" 
                          style={{ width: '100%', padding: '10px 12px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171', background: 'rgba(239, 68, 68, 0.04)', border: 'none', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.15s ease', marginTop: '6px' }}
                        >
                          <LogIn className="w-4 h-4" style={{ transform: 'rotate(180deg)' }} />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link 
                  to="/login" 
                  className="btn btn-primary" 
                  style={{ padding: '6px 14px', fontSize: '11px', borderRadius: '16px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setMenuOpen(false)}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </Link>
              )}

              <button 
                className="nav-toggle-btn"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle Menu"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </nav>

        {/* Routes definitions */}
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/match" element={<Match credits={credits} deductCredits={deductCredits} refundCredits={refundCredits} />} />
            <Route path="/build" element={<Builder />} />
            <Route path="/cover-letter" element={<CoverLetter credits={credits} deductCredits={deductCredits} refundCredits={refundCredits} />} />
            <Route path="/library" element={<Library />} />
            <Route path="/login" element={<Login onLogin={handleLogin} API_URL={API_URL} />} />
            <Route path="/profile" element={<Profile user={user} setUser={setUser} token={token} credits={credits} API_URL={API_URL} />} />
            <Route path="/pricing" element={<Pricing user={user} setUser={setUser} token={token} API_URL={API_URL} />} />
            <Route path="/checkout" element={<Checkout user={user} setUser={setUser} token={token} API_URL={API_URL} />} />
          </Routes>
        </div>

        {/* Sticky Footer */}
        <footer className="footer no-print">
          <div className="container footer-content">
            <p className="footer-text">
              © {new Date().getFullYear()} ResumeOK. Built using Google Gemini AI, 100% Private.
            </p>
            <div className="footer-links">
              <a href="https://pixflow.net/pixflow-resumeok-app-privacy-policy/" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
              <span>|</span>
              <a href="https://pixflow.net/pixflow-app-user-agreement/" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
