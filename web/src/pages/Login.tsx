import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import useSEO from '../hooks/useSEO';

interface Props {
  onLogin: (token: string, userData: any) => void;
  API_URL: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

export default function Login({ onLogin, API_URL }: Props) {
  useSEO(
    "Log in & Sign Up - ApplyDesk",
    "Access your AI job search copilot, ATS resume builder, auto-apply history, and insider referrals."
  );

  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load Google Identity Services script on mount
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: '430649749710-b8mvmd6c5uu9ulr8j7bp12ae0br6pb86.apps.googleusercontent.com',
          callback: handleGoogleCredentialResponse,
        });

        const btnDiv = document.getElementById('googleSignInBtn');
        if (btnDiv) {
          window.google.accounts.id.renderButton(btnDiv, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
            shape: 'rectangular',
          });
        }
      }
    };
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) { }
    };
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) {
      setErrorMessage('Google authentication failed. Please try again.');
      return;
    }

    setGoogleLoading(true);
    setErrorMessage('');

    try {
      // Decode JWT payload from Google credential
      const payload = parseJwt(response.credential);
      const googleId = payload?.sub || payload?.id;
      const email = payload?.email;
      const name = payload?.name || payload?.given_name || 'Google User';
      const avatar = payload?.picture || '';

      if (!googleId || !email) {
        throw new Error('Google token did not contain valid email/sub');
      }

      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleId,
          email,
          name,
          avatar,
        })
      });

      const data = await res.json();
      if (res.ok && data.token && data.user) {
        onLogin(data.token, data.user);
        navigate('/jobs');
      } else {
        setErrorMessage(data.error || 'Google login failed on server.');
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setErrorMessage('Could not connect to authentication server.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const endpoint = isSignUp ? `${API_URL}/api/auth/register` : `${API_URL}/api/auth/login`;
    const body = isSignUp ? { name, email, password } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok && data.token && data.user) {
        onLogin(data.token, data.user);
        navigate('/jobs');
      } else {
        setErrorMessage(data.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      setErrorMessage('Network error. Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="resumeok-page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 160px)', paddingTop: '40px' }}>
      <div className="resumeok-card-sand" style={{ width: '100%', maxWidth: '440px', padding: '44px 36px', textAlign: 'center', borderRadius: '16px' }}>
        <span className="resumeok-badge resumeok-badge-blue" style={{ marginBottom: '16px' }}>
          <Sparkles className="w-3.5 h-3.5" /> APPLYDESK AI COPILOT
        </span>

        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '32px', color: '#141414', marginBottom: '8px' }}>
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p style={{ fontSize: '14px', color: '#555555', marginBottom: '24px' }}>
          {isSignUp ? 'Start landing interviews 6x faster with AI.' : 'Log in to manage your applications and AI auto-applies.'}
        </p>

        {errorMessage ? (
          <div style={{
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '20px',
            border: '1px solid #FCA5A5'
          }}>
            {errorMessage}
          </div>
        ) : null}

        {/* Google Sign-In Official Button Container */}
        <div style={{ marginBottom: '20px' }}>
          <div id="googleSignInBtn" style={{ width: '100%', minHeight: '44px', display: 'flex', justifyContent: 'center' }} />
          
          {/* Fallback Custom Google Button if GIS button renders slowly */}
          {googleLoading && (
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '8px' }}>
              Signing in with Google...
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
          <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
          {isSignUp && (
            <div>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'block', marginBottom: '6px' }}>Full Name</label>
              <input type="text" className="resumeok-input" placeholder="Marcus Chen" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'block', marginBottom: '6px' }}>Email Address</label>
            <input type="email" className="resumeok-input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'block', marginBottom: '6px' }}>Password</label>
            <input type="password" className="resumeok-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          <button className="btn-resumeok-black" type="submit" disabled={loading || googleLoading} style={{ width: '100%', padding: '14px', justifyContent: 'center', marginTop: '8px', cursor: 'pointer' }}>
            {loading ? 'Authenticating...' : (isSignUp ? 'Sign Up For Free' : 'Log In →')}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #dcd7cc', fontSize: '13.5px', color: '#555555' }}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button 
            onClick={() => { setIsSignUp(!isSignUp); setErrorMessage(''); }}
            style={{ background: 'none', border: 'none', fontWeight: '800', color: '#141414', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isSignUp ? 'Log in' : 'Sign up for free'}
          </button>
        </div>
      </div>
    </div>
  );
}
