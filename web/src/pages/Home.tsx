import { useNavigate } from 'react-router-dom';
import { Shield, Sparkles, ChevronRight, Zap } from 'lucide-react';
import useSEO from '../hooks/useSEO';

export default function Home() {
  const navigate = useNavigate();
  useSEO(
    "Dashboard - AI Resume Builder & ATS Matcher",
    "Analyze, optimize, and build ATS-friendly resumes and cover letters using Google Gemini AI, 100% privately."
  );

  return (
    <div className="container animate-fade-in">
      {/* Hero Header */}
      <header className="hero-section">
        <div className="hero-tag">
          <Sparkles className="inline-block w-4 h-4 mr-1.5 align-middle animate-pulse" />
          AI-Powered Career Assistant
        </div>
        <h1 className="hero-title">
          Optimize Your Resume.<br />
          <span className="gradient-text">Land Your Dream Job.</span>
        </h1>
        <p className="hero-subtitle">
          ResumeOK analyzes, tailors, and builds ATS-optimized resumes and cover letters in seconds, 100% privately.
        </p>
      </header>

      {/* Grid Dashboard */}
      <div className="dashboard-grid">
        {/* Match Resume */}
        <div className="tool-card tool-card-glow-blue">
          <div>
            <div className="tool-badge" style={{ backgroundColor: 'rgba(79, 70, 229, 0.15)', color: '#a5b4fc', border: '1px solid rgba(79, 70, 229, 0.25)' }}>
              10 Credits / Scan
            </div>
            <h2 className="tool-title">Match Resume</h2>
            <p className="tool-desc">
              Paste a job post URL and compare it against your resume. Get a matching score, list of keywords, and actionable rewrite recommendations.
            </p>
          </div>
          <div className="tool-card-footer">
            <button className="btn btn-primary" onClick={() => navigate('/match')}>
              Start Matching
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        {/* Build Resume */}
        <div className="tool-card tool-card-glow-purple">
          <div>
            <div className="tool-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#a7f3d0', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              Free & Unlimited
            </div>
            <h2 className="tool-title">Resume Builder</h2>
            <p className="tool-desc">
              Create a modern, clean, and ATS-friendly resume from scratch using our step-by-step wizard. Add experiences, education, and export instantly.
            </p>
          </div>
          <div className="tool-card-footer">
            <button className="btn btn-primary" style={{ backgroundColor: '#10b981' }} onClick={() => navigate('/build')}>
              Create Resume
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        {/* Cover Letter */}
        <div className="tool-card tool-card-glow-purple">
          <div>
            <div className="tool-badge" style={{ backgroundColor: 'rgba(79, 70, 229, 0.15)', color: '#a5b4fc', border: '1px solid rgba(79, 70, 229, 0.25)' }}>
              10 Credits / Gen
            </div>
            <h2 className="tool-title">Generate Cover Letter</h2>
            <p className="tool-desc">
              Generate highly personalized cover letters matching the requirements of any job description. Completely tailored to your experience.
            </p>
          </div>
          <div className="tool-card-footer">
            <button className="btn btn-primary" onClick={() => navigate('/cover-letter')}>
              Write Cover Letter
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        {/* Library */}
        <div className="tool-card tool-card-glow-blue">
          <div>
            <div className="tool-badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#ffffff', border: '1px solid var(--dark-border)' }}>
              Your Documents
            </div>
            <h2 className="tool-title">Document Library</h2>
            <p className="tool-desc">
              Access all your uploaded resumes, built resumes, and generated cover letters. Manage, preview, share, or delete documents anytime.
            </p>
          </div>
          <div className="tool-card-footer">
            <button className="btn btn-secondary" onClick={() => navigate('/library')}>
              Open Library
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Feature stats list */}
      <div className="card" style={{ marginBottom: '80px', padding: '40px' }}>
        <h3 className="card-title" style={{ fontSize: '22px', justifyContent: 'center', marginBottom: '24px' }}>
          Why Professionals Trust ResumeOK
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', textAlign: 'left' }}>
          <div>
            <div style={{ color: '#10b981', marginBottom: '12px' }}>
              <Shield className="w-8 h-8" />
            </div>
            <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>100% Private</h4>
            <p style={{ color: 'var(--dark-text-secondary)', fontSize: '13.5px' }}>
              Your files and personal details are processed locally and are never stored permanently on our servers.
            </p>
          </div>
          <div>
            <div style={{ color: '#3b82f6', marginBottom: '12px' }}>
              <Zap className="w-8 h-8" />
            </div>
            <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>ATS Compatible</h4>
            <p style={{ color: 'var(--dark-text-secondary)', fontSize: '13.5px' }}>
              Export clean vector layout PDF documents that ATS platforms can parse and scan successfully.
            </p>
          </div>
          <div>
            <div style={{ color: '#f59e0b', marginBottom: '12px' }}>
              <Sparkles className="w-8 h-8" />
            </div>
            <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>AI-Powered Insights</h4>
            <p style={{ color: 'var(--dark-text-secondary)', fontSize: '13.5px' }}>
              Utilizes state-of-the-art Large Language Models to identify job qualification gaps and recommend exact fixes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
