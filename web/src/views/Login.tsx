'use client';

import React, { useState, useEffect } from 'react';
import { useNavigate } from '../lib/router-compat';
import { Sparkles, Mail, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import useSEO from '../hooks/useSEO';

interface Props {
  onLogin?: (token: string, userData: any) => void;
  API_URL?: string;
  user?: any;
}

declare global {
  interface Window {
    google?: any;
  }
}

export default function Login({ onLogin = () => {}, API_URL = "https://api.applydesk.io", user }: Props) {
  useSEO(
    "Log in & Sign Up - ApplyDesk",
    "Access your AI job search copilot, ATS resume builder, auto-apply history, and insider referrals."
  );

  const navigate = useNavigate();

  // Redirect authenticated user away from login page immediately
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token') || localStorage.getItem('resumeok_token');
    const savedUser = localStorage.getItem('auth_user') || localStorage.getItem('resumeok_user');
    if (user || (savedToken && savedUser)) {
      navigate('/jobs', { replace: true });
    }
  }, [user, navigate]);

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load Google Identity Services script on mount
  useEffect(() => {
    const initGoogleBtn = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: '430649749710-b8mvmd6c5uu9ulr8j7bp12ae0br6pb86.apps.googleusercontent.com',
          callback: handleGoogleCredentialResponse,
        });

        const btnDiv = document.getElementById('googleSignInBtn');
        if (btnDiv) {
          btnDiv.innerHTML = '';
          window.google.accounts.id.renderButton(btnDiv, {
            theme: 'outline',
            size: 'large',
            width: 360,
            text: 'continue_with',
            shape: 'rectangular',
          });
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogleBtn();
    } else {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.addEventListener('load', initGoogleBtn);
      } else {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initGoogleBtn;
        document.head.appendChild(script);
      }
    }
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) {
      setErrorMessage('Google authentication failed. Please try again.');
      return;
    }

    setGoogleLoading(true);
    setErrorMessage('');

    try {
      const payload = parseJwt(response.credential);
      const googleId = payload?.sub || payload?.id;
      const email = payload?.email;
      const name = payload?.name || payload?.given_name || 'Google User';
      const avatar = payload?.picture || '';

      if (!googleId || !email) {
        throw new Error('Google token did not contain valid email/sub');
      }

      const googleData = {
        googleId,
        email,
        name,
        avatar,
      };

      const endpointsToTry = [
        `${API_URL}/api/auth/google`,
        `https://api.applydesk.io/api/auth/google`,
        `/api/auth/google`
      ];

      let res = null;
      let data = null;
      let fetchSuccess = false;

      for (const endpoint of Array.from(new Set(endpointsToTry))) {
        try {
          res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(googleData)
          });
          data = await res.json();
          if (res.ok && data.token && data.user) {
            fetchSuccess = true;
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('auth_user', JSON.stringify(data.user));
            localStorage.setItem('resumeok_token', data.token);
            localStorage.setItem('resumeok_user', JSON.stringify(data.user));
            window.dispatchEvent(new Event('storage'));
            onLogin(data.token, data.user);
            navigate('/jobs');
            break;
          }
        } catch (e) {
          console.warn(`Attempt failed for ${endpoint}:`, e);
        }
      }

      if (!fetchSuccess) {
        if (data?.error) {
          setErrorMessage(data.error);
        } else {
          setErrorMessage('Could not connect to authentication server. Please try again.');
        }
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

    const apiPath = isSignUp ? '/api/auth/register' : '/api/auth/login';
    const body = isSignUp
      ? { name: name.trim(), email: email.trim().toLowerCase(), password: password.trim() }
      : { email: email.trim().toLowerCase(), password: password.trim() };

    const endpointsToTry = [
      `${API_URL}${apiPath}`,
      `https://api.applydesk.io${apiPath}`,
      `${apiPath}`
    ];

    let fetchSuccess = false;
    let data = null;

    try {
      for (const ep of Array.from(new Set(endpointsToTry))) {
        try {
          const res = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          data = await res.json();
          if (res.ok && data.token && data.user) {
            fetchSuccess = true;
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('auth_user', JSON.stringify(data.user));
            localStorage.setItem('resumeok_token', data.token);
            localStorage.setItem('resumeok_user', JSON.stringify(data.user));
            window.dispatchEvent(new Event('storage'));
            onLogin(data.token, data.user);
            navigate('/jobs');
            break;
          }
        } catch (e) {}
      }

      if (!fetchSuccess) {
        if (data?.error) {
          setErrorMessage(data.error);
        } else {
          setErrorMessage('Authentication failed. Please check your email and password.');
        }
      }
    } catch (err) {
      setErrorMessage('Network error. Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="resumeok-page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 160px)', paddingTop: '45px', paddingBottom: '60px' }}>
      <div className="resumeok-card-sand" style={{ width: '100%', maxWidth: '460px', padding: '40px 32px', textAlign: 'center', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.06)', border: '1px solid #e8e3d9' }}>
        
        {/* Top Badge */}
        <span className="resumeok-badge resumeok-badge-blue" style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles className="w-3.5 h-3.5" /> APPLYDESK AI COPILOT
        </span>

        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '30px', color: '#141414', marginBottom: '8px', fontWeight: 600 }}>
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px', lineHeight: '1.5' }}>
          {isSignUp ? 'Start landing interviews 6x faster with AI resume tailoring and auto-applies.' : 'Log in to access your saved resumes, job applications, and AI copilot.'}
        </p>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '12px', padding: '4px', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setErrorMessage(''); }}
            style={{
              flex: 1,
              padding: '9px 16px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: !isSignUp ? '#FFFFFF' : 'transparent',
              color: !isSignUp ? '#0F172A' : '#64748B',
              boxShadow: !isSignUp ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setErrorMessage(''); }}
            style={{
              flex: 1,
              padding: '9px 16px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: isSignUp ? '#FFFFFF' : 'transparent',
              color: isSignUp ? '#0F172A' : '#64748B',
              boxShadow: isSignUp ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Create Account
          </button>
        </div>

        {errorMessage ? (
          <div style={{
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            padding: '12px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '20px',
            border: '1px solid #FCA5A5',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textAlign: 'left'
          }}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {/* Google Sign-In Container */}
        <div style={{ marginBottom: '20px' }}>
          <div id="googleSignInBtn" style={{ width: '100%', minHeight: '44px', display: 'flex', justifyContent: 'center' }} />
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

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
          {isSignUp && (
            <div>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', display: 'block', marginBottom: '6px' }}>Full Name</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User className="w-4 h-4" style={{ position: 'absolute', left: '14px', color: '#94A3B8' }} />
                <input
                  type="text"
                  className="resumeok-input"
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ paddingLeft: '40px', width: '100%', height: '46px', borderRadius: '10px', fontSize: '14px' }}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', display: 'block', marginBottom: '6px' }}>Email Address</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail className="w-4 h-4" style={{ position: 'absolute', left: '14px', color: '#94A3B8' }} />
              <input
                type="email"
                className="resumeok-input"
                placeholder="you@domain.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ paddingLeft: '40px', width: '100%', height: '46px', borderRadius: '10px', fontSize: '14px' }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', display: 'block', marginBottom: '6px' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock className="w-4 h-4" style={{ position: 'absolute', left: '14px', color: '#94A3B8' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="resumeok-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: '40px', paddingRight: '40px', width: '100%', height: '46px', borderRadius: '10px', fontSize: '14px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            className="btn-resumeok-black"
            type="submit"
            disabled={loading || googleLoading}
            style={{ width: '100%', padding: '14px', justifyContent: 'center', marginTop: '8px', cursor: 'pointer', borderRadius: '10px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{isSignUp ? 'Create Account' : 'Log In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #E2E8F0', fontSize: '13.5px', color: '#64748B' }}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setErrorMessage(''); }}
            style={{ background: 'none', border: 'none', fontWeight: '700', color: '#0F172A', cursor: 'pointer', textDecoration: 'underline', marginLeft: '4px' }}
          >
            {isSignUp ? 'Log in' : 'Sign up for free'}
          </button>
        </div>
      </div>
    </div>
  );
}
