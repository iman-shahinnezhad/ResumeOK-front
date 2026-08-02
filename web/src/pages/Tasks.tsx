import { useState } from 'react';
import { Sparkles, Calendar, Users, Share2, Check } from 'lucide-react';
import useSEO from '../hooks/useSEO';

export default function Tasks() {
  useSEO("Earn Credits & Daily Rewards", "Claim free AI credits daily by completing quick check-ins and referring friends.");

  const [claimedStreak, setClaimedStreak] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleClaimStreak = () => {
    setClaimedStreak(true);
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText('https://resumeok.app/invite?ref=ALEX2026');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="container page-wrapper animate-fade-in">
      <div className="page-header">
        <div className="hero-tag" style={{ margin: '0 auto 16px' }}>
          <Sparkles className="w-4 h-4 mr-1.5 text-amber-400" />
          Free AI Credits
        </div>
        <h1 className="page-title">Daily Tasks & Rewards</h1>
        <p className="page-subtitle">
          Earn free ResumeOK AI credits by checking in daily, sharing with friends, or trying out new features.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Daily Streak Card */}
        <div className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '16px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '800' }}>Daily Check-In</h3>
                <span style={{ fontSize: '13px', color: 'var(--dark-text-secondary)' }}>Streak: 4 Days</span>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--dark-text-secondary)', marginBottom: '24px' }}>
              Log in every day to claim +15 bonus credits for your resume scans and cover letter generations.
            </p>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', backgroundColor: claimedStreak ? '#10b981' : '#f59e0b', color: '#000', fontWeight: '800' }}
            disabled={claimedStreak}
            onClick={handleClaimStreak}
          >
            {claimedStreak ? (
              <>
                <Check className="w-4 h-4 mr-2" /> +15 Credits Claimed Today!
              </>
            ) : (
              'Claim +15 Daily Credits'
            )}
          </button>
        </div>

        {/* Invite Friends Card */}
        <div className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '16px', background: 'rgba(79, 70, 229, 0.15)', color: '#6366f1' }}>
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '800' }}>Invite Colleagues</h3>
                <span style={{ fontSize: '13px', color: '#818cf8', fontWeight: '700' }}>+50 Credits per Referral</span>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--dark-text-secondary)', marginBottom: '24px' }}>
              Share your referral link with job seekers. Both you and your friend get 50 bonus credits on sign up.
            </p>
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCopyInvite}>
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 mr-2 text-emerald-400" /> Link Copied!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" /> Copy Referral Link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
