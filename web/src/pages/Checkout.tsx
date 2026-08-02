import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle, ArrowRight } from 'lucide-react';
import useSEO from '../hooks/useSEO';

interface Props {
  user: any;
  setUser: any;
  token: string | null;
  API_URL: string;
}

export default function Checkout({ setUser }: Props) {
  useSEO(
    "Checkout & Upgrade to Pro - ResumeOK",
    "Complete your Pro Job Seeker subscription for unlimited AI auto-applies and instant ATS resume matching."
  );

  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    setTimeout(() => {
      setProcessing(false);
      setCompleted(true);
      if (setUser) {
        setUser((prev: any) => ({ ...prev, plan: 'Pro', credit: 9999 }));
      }
    }, 1500);
  };

  return (
    <div className="resumeok-page-container">
      <div className="resumeok-page-header" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 36px' }}>
        <span className="resumeok-badge resumeok-badge-green" style={{ marginBottom: '12px' }}>
          <ShieldCheck className="w-3.5 h-3.5" /> 256-BIT ENCRYPTED SECURE CHECKOUT
        </span>
        <h1 className="resumeok-page-title" style={{ fontSize: '36px' }}>
          Upgrade to Pro Job Seeker
        </h1>
        <p className="resumeok-page-subtitle" style={{ margin: '0 auto' }}>
          Unlock unlimited AI auto-applies, ATS resume scoring, and insider employee referrals.
        </p>
      </div>

      {!completed ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', maxWidth: '900px', margin: '0 auto' }}>
          {/* Payment Form Card */}
          <div className="resumeok-card-cream" style={{ padding: '36px' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#141414', marginBottom: '20px' }}>
              Payment Information
            </h2>

            <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'block', marginBottom: '6px' }}>Cardholder Name</label>
                <input type="text" className="resumeok-input" placeholder="Marcus Chen" required />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'block', marginBottom: '6px' }}>Card Number</label>
                <input type="text" className="resumeok-input" placeholder="4242 •••• •••• 4242" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'block', marginBottom: '6px' }}>Expiry Date</label>
                  <input type="text" className="resumeok-input" placeholder="MM/YY" required />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'block', marginBottom: '6px' }}>CVC / CVV</label>
                  <input type="text" className="resumeok-input" placeholder="123" required />
                </div>
              </div>

              <button className="btn-resumeok-black" type="submit" disabled={processing} style={{ width: '100%', padding: '16px', fontSize: '15px', justifyContent: 'center', marginTop: '12px' }}>
                {processing ? 'Processing Payment...' : 'Subscribe Now • $19 / Month'}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="resumeok-card-sand" style={{ padding: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#141414', marginBottom: '16px' }}>Order Summary</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #dcd7cc', fontSize: '14px' }}>
                <span>Pro Job Seeker (Monthly)</span>
                <strong>$19.00</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '16px', fontWeight: '800', color: '#141414' }}>
                <span>Total Due Today</span>
                <span>$19.00</span>
              </div>
            </div>

            <div style={{ fontSize: '13px', color: '#666666', lineHeight: '1.5', paddingTop: '20px', borderTop: '1px solid #dcd7cc' }}>
              🔒 Covered by our 7-day money-back guarantee. Cancel anytime with 1 click in settings.
            </div>
          </div>
        </div>
      ) : (
        <div className="resumeok-card-sand" style={{ maxWidth: '600px', margin: '40px auto', padding: '48px', textAlign: 'center' }}>
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '32px', color: '#141414', marginBottom: '12px' }}>Subscription Active!</h2>
          <p style={{ fontSize: '15px', color: '#555555', marginBottom: '24px' }}>
            Welcome to ResumeOK Pro. Your account now has unlimited AI auto-applies and ATS matching scans.
          </p>
          <button className="btn-resumeok-black" onClick={() => navigate('/jobs')} style={{ padding: '14px 28px' }}>
            Go to Job Tracker & Auto-Apply <ArrowRight className="w-4 h-4 ml-1 inline-block" />
          </button>
        </div>
      )}
    </div>
  );
}
