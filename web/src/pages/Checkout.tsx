import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Shield, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CheckoutProps {
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  token: string | null;
  API_URL: string;
}

export default function Checkout({ user, setUser, token, API_URL }: CheckoutProps) {
  const navigate = useNavigate();
  
  // URL Params
  const params = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
  const amount = params.get('amount') || '0.00';
  const credits = params.get('credits') || '0';
  const packageName = params.get('packageName') || 'Credits Package';

  // Form states
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [country, setCountry] = useState('United States');
  
  // App states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [cardBrand, setCardBrand] = useState<'visa' | 'mastercard' | 'amex' | 'generic'>('generic');

  useEffect(() => {
    // If not logged in, redirect to login
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Card brand detection logic
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    
    // Format card number with spaces (e.g. 4242 4242 4242 4242)
    let formatted = '';
    for (let i = 0; i < val.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += val[i];
    }
    setCardNumber(formatted.substring(0, 19));

    // Detect brand prefix
    if (val.startsWith('4')) {
      setCardBrand('visa');
    } else if (/^5[1-5]/.test(val)) {
      setCardBrand('mastercard');
    } else if (val.startsWith('34') || val.startsWith('37')) {
      setCardBrand('amex');
    } else {
      setCardBrand('generic');
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    let formatted = val;
    if (val.length > 2) {
      formatted = val.substring(0, 2) + '/' + val.substring(2, 4);
    }
    setExpiry(formatted.substring(0, 5));
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setCvc(val.substring(0, 4));
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Quick validation
    if (cardNumber.replace(/\s/g, '').length < 15) {
      setError('Please enter a valid credit card number.');
      return;
    }
    if (expiry.length < 5) {
      setError('Please enter a valid expiry date (MM/YY).');
      return;
    }
    if (cvc.length < 3) {
      setError('Please enter a valid CVC security code.');
      return;
    }
    if (!cardName.trim()) {
      setError('Please enter the cardholder name.');
      return;
    }

    setLoading(true);

    try {
      // Simulate bank verification delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const response = await fetch(`${API_URL}/api/payment/confirm-mock-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          credits: Number(credits),
          packageName
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Simulated transaction failed');
      }

      // Success
      setSuccess(true);
      setUser(data.user);
      localStorage.setItem('auth_user', JSON.stringify(data.user));

      // Wait 1.5s then redirect back to pricing page with success state
      setTimeout(() => {
        navigate('/pricing?session_id=completed');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Payment simulation failed');
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '60px 16px 100px 16px', maxWidth: '900px' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1.7fr)', gap: '40px', textAlign: 'left' }} className="profile-grid">
        
        {/* Left Column: Order Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '28px', backgroundColor: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid var(--dark-border)', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: '0 0 16px 0', borderBottom: '1px solid var(--dark-border)', paddingBottom: '12px' }}>
              Order Summary
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14.5px', fontWeight: '750', color: '#fff' }}>{packageName}</div>
                <div style={{ fontSize: '12px', color: 'var(--dark-text-secondary)', marginTop: '2px' }}>{credits} Welcome Credits</div>
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>${amount}</div>
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--dark-border)', margin: '16px 0' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px' }}>
              <span style={{ fontWeight: '700', color: 'var(--dark-text-secondary)' }}>Total Due Today</span>
              <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--primary)' }}>${amount}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '0 12px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '12.5px', color: 'var(--dark-text-secondary)' }}>
              <Shield className="w-5 h-5 text-indigo-400" />
              <span>SSL Secure & PCI-DSS Compliant Gateway</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '12.5px', color: 'var(--dark-text-secondary)' }}>
              <Lock className="w-5 h-5 text-indigo-400" />
              <span>Stripe Payment Sandbox Simulation Mode</span>
            </div>
          </div>
        </div>

        {/* Right Column: Credit Card Details Form */}
        <div className="card" style={{ padding: '32px', backgroundColor: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid var(--dark-border)', borderRadius: '16px', height: 'fit-content' }}>
          
          {success ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }} className="animate-fade-in">
              <CheckCircle2 className="w-16 h-16 text-emerald-400" style={{ margin: '0 auto 16px auto' }} />
              <h3 style={{ fontSize: '20px', fontWeight: '850', color: '#fff', margin: '0 0 8px 0' }}>Payment Successful!</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--dark-text-secondary)' }}>Your account has been upgraded. Redirecting you back...</p>
            </div>
          ) : (
            <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--dark-border)', paddingBottom: '16px', marginBottom: '4px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard className="w-5 h-5 text-indigo-400" />
                  Card Information
                </h4>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {/* Glowing Visa Logo */}
                  <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.04)', border: cardBrand === 'visa' ? '1px solid #3b82f6' : '1px solid var(--dark-border)', color: cardBrand === 'visa' ? '#60a5fa' : 'var(--dark-text-secondary)', transition: 'all 0.2s' }}>VISA</span>
                  {/* Glowing Mastercard Logo */}
                  <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.04)', border: cardBrand === 'mastercard' ? '1px solid #f97316' : '1px solid var(--dark-border)', color: cardBrand === 'mastercard' ? '#fb923c' : 'var(--dark-text-secondary)', transition: 'all 0.2s' }}>MC</span>
                  {/* Glowing Amex Logo */}
                  <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.04)', border: cardBrand === 'amex' ? '1px solid #10b981' : '1px solid var(--dark-border)', color: cardBrand === 'amex' ? '#34d399' : 'var(--dark-text-secondary)', transition: 'all 0.2s' }}>AMEX</span>
                </div>
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '13px' }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--dark-text-secondary)', marginBottom: '8px' }}>Cardholder Name</label>
                <input 
                  type="text" 
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="John Doe"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--dark-text-secondary)', marginBottom: '8px' }}>Card Number</label>
                <div style={{ position: 'relative' }}>
                  <CreditCard className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--dark-text-secondary)' }} />
                  <input 
                    type="text" 
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="4242 4242 4242 4242"
                    style={{ width: '100%', paddingLeft: '38px' }}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--dark-text-secondary)', marginBottom: '8px' }}>Expiration Date</label>
                  <input 
                    type="text" 
                    value={expiry}
                    onChange={handleExpiryChange}
                    placeholder="MM/YY"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--dark-text-secondary)', marginBottom: '8px' }}>Security Code (CVC)</label>
                  <input 
                    type="password" 
                    value={cvc}
                    onChange={handleCvcChange}
                    placeholder="123"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--dark-text-secondary)', marginBottom: '8px' }}>Billing Country</label>
                <select 
                  value={country} 
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={loading}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.25)', border: '1px solid var(--dark-border)', color: '#fff' }}
                >
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Iran">Iran</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '14px', fontWeight: '750', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {loading ? 'Processing Secure Payment...' : `Pay $${amount}`}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
