import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import useSEO from '../hooks/useSEO';

interface Props {
  onLogin: (token: string, userData: any) => void;
  API_URL: string;
}

export default function Login({ onLogin }: Props) {
  useSEO(
    "Log in & Sign Up - ResumeOK",
    "Access your AI job search copilot, ATS resume builder, auto-apply history, and insider referrals."
  );

  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const mockUser = {
        id: 'usr_' + Date.now(),
        name: isSignUp ? (name || 'Job Seeker') : 'Saman Kazempour',
        email: email || 'saman@resumeok.com',
        credit: 100,
        plan: 'Pro'
      };
      onLogin('mock_jwt_token_' + Date.now(), mockUser);
      setLoading(false);
      navigate('/jobs');
    }, 800);
  };

  return (
    <div className="resumeok-page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 160px)' }}>
      <div className="resumeok-card-sand" style={{ width: '100%', maxWidth: '440px', padding: '44px 36px', textAlign: 'center' }}>
        <span className="resumeok-badge resumeok-badge-blue" style={{ marginBottom: '16px' }}>
          <Sparkles className="w-3.5 h-3.5" /> RESUMEOK AI COPILOT
        </span>

        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '32px', color: '#141414', marginBottom: '8px' }}>
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p style={{ fontSize: '14px', color: '#555555', marginBottom: '28px' }}>
          {isSignUp ? 'Start landing interviews 6x faster with AI.' : 'Log in to manage your applications and AI auto-applies.'}
        </p>

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

          <button className="btn-resumeok-black" type="submit" disabled={loading} style={{ width: '100%', padding: '14px', justifyContent: 'center', marginTop: '12px' }}>
            {loading ? 'Authenticating...' : (isSignUp ? 'Sign Up For Free' : 'Log In →')}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #dcd7cc', fontSize: '13.5px', color: '#555555' }}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', fontWeight: '800', color: '#141414', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isSignUp ? 'Log in' : 'Sign up for free'}
          </button>
        </div>
      </div>
    </div>
  );
}
