import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom';
import { ChevronDown, Menu, X, ArrowRight } from 'lucide-react';
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

// Mobile App Parity Pages
import Audit from './pages/Audit';
import Jobs from './pages/Jobs';
import JobDetails from './pages/JobDetails';
import ProfileSections from './pages/ProfileSections';
import Tasks from './pages/Tasks';
import Settings from './pages/Settings';

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3030'
  : 'http://188.166.164.115:3030';

export default function App() {
  const [credits, setCredits] = useState(100);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);

  // Authentication State
  const [user, setUser] = useState<{
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    credit: number;
    plan?: string;
  } | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem('guest_id');
    if (!id) {
      id = 'guest_web_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      localStorage.setItem('guest_id', id);
    }

    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        setCredits(parsedUser.credit);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleLogin = (userToken: string, userData: any) => {
    localStorage.setItem('auth_token', userToken);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
    setCredits(userData.credit);
  };

  const deductCredits = async (amount: number): Promise<boolean> => {
    const updated = Math.max(0, credits - amount);
    setCredits(updated);
    return true;
  };

  const refundCredits = async (amount: number): Promise<void> => {
    setCredits(credits + amount);
  };

  return (
    <Router>
      <div className="app-layout">
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
              <Link to="/" className="resumeok-brand-logo" onClick={() => setMenuOpen(false)}>
                ResumeOK
              </Link>

              {/* Desktop Left Nav Menu */}
              <div className="nav-links-left desktop-only-flex">
                <NavLink to="/jobs" className={({ isActive }) => `resumeok-nav-item ${isActive ? 'active' : ''}`}>
                  Auto Apply
                </NavLink>
                <NavLink to="/build" className={({ isActive }) => `resumeok-nav-item ${isActive ? 'active' : ''}`}>
                  AI Resume Builder
                </NavLink>
                <NavLink to="/audit" className={({ isActive }) => `resumeok-nav-item ${isActive ? 'active' : ''}`}>
                  Resume Scoring
                </NavLink>
                <NavLink to="/jobs" className={({ isActive }) => `resumeok-nav-item ${isActive ? 'active' : ''}`}>
                  Job Board
                </NavLink>
                <div className="resumeok-dropdown-wrapper">
                  <span className="resumeok-nav-item">
                    All Features <ChevronDown className="w-3 h-3 ml-0.5 inline-block opacity-75" />
                  </span>
                  <div className="resumeok-dropdown-menu">
                    <Link to="/match">Match Resume</Link>
                    <Link to="/cover-letter">Cover Letter AI</Link>
                    <Link to="/profile-sections">Profile Sections</Link>
                    <Link to="/tasks">Earn Credits</Link>
                    <Link to="/library">Library</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Right Nav Menu & CTAs */}
            <div className="nav-links-right desktop-only-flex">
              <Link to="/settings" className="resumeok-nav-item">About us</Link>
              <Link to="/pricing" className="resumeok-nav-item">Pricing</Link>
              <div className="resumeok-dropdown-wrapper">
                <span className="resumeok-nav-item">
                  Resources <ChevronDown className="w-3 h-3 ml-0.5 inline-block opacity-75" />
                </span>
                <div className="resumeok-dropdown-menu">
                  <Link to="/tasks">Daily Rewards</Link>
                  <Link to="/settings">Help & Support</Link>
                </div>
              </div>

              {/* Action Buttons & Vertical Divider */}
              <div className="resumeok-nav-actions">
                <Link to="/login" className="btn-resumeok-black">
                  Sign up for free
                </Link>
                <span className="resumeok-nav-divider"></span>
                <Link to="/login" className="btn-resumeok-outline">
                  Log in <ArrowRight className="w-3 h-3 ml-1 inline-block" />
                </Link>
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
                  <Link to="/jobs" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Auto Apply</Link>
                  <Link to="/build" onClick={() => setMenuOpen(false)} className="mobile-nav-link">AI Resume Builder</Link>
                  <Link to="/audit" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Resume Scoring</Link>
                  <Link to="/jobs" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Job Board</Link>
                  <Link to="/match" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Match Resume</Link>
                  <Link to="/cover-letter" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Cover Letter AI</Link>
                </div>

                <div className="mobile-menu-section">
                  <div className="mobile-menu-label">COMPANY & RESOURCES</div>
                  <Link to="/settings" onClick={() => setMenuOpen(false)} className="mobile-nav-link">About us</Link>
                  <Link to="/pricing" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Pricing</Link>
                  <Link to="/library" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Library</Link>
                  <Link to="/tasks" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Daily Rewards</Link>
                  <Link to="/settings" onClick={() => setMenuOpen(false)} className="mobile-nav-link">Help & Support</Link>
                </div>

                <div className="mobile-menu-actions">
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-resumeok-black full-w">
                    Sign up for free
                  </Link>
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-resumeok-outline full-w">
                    Log in <ArrowRight className="w-3.5 h-3.5 ml-1 inline-block" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Page Content Routes */}
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/match" element={<Match credits={credits} deductCredits={deductCredits} refundCredits={refundCredits} apiUrl={API_URL} />} />
            <Route path="/build" element={<Builder />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/cover-letter" element={<CoverLetter credits={credits} deductCredits={deductCredits} refundCredits={refundCredits} apiUrl={API_URL} />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetails />} />
            <Route path="/profile-sections" element={<ProfileSections />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/library" element={<Library />} />
            <Route path="/login" element={<Login onLogin={handleLogin} API_URL={API_URL} />} />
            <Route path="/profile" element={<Profile user={user} setUser={setUser} token={token} credits={credits} API_URL={API_URL} />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/checkout" element={<Checkout user={user} setUser={setUser} token={token} API_URL={API_URL} />} />
          </Routes>
        </div>

        {/* Footer */}
        <footer className="resumeok-footer no-print">
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
