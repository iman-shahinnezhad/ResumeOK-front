import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (token: string, user: any) => void;
  API_URL: string;
}

export default function Login({ onLogin, API_URL }: LoginProps) {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Load Google Client SDK on mount
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    const handleCredentialResponse = async (response: any) => {
      setError('');
      setLoading(true);
      try {
        const token = response.credential;
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const googleUser = JSON.parse(jsonPayload);

        const res = await fetch(`${API_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: googleUser.email,
            name: googleUser.name,
            avatar: googleUser.picture,
            googleId: googleUser.sub,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          onLogin(data.token, data.user);
          navigate('/');
        } else {
          const err = await res.json();
          setError(err.error || 'Google Login failed');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to authenticate with Google');
      } finally {
        setLoading(false);
      }
    };

    // Initialize Google buttons
    const initInterval = setInterval(() => {
      if ((window as any).google) {
        clearInterval(initInterval);
        (window as any).google.accounts.id.initialize({
          client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
          callback: handleCredentialResponse,
        });

        const btnElement = document.getElementById('google-signin-btn');
        if (btnElement) {
          (window as any).google.accounts.id.renderButton(btnElement, {
            theme: 'filled_blue',
            size: 'large',
            width: btnElement.clientWidth || 380,
            text: 'continue_with',
          });
        }
      }
    }, 200);

    return () => {
      clearInterval(initInterval);
      document.body.removeChild(script);
    };
  }, [API_URL, onLogin, navigate, isSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
    const payload = isSignUp ? { name, email, password } : { email, password };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (isSignUp) {
        setSuccessMsg('Account created successfully! Logging you in...');
        setTimeout(() => {
          onLogin(data.token, data.user);
          navigate('/');
        }, 1200);
      } else {
        onLogin(data.token, data.user);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'demo.developer@gmail.com',
          name: 'Developer Demo Account',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
          googleId: 'google_sandbox_test_123',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to authenticate');
      }

      onLogin(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Demo Sandbox login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '440px', padding: '60px 16px 80px 16px', display: 'flex', flexDirection: 'column', minHeight: '80vh', justifyContent: 'center' }}>
      <div className="card" style={{ padding: '32px', border: '1px solid var(--dark-border)', background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(20px)', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
        
        {/* Header Icon */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '16px' }}>
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>
            {isSignUp ? 'Create your Account' : 'Welcome Back'}
          </h2>
          <p style={{ color: 'var(--dark-text-secondary)', fontSize: '13px', marginTop: '6px', margin: '6px 0 0 0' }}>
            {isSignUp ? 'Get welcome credits to build and match resumes' : 'Access your saved documents and resume history'}
          </p>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--dark-border)' }}>
          <button 
            style={{ flex: 1, padding: '8px', border: 'none', background: !isSignUp ? 'var(--primary)' : 'none', color: '#fff', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => { setIsSignUp(false); setError(''); }}
          >
            Sign In
          </button>
          <button 
            style={{ flex: 1, padding: '8px', border: 'none', background: isSignUp ? 'var(--primary)' : 'none', color: '#fff', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => { setIsSignUp(true); setError(''); }}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '12.5px', marginBottom: '20px', textAlign: 'left' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#4ade80', fontSize: '12.5px', marginBottom: '20px', textAlign: 'left' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isSignUp && (
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px', color: 'var(--dark-text-secondary)', textAlign: 'left' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--dark-text-secondary)' }} />
                <input 
                  type="text" 
                  required
                  placeholder="e.g. John Doe"
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: '38px', width: '100%' }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px', color: 'var(--dark-text-secondary)', textAlign: 'left' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--dark-text-secondary)' }} />
              <input 
                type="email" 
                required
                placeholder="e.g. john@example.com"
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '38px', width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px', color: 'var(--dark-text-secondary)', textAlign: 'left' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--dark-text-secondary)' }} />
              <input 
                type="password" 
                required
                placeholder="Enter password"
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '38px', width: '100%' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: '13.5px', fontWeight: '700', marginTop: '8px' }}
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
            {!loading && <ArrowRight className="w-4.5 h-4.5 ml-2" />}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', color: 'var(--dark-text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--dark-border)' }}></div>
          <span style={{ padding: '0 10px' }}>Or continue with</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--dark-border)' }}></div>
        </div>

        {/* Google Buttons Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Official Google sign-in container */}
          <div id="google-signin-btn" style={{ width: '100%', minHeight: '40px' }}></div>

          {/* Quick Mock Login for local testing */}
          <button
            type="button"
            onClick={handleDemoGoogleLogin}
            className="btn btn-secondary"
            style={{ 
              width: '100%', 
              padding: '10px 12px', 
              fontSize: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px', 
              backgroundColor: 'rgba(99, 102, 241, 0.05)',
              border: '1px dashed rgba(99, 102, 241, 0.3)',
              color: 'var(--primary)' 
            }}
          >
            <ShieldCheck className="w-4 h-4" />
            Sandbox Google Sign-In (Local Testing)
          </button>
        </div>
      </div>
    </div>
  );
}
