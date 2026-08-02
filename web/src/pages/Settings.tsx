import { useState } from 'react';
import { Settings as SettingsIcon, User, Bug, Check } from 'lucide-react';
import useSEO from '../hooks/useSEO';

export default function Settings() {
  useSEO("Account Settings - ResumeOK", "Manage account preferences, privacy settings, themes, and referral details.");

  const [theme, setTheme] = useState('dark');
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [bugSubmitted, setBugSubmitted] = useState(false);

  const handleReportBug = () => {
    if (!bugDescription.trim()) return;
    setBugSubmitted(true);
    setTimeout(() => {
      setBugSubmitted(false);
      setShowBugModal(false);
      setBugDescription('');
    }, 2000);
  };

  return (
    <div className="container page-wrapper animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Account & App Settings</h1>
        <p className="page-subtitle">Manage preferences, privacy settings, data clearing, and bug reporting.</p>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Account Details */}
        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User className="w-5 h-5 text-indigo-400" /> User Account
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>Alex Turner</div>
              <div style={{ fontSize: '13px', color: 'var(--dark-text-secondary)' }}>alex.turner@example.com</div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', padding: '4px 12px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
              Pro Plan
            </span>
          </div>
        </div>

        {/* Preferences */}
        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SettingsIcon className="w-5 h-5 text-amber-400" /> Preferences
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>Interface Theme</div>
              <div style={{ fontSize: '13px', color: 'var(--dark-text-secondary)' }}>Choose your preferred color theme</div>
            </div>
            <select value={theme} onChange={e => setTheme(e.target.value)} style={{ width: 'auto', padding: '8px 16px' }}>
              <option value="dark">Dark Mode (Default)</option>
              <option value="light">Light Mode</option>
            </select>
          </div>
        </div>

        {/* Support & Bugs */}
        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bug className="w-5 h-5 text-purple-400" /> Support & Feedback
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>Report an Issue</div>
              <div style={{ fontSize: '13px', color: 'var(--dark-text-secondary)' }}>Found a bug or have feedback for our engineering team?</div>
            </div>
            <button className="btn btn-secondary" onClick={() => setShowBugModal(true)}>
              Report Bug
            </button>
          </div>
        </div>
      </div>

      {/* Bug Report Modal */}
      {showBugModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Report a Bug</h2>
            {bugSubmitted ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Check className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Thank You!</h3>
                <p style={{ fontSize: '14px', color: 'var(--dark-text-secondary)' }}>Your bug report has been submitted successfully.</p>
              </div>
            ) : (
              <>
                <textarea
                  rows={5}
                  placeholder="Describe what happened and how to reproduce it..."
                  value={bugDescription}
                  onChange={e => setBugDescription(e.target.value)}
                  style={{ marginBottom: '20px' }}
                />
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowBugModal(false)}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleReportBug}>Submit Report</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
