import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Zap, ShieldCheck, Sparkles, Key, CheckCircle, AlertCircle } from 'lucide-react';

interface ProfileProps {
  user: {
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
  } | null;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  token: string | null;
  credits: number;
  API_URL: string;
}

export default function Profile({ user, setUser, token, credits, API_URL }: ProfileProps) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Redirect to login if user is not logged in
    if (!user) {
      navigate('/login');
      return;
    }
    setName(user.name);

    // Sync purchase callbacks from Stripe URL params
    const params = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
    const sessionId = params.get('session_id');
    const checkoutStatus = params.get('checkout');

    if (sessionId) {
      setSuccess('Congratulations! Payment completed successfully. Your credits have been loaded.');

      // Clean URL parameters
      const cleanUrl = window.location.href.split('?')[0];
      window.history.replaceState({}, document.title, cleanUrl);

      // Force-sync credits from server
      const syncCredits = async () => {
        try {
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setUser(data.user);
              localStorage.setItem('auth_user', JSON.stringify(data.user));
            }
          }
        } catch (e) {
          console.error(e);
        }
      };
      syncCredits();
    } else if (checkoutStatus === 'cancelled') {
      setError('Checkout was cancelled. No charges were made.');
      const cleanUrl = window.location.href.split('?')[0];
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [user, navigate, token, setUser, API_URL]);

  if (!user) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (showPasswordFields) {
      if (!password) {
        setError('Please enter a new password.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          newPassword: showPasswordFields ? password : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      const updatedUser = { ...user, ...data.user };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      setSuccess('Settings updated successfully!');
      setPassword('');
      setConfirmPassword('');
      setShowPasswordFields(false);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };



  return (
    <div className="container" style={{ padding: '40px 16px 80px 16px', maxWidth: '1000px' }}>

      {/* Title Header */}
      <div style={{ marginBottom: '32px', textAlign: 'left' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#fff' }}>Profile & Account</h2>
        <p style={{ color: 'var(--dark-text-secondary)', fontSize: '14px', marginTop: '6px', margin: '6px 0 0 0' }}>
          Manage your account settings, credentials, referral codes, and credit balances.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1.8fr)', gap: '32px' }} className="profile-grid">

        {/* Left Side: Summary & Referral Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Profile Identity Card */}
          <div className="card" style={{ padding: '24px', backgroundColor: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid var(--dark-border)', borderRadius: '16px', textAlign: 'left' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
              {user.avatar ? (
                <img src={user.avatar} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2.5px solid var(--dark-border)' }} alt="" />
              ) : (
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800' }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 style={{ fontWeight: '800', fontSize: '18px', margin: 0, color: '#fff' }}>{user.name}</h3>
                <p style={{ fontSize: '13px', color: 'var(--dark-text-secondary)', margin: '4px 0 0 0', wordBreak: 'break-all' }}>{user.email || 'OAuth Login'}</p>
              </div>
            </div>

            {/* Credit & Plan */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--dark-border)', borderRadius: '12px' }}>
                <span style={{ fontSize: '10px', color: 'var(--dark-text-secondary)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Credits</span>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap className="w-5 h-5 fill-current text-indigo-400" />
                  {credits}
                </div>
              </div>
              <div style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--dark-border)', borderRadius: '12px' }}>
                <span style={{ fontSize: '10px', color: 'var(--dark-text-secondary)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Plan</span>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  {user.plan || 'Free'}
                </div>
              </div>
            </div>
          </div>

          {/* Referral Card */}
          <div className="card" style={{ padding: '24px', backgroundColor: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid var(--dark-border)', borderRadius: '16px', textAlign: 'left' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 8px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Referral Program
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--dark-text-secondary)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              Share your referral link with other creators. For every friend who signs up with your code, you both earn free tokens to tailor resumes.
            </p>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--dark-border)', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', color: 'var(--dark-text-secondary)', textTransform: 'uppercase' }}>Your referral code</span>
                <span style={{ fontSize: '15px', fontWeight: '850', color: '#fff', marginTop: '2px', letterSpacing: '0.5px' }}>{user.referralCode || 'N/A'}</span>
              </div>
              {user.referralCode && (
                <button
                  onClick={() => copyToClipboard(user.referralCode || '')}
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '6px', minWidth: '70px' }}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--dark-text-secondary)', borderTop: '1px solid var(--dark-border)', paddingTop: '12px' }}>
              <span>Friends Joined: <strong>{user.totalJoined || 0}</strong></span>
              <span>Reward Level: <strong>Lvl {user.referralLevel || 0}</strong></span>
            </div>
          </div>

          {/* Developer / Account Metadata info */}
          {/* <div style={{ textAlign: 'left', padding: '0 12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--dark-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account ID</span>
            <div style={{ fontFamily: 'monospace', fontSize: '10.5px', color: 'var(--dark-text-secondary)', marginTop: '4px', wordBreak: 'break-all' }}>
              {user.id}
            </div>
          </div> */}
        </div>

        {/* Right Side: Account Settings Form */}
        <div className="card" style={{ padding: '32px', backgroundColor: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid var(--dark-border)', borderRadius: '16px', height: 'fit-content', textAlign: 'left' }}>
          <h4 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 20px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings className="w-5 h-5 text-indigo-400" />
            Security & Profile Settings
          </h4>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '13px', marginBottom: '20px' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)', color: '#4ade80', fontSize: '13px', marginBottom: '20px' }}>
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--dark-text-secondary)', marginBottom: '8px' }}>Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%' }}
                placeholder="Name"
                required
              />
            </div>

            {/* Password Change Toggle Button & Form */}
            <div style={{ borderTop: '1px solid var(--dark-border)', paddingTop: '16px', marginTop: '4px' }}>
              {!showPasswordFields ? (
                <button
                  type="button"
                  onClick={() => setShowPasswordFields(true)}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '10px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px dashed rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.03)', color: 'var(--primary)', cursor: 'pointer' }}
                >
                  <Key className="w-4 h-4" />
                  Change Account Password
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)' }}>Change Password</span>
                    <button
                      type="button"
                      onClick={() => { setShowPasswordFields(false); setPassword(''); setConfirmPassword(''); }}
                      style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Cancel
                    </button>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--dark-text-secondary)', marginBottom: '6px' }}>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <Key className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--dark-text-secondary)' }} />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter new password"
                        style={{ width: '100%', paddingLeft: '38px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--dark-text-secondary)', marginBottom: '6px' }}>Confirm New Password</label>
                    <div style={{ position: 'relative' }}>
                      <Key className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--dark-text-secondary)' }} />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        style={{ width: '100%', paddingLeft: '38px' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: '700', marginTop: '8px' }}
            >
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>

      {/* Redirection to dedicated Pricing page */}
      <div className="card" style={{ marginTop: '40px', padding: '24px 32px', backgroundColor: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid var(--dark-border)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', textAlign: 'left' }}>
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap className="w-5 h-5 text-indigo-400 fill-current" />
            Need More Credits?
          </h4>
          <p style={{ color: 'var(--dark-text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Buy packages, unlock premium features, and tailor unlimited resumes.
          </p>
        </div>
        <button
          onClick={() => navigate('/pricing')}
          className="btn btn-primary"
          style={{ padding: '10px 20px', fontSize: '13.5px', fontWeight: '750', whiteSpace: 'nowrap' }}
        >
          View Credit Packages
        </button>
      </div>
    </div>
  );
}
