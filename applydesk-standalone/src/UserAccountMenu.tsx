import { useState, useEffect, useRef } from 'react';
import './user-account-menu.css';
import PricingModal from './PricingModal';

export type ModalView = 'upgrade' | 'account' | 'ai-settings' | 'billing' | 'community' | 'privacy' | null;

interface UserAccountMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onOpenModal: (view: ModalView) => void;
  onLogout: () => void;
}

import figmaAvatar from './assets/dashboard/figma-user-avatar.png';

// Fallback avatar if user has no avatar set (matches the Figma design portrait)
const DEFAULT_AVATAR = figmaAvatar;

const resolveAvatar = (av: any): string => {
  if (typeof av === 'string' && av.trim() && !av.includes('undefined') && !av.includes('null') && av !== 'User Avatar' && av !== 'User' && !av.startsWith('blob:null')) {
    return av.trim();
  }
  return DEFAULT_AVATAR;
};

export function UserAccountPopover({ isOpen, onClose, user, onOpenModal, onLogout }: UserAccountMenuProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const userName = user?.name || user?.fullName || "Avery Miller";
  const userEmail = user?.email || "Avmiller28@gmail.com";
  const avatarUrl = resolveAvatar(user?.avatar || user?.photoURL);
  const creditsRemaining = typeof user?.credit === 'number' 
    ? user.credit 
    : (typeof user?.credits === 'number' 
        ? user.credits 
        : parseInt(localStorage.getItem('applydesk_credits') || '0', 10));
  const maxCredits = Math.max(creditsRemaining, 6);
  const progressPercent = Math.min(100, Math.max(15, (creditsRemaining / maxCredits) * 100));

  const planTitle = user?.plan
    ? (user.plan.toLowerCase().includes('plan') ? user.plan : `${user.plan} Plan`)
    : "Free Plan";

  return (
    <>
      <div
        className="uap-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 998,
          background: 'transparent'
        }}
      />
      <div className="user-account-popover" ref={popoverRef} style={{ zIndex: 999 }}>
        {/* User Header */}
        <div className="uap-user-header">
          <img
            src={avatarUrl}
            alt={userName}
            className="uap-avatar-img"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== DEFAULT_AVATAR) {
                target.onerror = null;
                target.src = DEFAULT_AVATAR;
              }
            }}
          />
          <div className="uap-user-meta">
            <span className="uap-user-name">{userName}</span>
            <span className="uap-user-email">{userEmail}</span>
          </div>
          <button
            onClick={onClose}
            className="uap-close-btn"
            aria-label="Close menu"
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              fontSize: '15px',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

      {/* Credits & Plan */}
      <div className="uap-credits-section">
        <div className="uap-credits-header">
          <span className="uap-credits-title">Credits</span>
          <span className="uap-plan-badge">{planTitle}</span>
        </div>

        {/* Progress Bar */}
        <div className="uap-progress-row">
          <div className="uap-progress-track">
            <div className="uap-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="uap-credits-count">
            <span>{creditsRemaining}</span>
            <svg className="uap-star-icon" viewBox="0 0 24 24">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </div>
        </div>

        <p className="uap-replenish-note">Your daily energy will replenish in 24h.</p>

        {/* Upgrade Plan Button */}
        <button
          className="uap-btn-upgrade"
          onClick={() => {
            onClose();
            onOpenModal('upgrade');
          }}
        >
          Upgrade Plan
        </button>
      </div>

      {/* Menu Items */}
      <div className="uap-menu-list">
        {/* Account */}
        <button
          className="uap-menu-item"
          onClick={() => {
            onClose();
            onOpenModal('account');
          }}
        >
          <span className="uap-menu-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="7" r="4" />
              <path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />
            </svg>
          </span>
          <span>Account</span>
        </button>

        {/* AI Settings */}
        <button
          className="uap-menu-item"
          onClick={() => {
            onClose();
            onOpenModal('ai-settings');
          }}
        >
          <span className="uap-menu-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="2" y="6" width="20" height="12" rx="6" />
              <circle cx="16" cy="12" r="3.2" fill="currentColor" />
            </svg>
          </span>
          <span>AI Settings</span>
        </button>

        {/* Billing */}
        <button
          className="uap-menu-item"
          onClick={() => {
            onClose();
            onOpenModal('billing');
          }}
        >
          <span className="uap-menu-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="3" />
              <line x1="2" y1="10" x2="22" y2="10" />
              <circle cx="17" cy="15" r="1.5" fill="currentColor" />
            </svg>
          </span>
          <span>Billing</span>
        </button>

        {/* Community */}
        <button
          className="uap-menu-item"
          onClick={() => {
            onClose();
            onOpenModal('community');
          }}
        >
          <span className="uap-menu-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <circle cx="8" cy="10" r="0.75" fill="currentColor" />
              <circle cx="12" cy="10" r="0.75" fill="currentColor" />
              <circle cx="16" cy="10" r="0.75" fill="currentColor" />
            </svg>
          </span>
          <span>Community</span>
        </button>

        {/* Privacy Policy */}
        <button
          className="uap-menu-item"
          onClick={() => {
            onClose();
            onOpenModal('privacy');
          }}
        >
          <span className="uap-menu-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </span>
          <span>Privacy Policy</span>
        </button>

        <div className="uap-menu-divider" />

        {/* Log Out */}
        <button
          className="uap-menu-item logout"
          onClick={() => {
            onClose();
            onLogout();
          }}
        >
          <span className="uap-menu-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>
          <span>Log Out</span>
        </button>
      </div>
    </div>
  </>
);
}

// ============================================================================
// MODAL DIALOGS MANAGER
// ============================================================================

interface AccountModalsProps {
  activeModal: ModalView;
  onClose: () => void;
  user: any;
  onOpenModal?: (view: ModalView) => void;
  onUpdateUser?: (updated: any) => void;
  onLogout?: () => void;
}

export function AccountModalsManager({ activeModal, onClose, user, onOpenModal, onUpdateUser, onLogout }: AccountModalsProps) {
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // AI settings state
  const [aiTone, setAiTone] = useState<'impactful' | 'executive' | 'technical' | 'conversational'>('impactful');
  const [autoTailor, setAutoTailor] = useState(true);
  const [autoCoverLetter, setAutoCoverLetter] = useState(true);
  const [atsThreshold, setAtsThreshold] = useState(75);
  const [customInstructions, setCustomInstructions] = useState(
    'Highlight full-stack experience with React and TypeScript. Keep descriptions concise and quantify business impact where possible.'
  );

  // Account state
  const [accountName, setAccountName] = useState(user?.name || 'Avery Miller');
  const [accountEmail] = useState(user?.email || 'Avmiller28@gmail.com');
  const [accountTitle, setAccountTitle] = useState('Senior Product Designer / Developer');
  const [accountLocation, setAccountLocation] = useState('San Francisco, CA');

  if (!activeModal) return null;

  const showSaveToast = (msg: string) => {
    setSaveSuccessMessage(msg);
    setTimeout(() => setSaveSuccessMessage(''), 3000);
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText('https://applydesk.io/join?ref=AVERY88');
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  // If upgrade/pricing modal is active, render the Figma pixel-perfect PricingModal
  if (activeModal === 'upgrade') {
    return (
      <PricingModal
        isOpen={true}
        onClose={onClose}
        onPlanSelected={() => {
          if (onOpenModal) onOpenModal(null);
        }}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        
        {/* ======================= 2. ACCOUNT MODAL ======================= */}
        {activeModal === 'account' && (
          <>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Account Settings</h3>
                <p>Manage your profile photo, personal information, and credentials.</p>
              </div>
              <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
            </div>

            <div className="modal-body">
              {/* Avatar Row */}
              <div className="account-avatar-row">
                <img
                  src={resolveAvatar(user?.avatar || user?.photoURL)}
                  alt="Avatar"
                  className="account-large-avatar"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== DEFAULT_AVATAR) {
                      target.onerror = null;
                      target.src = DEFAULT_AVATAR;
                    }
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <label className="btn-secondary" style={{ padding: '8px 14px', fontSize: '12.5px', cursor: 'pointer' }}>
                      Change Avatar
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={() => showSaveToast('Avatar uploaded successfully')} />
                    </label>
                    <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '12.5px', color: '#ef4444' }} onClick={() => showSaveToast('Avatar removed')}>
                      Remove
                    </button>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#9ca3af' }}>JPG, GIF or PNG. Max size 2MB.</span>
                </div>
              </div>

              {/* Personal Info */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={accountEmail}
                    disabled
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Target Job Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={accountTitle}
                    onChange={(e) => setAccountTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Location / Timezone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={accountLocation}
                    onChange={(e) => setAccountLocation(e.target.value)}
                  />
                </div>
              </div>

              {/* Connected Accounts */}
              <div>
                <h4 style={{ fontSize: '13.5px', fontWeight: 600, margin: '0 0 10px 0', color: '#111827' }}>Connected Accounts</h4>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12.5px', fontWeight: 500 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.17 3.66-9.14z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.36 7.35 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.41l4.02-3.13z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.64 1.26 6.59l4.02 3.13c.95-2.83 3.6-4.97 6.72-4.97z"/></svg>
                    Google Connected
                    <span style={{ color: '#10b981', fontWeight: 700, fontSize: '11px' }}>✓</span>
                  </div>
                  <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '12.5px' }} onClick={() => showSaveToast('LinkedIn integration opened')}>
                    + Connect LinkedIn
                  </button>
                </div>
              </div>

              {/* Sign Out Section */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>Sign Out</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Log out of this browser session and all connected extension tabs</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ color: '#ef4444', borderColor: '#fca5a5', fontWeight: 600, padding: '7px 16px', fontSize: '12.5px' }}
                  onClick={() => {
                    if (onLogout) onLogout();
                  }}
                >
                  Log Out
                </button>
              </div>

              {/* Danger Zone */}
              <div className="danger-zone-box">
                <div>
                  <h4>Delete Account</h4>
                  <p>Permanently remove your account, profile, and all saved resumes.</p>
                </div>
                <button
                  className="btn-danger"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete your account? This action is permanent and cannot be undone.')) {
                      alert('Account deletion initiated.');
                    }
                  }}
                >
                  Delete Account
                </button>
              </div>
            </div>

            <div className="modal-footer">
              {saveSuccessMessage && (
                <span style={{ fontSize: '12.5px', color: '#10b981', fontWeight: 600, marginRight: 'auto' }}>
                  ✓ {saveSuccessMessage}
                </span>
              )}
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button
                className="btn-primary"
                onClick={() => {
                  if (onUpdateUser) {
                    onUpdateUser({ ...user, name: accountName });
                  }
                  showSaveToast('Profile changes saved successfully!');
                }}
              >
                Save Changes
              </button>
            </div>
          </>
        )}

        {/* ======================= 3. AI SETTINGS MODAL ======================= */}
        {activeModal === 'ai-settings' && (
          <>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>AI & Tailoring Settings</h3>
                <p>Customize the tone, strictness, and autonomous actions of the ApplyDesk AI engine.</p>
              </div>
              <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
            </div>

            <div className="modal-body">
              {/* Tone Selection */}
              <div>
                <div className="settings-section-title">Resume & Cover Letter Tone</div>
                <div className="tone-cards-row">
                  <div
                    className={`tone-card ${aiTone === 'impactful' ? 'active' : ''}`}
                    onClick={() => setAiTone('impactful')}
                  >
                    <div className="tone-title">Direct & Impactful</div>
                    <div className="tone-desc">Action-oriented, quantified metrics (Recommended)</div>
                  </div>
                  <div
                    className={`tone-card ${aiTone === 'executive' ? 'active' : ''}`}
                    onClick={() => setAiTone('executive')}
                  >
                    <div className="tone-title">Executive</div>
                    <div className="tone-desc">Leadership, strategic vision & cross-functional scope</div>
                  </div>
                  <div
                    className={`tone-card ${aiTone === 'technical' ? 'active' : ''}`}
                    onClick={() => setAiTone('technical')}
                  >
                    <div className="tone-title">Technical</div>
                    <div className="tone-desc">In-depth frameworks, tooling & architectural depth</div>
                  </div>
                  <div
                    className={`tone-card ${aiTone === 'conversational' ? 'active' : ''}`}
                    onClick={() => setAiTone('conversational')}
                  >
                    <div className="tone-title">Warm & Human</div>
                    <div className="tone-desc">Natural storytelling, team culture fit & passions</div>
                  </div>
                </div>
              </div>

              {/* ATS Threshold Slider */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Minimum ATS Target Score</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#ff4d15' }}>{atsThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="95"
                  value={atsThreshold}
                  onChange={(e) => setAtsThreshold(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#ff4d15', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  <span>Balanced (60%)</span>
                  <span>Target Standard (75%+)</span>
                  <span>Strict ATS Perfection (95%)</span>
                </div>
              </div>

              {/* Feature Toggles */}
              <div>
                <div className="settings-section-title">Autonomous Application Preferences</div>
                
                <div className="toggle-setting-row">
                  <div className="toggle-info">
                    <h4>Auto-tailor Resume on 1-Click Apply</h4>
                    <p>Dynamically insert relevant job keywords before applying via the Chrome extension.</p>
                  </div>
                  <label className="switch-control">
                    <input type="checkbox" checked={autoTailor} onChange={(e) => setAutoTailor(e.target.checked)} />
                    <span className="switch-slider" />
                  </label>
                </div>

                <div className="toggle-setting-row">
                  <div className="toggle-info">
                    <h4>Draft Matching Cover Letter</h4>
                    <p>Generate a customized 3-paragraph cover letter tailored to the company's mission.</p>
                  </div>
                  <label className="switch-control">
                    <input type="checkbox" checked={autoCoverLetter} onChange={(e) => setAutoCoverLetter(e.target.checked)} />
                    <span className="switch-slider" />
                  </label>
                </div>
              </div>

              {/* Custom Guidelines */}
              <div className="form-group">
                <label className="form-label">Custom Instructions for AI (System Prompt Guidelines)</label>
                <textarea
                  rows={3}
                  className="form-input"
                  style={{ height: 'auto', padding: '10px 12px', resize: 'vertical' }}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Always emphasize my 5 years of React experience and never suggest relocation..."
                />
              </div>
            </div>

            <div className="modal-footer">
              {saveSuccessMessage && (
                <span style={{ fontSize: '12.5px', color: '#10b981', fontWeight: 600, marginRight: 'auto' }}>
                  ✓ {saveSuccessMessage}
                </span>
              )}
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={() => showSaveToast('AI settings saved successfully!')}>
                Save Preferences
              </button>
            </div>
          </>
        )}

        {/* ======================= 4. BILLING MODAL ======================= */}
        {activeModal === 'billing' && (
          <>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Billing & Invoices</h3>
                <p>View your active subscription, payment method, and receipts.</p>
              </div>
              <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
            </div>

            <div className="modal-body">
              {/* Current Plan Card */}
              <div className="billing-current-plan-card">
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Current Plan</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>{user?.plan || "Free Starter Tier"}</div>
                  <div style={{ fontSize: '12.5px', color: '#64748b' }}>4 of 6 Daily AI Credits remaining • Next daily replenish in 24 hours</div>
                </div>
                <button className="btn-primary" onClick={() => onOpenModal?.('upgrade')}>
                  Upgrade Plan
                </button>
              </div>

              {/* Payment Method */}
              <div>
                <h4 style={{ fontSize: '13.5px', fontWeight: 600, margin: '0 0 10px 0', color: '#111827' }}>Payment Method</h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '26px', background: '#0f172a', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '11px', fontWeight: 700 }}>
                      VISA
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Visa ending in 4242</div>
                      <div style={{ fontSize: '11.5px', color: '#6b7280' }}>Expires 08/2028</div>
                    </div>
                  </div>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => showSaveToast('Stripe card manager opened')}>
                    Update Card
                  </button>
                </div>
              </div>

              {/* Invoices */}
              <div>
                <h4 style={{ fontSize: '13.5px', fontWeight: 600, margin: '0 0 10px 0', color: '#111827' }}>Invoice History</h4>
                <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <table className="invoices-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Oct 01, 2026</td>
                        <td>Free Plan Allowance (Monthly)</td>
                        <td>$0.00</td>
                        <td><span className="status-badge-paid">Paid</span></td>
                        <td><a href="#receipt" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Download PDF</a></td>
                      </tr>
                      <tr>
                        <td>Sep 01, 2026</td>
                        <td>Free Plan Allowance (Monthly)</td>
                        <td>$0.00</td>
                        <td><span className="status-badge-paid">Paid</span></td>
                        <td><a href="#receipt" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Download PDF</a></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={onClose}>Close</button>
            </div>
          </>
        )}

        {/* ======================= 5. COMMUNITY MODAL ======================= */}
        {activeModal === 'community' && (
          <>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>ApplyDesk Community & Network</h3>
                <p>Connect with 25,000+ job seekers, share interview strategies, and earn free AI credits.</p>
              </div>
              <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
            </div>

            <div className="modal-body">
              {/* Refer & Earn Hero */}
              <div className="community-hero-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#f59e0b', color: '#000', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>REWARD</span>
                  <h3>Refer a Friend & Earn 50 Energy Credits</h3>
                </div>
                <p>Share your personal invite link. When a friend signs up, you both get 50 bonus AI resume tailoring credits instantly!</p>
                <div className="referral-link-box">
                  <input
                    type="text"
                    readOnly
                    className="referral-link-input"
                    value="https://applydesk.io/join?ref=AVERY88"
                  />
                  <button
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px', background: copiedReferral ? '#10b981' : '#ffffff', color: copiedReferral ? '#fff' : '#000000' }}
                    onClick={copyReferralCode}
                  >
                    {copiedReferral ? 'Copied! ✓' : 'Copy Link'}
                  </button>
                </div>
              </div>

              {/* Channels Grid */}
              <div className="community-grid">
                <div className="community-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', background: '#5865F2', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#111827' }}>ApplyDesk Discord</div>
                      <div style={{ fontSize: '11.5px', color: '#6b7280' }}>14,200+ members online</div>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#4b5563', lineHeight: 1.4 }}>
                    Live job drops, resume feedback critiques, and peer mock interviews with tech professionals.
                  </p>
                  <a
                    href="https://discord.gg/applydesk"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                    style={{ textAlign: 'center', textDecoration: 'none', fontSize: '12px', marginTop: 'auto' }}
                  >
                    Join Discord Server
                  </a>
                </div>

                <div className="community-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', background: '#0A66C2', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#111827' }}>LinkedIn Group</div>
                      <div style={{ fontSize: '11.5px', color: '#6b7280' }}>Weekly Recruiter AMAs</div>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#4b5563', lineHeight: 1.4 }}>
                    Exclusive insights directly from hiring managers and tech recruiters on hiring trends.
                  </p>
                  <a
                    href="https://linkedin.com/company/applydesk"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                    style={{ textAlign: 'center', textDecoration: 'none', fontSize: '12px', marginTop: 'auto' }}
                  >
                    Follow on LinkedIn
                  </a>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={onClose}>Close</button>
            </div>
          </>
        )}

        {/* ======================= 6. PRIVACY POLICY MODAL ======================= */}
        {activeModal === 'privacy' && (
          <>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Privacy Policy & Data Security</h3>
                <p>Last updated: October 2026 • Your data is private, encrypted, and strictly yours.</p>
              </div>
              <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
            </div>

            <div className="modal-body">
              <div className="privacy-badge-row">
                <span className="privacy-badge">🔒 AES-256 Bit Encryption</span>
                <span className="privacy-badge">🛡️ SOC2 Type II Certified</span>
                <span className="privacy-badge">🚫 Zero Third-Party Data Selling</span>
                <span className="privacy-badge">🇪🇺 GDPR & CCPA Compliant</span>
              </div>

              <div className="privacy-scroll-content">
                <div>
                  <div className="privacy-section-h">1. Commitment to Candidate Data Privacy</div>
                  ApplyDesk was engineered with strict security by design. We understand that your resume, contact information, work history, and compensation expectations are confidential. We never monetize, rent, or sell your candidate information to third-party data brokers or marketing agencies.
                </div>

                <div>
                  <div className="privacy-section-h">2. What Data We Process & Why</div>
                  <ul>
                    <li><strong>Candidate Profile & Resumes:</strong> Uploaded PDF files are parsed locally and stored securely to provide job matching, ATS score calculations, and tailoring recommendations.</li>
                    <li><strong>Application History:</strong> Job titles, company names, and submission timestamps to keep your job search board synchronized.</li>
                    <li><strong>AI Generation Data:</strong> Prompt outputs (tailored bullet points, cover letters) are processed in isolated sessions and are never used to train generalized foundation models.</li>
                  </ul>
                </div>

                <div>
                  <div className="privacy-section-h">3. Browser Extension Security</div>
                  The ApplyDesk Chrome Extension operates strictly under user-initiated context. It only reads active job application forms on career portals (e.g. Greenhouse, Lever, Workday) when you trigger autofill. It does not perform continuous background tracking or monitor unrelated browsing activity.
                </div>

                <div>
                  <div className="privacy-section-h">4. Your Rights: Export & Permanent Deletion</div>
                  You maintain 100% control over your personal data. At any time, you can request an instant export of all stored records or execute a complete account deletion from the Account Settings tab, permanently removing all database records within 24 hours.
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                style={{ marginRight: 'auto' }}
                onClick={() => {
                  const blob = new Blob([JSON.stringify({ user, exportDate: new Date().toISOString() }, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `applydesk-data-export-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                📥 Export My Data (.json)
              </button>
              <button className="btn-primary" onClick={onClose}>Understood</button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
