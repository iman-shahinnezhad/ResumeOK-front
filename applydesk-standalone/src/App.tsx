import React, { useState } from 'react';
import './index.css';
import textImage from './assets/text-image.png';
import rightImage from './assets/right-image.png';
import logoDark from './assets/logo.svg';
import Onboarding from './Onboarding';
import Dashboard from './Dashboard';

declare global {
  interface Window {
    google?: any;
    AppleID?: any;
    googleClient?: any;
  }
}

function App() {
  const [user, setUser] = useState<any>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  React.useEffect(() => {
    // 1. Check if token or openAccount is in URL (e.g. from extension Settings gear or SSO)
    let urlToken = '';
    try {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.substring(1) : '');
      urlToken = params.get('authToken') || params.get('token') || hashParams.get('authToken') || hashParams.get('token') || '';
      if (urlToken) {
        localStorage.setItem('auth_token', urlToken);
        localStorage.setItem('resumeok_token', urlToken);
        localStorage.setItem('onboarding_completed', 'true');
        params.delete('authToken');
        params.delete('token');
        const cleanSearch = params.toString() ? `?${params.toString()}` : '';
        window.history.replaceState({}, document.title, window.location.pathname + cleanSearch + window.location.hash);
      }
      if (params.get('openAccount') === 'true' || params.get('openSettings') === 'true') {
        localStorage.setItem('onboarding_completed', 'true');
        setOnboardingDone(true);
      }
    } catch(e) {}

    const token = localStorage.getItem('auth_token') || urlToken;
    const savedUser = localStorage.getItem('auth_user');
    if (token) {
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          window.postMessage({ type: 'APPLYDESK_AUTH_SYNC', source: 'applydesk-web', _internal: true, token, user: parsed }, '*');
          if (parsed.onboardingCompleted !== false) {
            localStorage.setItem('onboarding_completed', 'true');
            setOnboardingDone(true);
          }
        } catch(e) {}
      }
      setSuccess(true);
      const isDone = localStorage.getItem('onboarding_completed') === 'true';
      if (isDone) setOnboardingDone(true);

      // Directly refresh user profile and credit balance from MongoDB database
      fetch('https://api.applydesk.io/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.user) {
          setUser(data.user);
          localStorage.setItem('auth_user', JSON.stringify(data.user));
          localStorage.setItem('resumeok_user', JSON.stringify(data.user));
          if (data.user.onboardingCompleted !== false) {
            localStorage.setItem('onboarding_completed', 'true');
            setOnboardingDone(true);
          }
          const realCredit = typeof data.user.credit === 'number' ? data.user.credit : (typeof data.user.credits === 'number' ? data.user.credits : 0);
          localStorage.setItem('applydesk_credits', String(realCredit));
          window.postMessage({ type: 'APPLYDESK_AUTH_SYNC', source: 'applydesk-web', _internal: true, token, user: data.user }, '*');
        }
      })
      .catch(() => {});
    }

    // Listen for extension auth sync messages
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data && (event.data.type === 'APPLYDESK_AUTH_SYNC' || event.data.type === 'APPLYDESK_WEB_LOGIN_SYNC')) {
        // Ignore internal messages dispatched by web components to prevent infinite ping-pong loops
        if (event.data._internal || event.data.source === 'applydesk-web') return;

        if (event.data.token) {
          const curToken = localStorage.getItem('auth_token');
          if (curToken !== event.data.token) {
            localStorage.setItem('auth_token', event.data.token);
            localStorage.setItem('resumeok_token', event.data.token);
            setSuccess(true);
            localStorage.setItem('onboarding_completed', 'true');
            setOnboardingDone(true);
          }
        }
        if (event.data.user) {
          setUser((prev: any) => {
            if (prev && (prev.id === event.data.user.id || prev._id === event.data.user._id) && prev.email === event.data.user.email) {
              return prev;
            }
            try {
              localStorage.setItem('auth_user', JSON.stringify(event.data.user));
              localStorage.setItem('resumeok_user', JSON.stringify(event.data.user));
            } catch(e) {}
            return event.data.user;
          });
        }
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const endpoint = isSignUp ? 'https://api.applydesk.io/api/auth/register' : 'https://api.applydesk.io/api/auth/login';
      const bodyPayload = isSignUp 
        ? { name: name.trim(), email: email.trim().toLowerCase(), password: password.trim() }
        : { email: email.trim().toLowerCase(), password: password.trim() };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      
      const data = await res.json();
      
      if (res.ok && data.token && data.user) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        localStorage.setItem('resumeok_token', data.token);
        localStorage.setItem('resumeok_user', JSON.stringify(data.user));
        
        setUser(data.user);
        window.postMessage({ type: 'APPLYDESK_AUTH_SYNC', source: 'applydesk-web', _internal: true, token: data.token, user: data.user }, '*');
        
        const isDone = data.user.onboardingCompleted === true;
        if (isDone) localStorage.setItem('onboarding_completed', 'true');
        setOnboardingDone(isDone);
        
        setSuccess(true);
      } else {
        setError(data.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Network error. Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };



  React.useEffect(() => {
    if (window.AppleID) {
      window.AppleID.auth.init({
        clientId: 'com.applydesk.web',
        scope: 'name email',
        redirectURI: 'https://app.applydesk.io',
        usePopup: true
      });
    }

    const initGoogleBtn = () => {
      if (window.googleClient) return true;
      if (window.google?.accounts?.oauth2) {
        try {
          window.googleClient = window.google.accounts.oauth2.initTokenClient({
            client_id: '430649749710-b8mvmd6c5uu9ulr8j7bp12ae0br6pb86.apps.googleusercontent.com',
            scope: 'email profile',
            error_callback: (err: any) => {
              console.warn('Google client error callback:', err);
              if (err?.type === 'popup_closed' || err?.message?.includes('closed')) {
                setLoading(false);
                return;
              }
              setError(err?.message || 'Google login popup was closed or blocked.');
              setLoading(false);
            },
            callback: async (response: any) => {
              if (response.error) {
                if (response.error === 'popup_closed_by_user') {
                  setLoading(false);
                  return;
                }
                setLoading(false);
                return setError(response.error_description || response.error || 'Google authentication failed.');
              }
              if (!response.access_token) {
                setLoading(false);
                return setError('No access token received from Google.');
              }

              setLoading(true);
              setError('');
              try {
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${response.access_token}` }
                });
                const userInfo = await userInfoRes.json();

                const res = await fetch('https://api.applydesk.io/api/auth/google', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    googleId: userInfo.sub || userInfo.id,
                    email: userInfo.email,
                    name: userInfo.name || userInfo.given_name || 'Google User',
                    avatar: userInfo.picture || ''
                  })
                });
                const data = await res.json();
                if (res.ok && data.token && data.user) {
                  localStorage.setItem('auth_token', data.token);
                  localStorage.setItem('auth_user', JSON.stringify(data.user));
                  localStorage.setItem('resumeok_token', data.token);
                  localStorage.setItem('resumeok_user', JSON.stringify(data.user));
                  setUser(data.user);
                  window.postMessage({ type: 'APPLYDESK_AUTH_SYNC', source: 'applydesk-web', _internal: true, token: data.token, user: data.user }, '*');
                  const isDone = data.user.onboardingCompleted === true;
                  if (isDone) localStorage.setItem('onboarding_completed', 'true');
                  setOnboardingDone(isDone);
                  setSuccess(true);
                } else setError(data.error || 'Google login failed on server.');
              } catch(e: any) { setError(e?.message || 'Google login error'); }
              setLoading(false);
            },
          });
          return true;
        } catch(e) {
          console.error('Failed to init Google OAuth client:', e);
          return false;
        }
      }
      return false;
    };

    let retries = 0;
    const interval = setInterval(() => {
      retries++;
      if (initGoogleBtn() || retries > 20) {
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    if (provider === 'google') {
      if (!window.googleClient && window.google?.accounts?.oauth2) {
        try {
          window.googleClient = window.google.accounts.oauth2.initTokenClient({
            client_id: '430649749710-b8mvmd6c5uu9ulr8j7bp12ae0br6pb86.apps.googleusercontent.com',
            scope: 'email profile',
            callback: () => {}
          });
        } catch(e) {}
      }

      if (window.googleClient) {
        try {
          setError('');
          window.googleClient.requestAccessToken({ prompt: 'select_account' });
        } catch(e: any) {
          setError(e?.message || 'Failed to open Google login.');
        }
      } else {
        setError('Google login services are still loading, please try again in a moment.');
      }
    } else if (provider === 'apple') {
      if (!window.AppleID) return setError('Apple script not loaded.');
      try {
        setLoading(true);
        const response = await window.AppleID.auth.signIn();
        const identityToken = response.authorization.id_token;
        const name = response.user?.name ? `${response.user.name.firstName || ''} ${response.user.name.lastName || ''}`.trim() : 'Apple User';
        
        const res = await fetch('https://api.applydesk.io/api/auth/apple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identityToken, name })
        });
        const data = await res.json();
        if (res.ok && data.token && data.user) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_user', JSON.stringify(data.user));
          localStorage.setItem('resumeok_token', data.token);
          localStorage.setItem('resumeok_user', JSON.stringify(data.user));
          setUser(data.user);
          window.postMessage({ type: 'APPLYDESK_AUTH_SYNC', source: 'applydesk-web', _internal: true, token: data.token, user: data.user }, '*');
          const isDone = data.user.onboardingCompleted === true;
          if (isDone) localStorage.setItem('onboarding_completed', 'true');
          setOnboardingDone(isDone);
          setSuccess(true);
        } else setError(data.error || 'Apple login failed.');
      } catch(e) { setError('Apple login error'); }
      setLoading(false);
    }
  };

  if (success) {
    if (!onboardingDone) {
      return (
        <Onboarding
          user={user}
          onComplete={() => {
            localStorage.setItem('onboarding_completed', 'true');
            setOnboardingDone(true);
          }}
        />
      );
    }
    return <Dashboard user={user} onReopenOnboarding={() => setOnboardingDone(false)} />;
  }

  return (
    <div className="app-container">
      {/* Left Section - Login */}
      <div className="left-section">
        <a href="https://applydesk.io" target="_blank" rel="noopener noreferrer" className="logo-header" style={{ textDecoration: 'none', color: 'inherit' }}>
          <img src={logoDark} alt="ApplyDesk Logo" style={{ height: '22px', width: 'auto' }} />
        </a>

        <div className="login-content">
          <div className="headline" style={{ display: 'flex', alignItems: 'center' }}>
            <img src={textImage} alt="Your Job Search, All at One Desk." style={{ width: '100%', maxWidth: '340px', height: 'auto' }} />
          </div>

          <button className="auth-button" onClick={(e) => { e.preventDefault(); handleSocialLogin('apple'); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="black" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.0504 11.4586C17.0674 8.78442 19.2483 7.50284 19.349 7.43949C18.1065 5.62635 16.1466 5.34005 15.4851 5.30906C13.8407 5.14374 12.2346 6.27598 11.3934 6.27598C10.5521 6.27598 9.24155 5.33405 7.87611 5.36294C6.09633 5.39178 4.4373 6.39801 3.51864 7.99479C1.64295 11.2464 3.03716 16.0592 4.86901 18.7042C5.76566 19.9961 6.81831 21.4429 8.21447 21.385C9.55998 21.327 10.071 20.5146 11.7011 20.5146C13.3312 20.5146 13.808 21.385 15.2045 21.3562C16.6517 21.327 17.5519 20.0538 18.4357 18.7615C19.4674 17.2536 19.8931 15.7958 19.9141 15.7196C19.8911 15.7093 17.0336 14.6186 17.0504 11.4586Z" />
              <path d="M14.9351 3.65997C15.6888 2.74836 16.1951 1.48834 16.0561 0.222168C14.9754 0.265738 13.6266 0.942702 12.8465 1.8492C12.1466 2.65651 11.5369 3.9458 11.7029 5.17835C12.9097 5.27181 14.1812 4.57143 14.9351 3.65997Z" />
            </svg>
            Continue with Apple
          </button>

          <button className="auth-button" onClick={(e) => { e.preventDefault(); handleSocialLogin('google'); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.78 15.68 17.58V20.34H19.25C21.34 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
              <path d="M12 23C14.97 23 17.46 22.02 19.25 20.34L15.68 17.58C14.71 18.23 13.46 18.63 12 18.63C9.18 18.63 6.79 16.72 5.92 14.16H2.23V17.02C4.04 20.61 7.7 23 12 23Z" fill="#34A853"/>
              <path d="M5.92 14.16C5.7 13.5 5.57 12.77 5.57 12C5.57 11.23 5.7 10.5 5.92 9.84V6.98H2.23C1.49 8.46 1.05 10.16 1.05 12C1.05 13.84 1.49 15.54 2.23 17.02L5.92 14.16Z" fill="#FBBC05"/>
              <path d="M12 5.38C13.62 5.38 15.06 5.93 16.2 7.02L19.33 3.89C17.45 2.14 14.97 1 12 1C7.7 1 4.04 3.39 2.23 6.98L5.92 9.84C6.79 7.28 9.18 5.38 12 5.38Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="divider">or</div>

          {error && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>{error}</div>}

          <form onSubmit={handleAuth}>
            {isSignUp && (
              <input 
                type="text" 
                placeholder="Full Name" 
                className="input-field" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
            <input 
              type="email" 
              placeholder="Email Address" 
              className="input-field" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <input 
              type="password" 
              placeholder="Password" 
              className="input-field" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" className="continue-btn" disabled={loading}>
              {loading ? (isSignUp ? 'Creating account...' : 'Logging in...') : (isSignUp ? 'Sign Up' : 'Continue')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#64748b' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              type="button" 
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#0f172a', fontWeight: '500', cursor: 'pointer', padding: 0 }}
            >
              {isSignUp ? 'Log in' : 'Sign up'}
            </button>
          </div>

          <p className="terms-text" style={{ marginTop: '16px' }}>
            By continuing, you agree to ApplyDesk's <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>

      {/* Right Section - Hero Image */}
      <div className="right-section">
        <div className="image-container">
          {/* Replace this src with your actual image path, e.g. /assets/hero.jpg */}
          <img 
            src={rightImage} 
            alt="Office Hero" 
          />
        </div>
      </div>
    </div>
  );
}

export default App;
