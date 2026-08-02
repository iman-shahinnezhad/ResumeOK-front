import { useState } from 'react';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useSEO from '../hooks/useSEO';

export default function Pricing() {
  useSEO(
    "Simple & Honest Pricing - ResumeOK Pro",
    "Get unlimited AI auto-apply, ATS resume tailoring, insider referral access, and instant interview intelligence for $19/mo."
  );

  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');

  const getPrice = () => {
    switch (billingCycle) {
      case 'annual': return '$12';
      case 'quarterly': return '$15';
      default: return '$19';
    }
  };

  const getSubtext = () => {
    switch (billingCycle) {
      case 'annual': return 'Billed annually ($144/year) • Save 37%';
      case 'quarterly': return 'Billed quarterly ($45/quarter) • Save 20%';
      default: return 'Billed monthly • Cancel anytime';
    }
  };

  return (
    <div className="resumeok-page-container">
      {/* Header */}
      <div className="resumeok-page-header" style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px' }}>
        <span className="resumeok-badge resumeok-badge-blue" style={{ marginBottom: '12px' }}>
          <Sparkles className="w-3.5 h-3.5" /> SIMPLE, TRANSPARENT PRICING
        </span>
        <h1 className="resumeok-page-title" style={{ fontSize: '48px' }}>
          Land your dream job faster.
        </h1>
        <p className="resumeok-page-subtitle" style={{ margin: '0 auto' }}>
          No hidden fees or per-application charges. One subscription unlocks unlimited AI auto-applies, ATS resume scoring, and insider referrals.
        </p>

        {/* Billing Toggle */}
        <div style={{ display: 'inline-flex', gap: '4px', backgroundColor: '#faf9f6', padding: '4px', border: '1px solid #e3dfd5', marginTop: '32px' }}>
          {(['monthly', 'quarterly', 'annual'] as const).map(cycle => (
            <button
              key={cycle}
              onClick={() => setBillingCycle(cycle)}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: '700',
                textTransform: 'capitalize',
                backgroundColor: billingCycle === cycle ? '#141414' : 'transparent',
                color: billingCycle === cycle ? '#ffffff' : '#555555',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {cycle} {cycle === 'annual' && '🔥 37% OFF'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Pricing Box Card */}
      <div className="resumeok-card-sand" style={{ maxWidth: '580px', margin: '0 auto 60px', padding: '52px 40px', textAlign: 'center', position: 'relative' }}>
        <span className="resumeok-badge resumeok-badge-amber" style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', padding: '6px 16px', fontSize: '12px' }}>
          MOST POPULAR FOR ACTIVE JOB SEEKERS
        </span>

        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '32px', color: '#141414', marginBottom: '8px' }}>
          Pro Job Seeker
        </h2>
        <p style={{ fontSize: '14.5px', color: '#555555', marginBottom: '24px' }}>
          Full access to AI Auto Apply, Smart Resume Match, ATS Scoring, Cover Letters & Insider Referrals.
        </p>

        <div style={{ fontFamily: 'Georgia, serif', fontSize: '64px', fontWeight: '400', color: '#141414', lineHeight: '1', marginBottom: '4px' }}>
          {getPrice()}<span style={{ fontSize: '18px', color: '#666666', fontFamily: 'sans-serif' }}>/month</span>
        </div>
        <div style={{ fontSize: '13px', color: '#777777', fontWeight: '600', marginBottom: '32px' }}>
          {getSubtext()}
        </div>

        <button 
          className="btn-resumeok-black" 
          onClick={() => navigate('/checkout')}
          style={{ width: '100%', padding: '16px', fontSize: '15px', justifyContent: 'center', marginBottom: '32px' }}
        >
          Get Started Now <ArrowRight className="w-4 h-4 ml-1 inline-block" />
        </button>

        {/* Feature List */}
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #dcd7cc', paddingTop: '28px' }}>
          {[
            'Unlimited Daily AI Auto-Applies across Workday, Greenhouse & Taleo',
            'Smart Match Resume vs Job Description Gap Analysis',
            'Recruiter-Level ATS Resume Scoring & Bullet Optimizer',
            'Tailored AI Cover Letter Generator with Executive Tones',
            'Insider Employee Referral Finder at Target Companies',
            'Application Pipeline Dashboard & Interview Intelligence',
            '24/7 Priority Candidate Support & 7-Day Money-Back Guarantee'
          ].map((feat, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#2c2c2c' }}>
              <Check className="w-4 h-4 text-green-600 flex-shrink-0 style-icon" style={{ marginTop: '2px' }} />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
