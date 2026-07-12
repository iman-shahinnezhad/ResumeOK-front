import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, HelpCircle } from 'lucide-react';

interface PricingProps {
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  token: string | null;
  API_URL: string;
}

export default function Pricing({ user, setUser, token, API_URL }: PricingProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    // Check if there are Stripe redirect params in URL
    const params = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
    const sessionId = params.get('session_id');
    const checkoutStatus = params.get('checkout');

    if (sessionId) {
      setSuccess('Congratulations! Payment completed successfully. Your credits have been loaded.');
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
  }, [token, setUser, API_URL]);

  const handlePurchase = async (packageName: string, creditsAmount: number, price: number) => {
    if (!user) {
      // Redirect to login if user is not signed in
      navigate('/login');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/payment/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: price,
          credits: creditsAmount,
          packageName,
          successUrl: window.location.href.split('?')[0] + '?session_id=completed',
          cancelUrl: window.location.href.split('?')[0] + '?checkout=cancelled'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe checkout
      }
    } catch (err: any) {
      setError(err.message || 'Payment initialization failed');
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      q: "How do credits work on ResumeOK?",
      a: "Credits are used for AI tasks. Tailoring a resume or cover letter costs 2 credits, while scanning your CV against a job description costs 1 credit. The default free welcome credits allow you to test the app fully."
    },
    {
      q: "Do my purchased credits expire?",
      a: "Never! Any credits you purchase remain in your account indefinitely until you use them. There are no monthly subscriptions or recurring fees."
    },
    {
      q: "Can I use Stripe simulation (Sandbox)?",
      a: "Yes! If our server is in development mode, clicking buy grants you credits immediately in the database for free, so you can test all features without entering credit cards."
    },
    {
      q: "Is my payment information secure?",
      a: "100% secure. All payments are processed directly by Stripe using bank-level encryption. ResumeOK never stores or accesses your credit card number."
    }
  ];

  return (
    <div className="container" style={{ padding: '60px 16px 100px 16px', maxWidth: '1000px', textAlign: 'center' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '36px', fontWeight: '900', margin: 0, color: '#fff' }}>
          Choose your <span style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Credit Package</span>
        </h2>
        <p style={{ color: 'var(--dark-text-secondary)', fontSize: '15px', marginTop: '10px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
          Get immediate access to premium features. Tailor resumes, scan against job requirements, and generate cover letters with Google Gemini AI.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '13.5px', marginBottom: '24px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)', color: '#4ade80', fontSize: '13.5px', marginBottom: '24px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
          {success}
        </div>
      )}

      {/* Pricing Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '60px', alignItems: 'stretch' }}>
        
        {/* Basic Package */}
        <div className="card" style={{ padding: '32px 24px', backgroundColor: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid var(--dark-border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left', transition: 'transform 0.2s' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--dark-text-secondary)', letterSpacing: '1px' }}>Starter Pack</span>
            <h3 style={{ fontSize: '28px', fontWeight: '900', color: '#fff', margin: '8px 0' }}>100 Credits</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
              <span style={{ fontSize: '32px', fontWeight: '950', color: '#fff' }}>$9.99</span>
              <span style={{ fontSize: '12px', color: 'var(--dark-text-secondary)' }}>one-time</span>
            </div>
            
            <div style={{ height: '1px', backgroundColor: 'var(--dark-border)', marginBottom: '20px' }}></div>
            
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 30px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--dark-text-secondary)' }}>
                <Check className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                Tailor up to 50 resumes
              </li>
              <li style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--dark-text-secondary)' }}>
                <Check className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                Write 50 customized cover letters
              </li>
              <li style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--dark-text-secondary)' }}>
                <Check className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                100 job description match scans
              </li>
              <li style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--dark-text-secondary)' }}>
                <Check className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                Credits never expire
              </li>
            </ul>
          </div>

          <button 
            onClick={() => handlePurchase('Basic Pack', 100, 9.99)}
            disabled={loading}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: '750', borderRadius: '10px' }}
          >
            Buy 100 Credits
          </button>
        </div>

        {/* Pro Package */}
        <div className="card" style={{ padding: '32px 24px', backgroundColor: 'rgba(99, 102, 241, 0.05)', backdropFilter: 'blur(20px)', border: '2px solid var(--primary)', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left', position: 'relative', boxShadow: '0 10px 30px rgba(99,102,241,0.15)' }}>
          <span style={{ position: 'absolute', top: '-12px', right: '20px', backgroundColor: 'var(--primary)', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Most Popular</span>
          
          <div>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '1px' }}>Job Seeker Pack</span>
            <h3 style={{ fontSize: '28px', fontWeight: '900', color: '#fff', margin: '8px 0' }}>300 Credits</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
              <span style={{ fontSize: '32px', fontWeight: '950', color: '#fff' }}>$19.99</span>
              <span style={{ fontSize: '12px', color: 'var(--dark-text-secondary)' }}>one-time</span>
            </div>
            
            <div style={{ height: '1px', backgroundColor: 'var(--dark-border)', marginBottom: '20px' }}></div>
            
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 30px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--dark-text-secondary)' }}>
                <Check className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                Tailor up to 150 resumes
              </li>
              <li style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--dark-text-secondary)' }}>
                <Check className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                Write 150 customized cover letters
              </li>
              <li style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--dark-text-secondary)' }}>
                <Check className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                300 job description match scans
              </li>
              <li style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--dark-text-secondary)' }}>
                <Check className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                Priority Gemini Flash model speed
              </li>
              <li style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--dark-text-secondary)' }}>
                <Check className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                Credits never expire
              </li>
            </ul>
          </div>

          <button 
            onClick={() => handlePurchase('Pro Pack', 300, 19.99)}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: '750', borderRadius: '10px', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}
          >
            Buy 300 Credits
          </button>
        </div>

        {/* Ultimate Package */}
        <div className="card" style={{ padding: '32px 24px', backgroundColor: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid var(--dark-border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--dark-text-secondary)', letterSpacing: '1px' }}>Power User Pack</span>
            <h3 style={{ fontSize: '28px', fontWeight: '900', color: '#fff', margin: '8px 0' }}>1000 Credits</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
              <span style={{ fontSize: '32px', fontWeight: '950', color: '#fff' }}>$49.99</span>
              <span style={{ fontSize: '12px', color: 'var(--dark-text-secondary)' }}>one-time</span>
            </div>
            
            <div style={{ height: '1px', backgroundColor: 'var(--dark-border)', marginBottom: '20px' }}></div>
            
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 30px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--dark-text-secondary)' }}>
                <Check className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                Tailor up to 500 resumes
              </li>
              <li style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--dark-text-secondary)' }}>
                <Check className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                Write 500 customized cover letters
              </li>
              <li style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--dark-text-secondary)' }}>
                <Check className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                1000 job description match scans
              </li>
              <li style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--dark-text-secondary)' }}>
                <Check className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                Highest priority API generation
              </li>
              <li style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--dark-text-secondary)' }}>
                <Check className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                Credits never expire
              </li>
            </ul>
          </div>

          <button 
            onClick={() => handlePurchase('Ultimate Pack', 1000, 49.99)}
            disabled={loading}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: '750', borderRadius: '10px' }}
          >
            Buy 1000 Credits
          </button>
        </div>

      </div>

      {/* FAQ Section */}
      <div style={{ maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto', textAlign: 'left', borderTop: '1px solid var(--dark-border)', paddingTop: '48px' }}>
        <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HelpCircle className="w-5 h-5 text-indigo-400" />
          Frequently Asked Questions
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              style={{ border: '1px solid var(--dark-border)', borderRadius: '12px', backgroundColor: 'rgba(30, 41, 59, 0.2)', overflow: 'hidden' }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                style={{ width: '100%', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', outline: 'none' }}
              >
                <span style={{ fontSize: '14.5px', fontWeight: '700', color: '#fff' }}>{faq.q}</span>
                <ChevronDown className="w-4 h-4" style={{ color: '#fff', stroke: '#fff', transform: openFaq === idx ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
              </button>
              
              {openFaq === idx && (
                <div style={{ padding: '0 20px 18px 20px', fontSize: '13px', color: 'var(--dark-text-secondary)', lineHeight: '1.6' }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
