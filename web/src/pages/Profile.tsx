import { User, Mail, Award, LogOut } from 'lucide-react';
import useSEO from '../hooks/useSEO';

interface Props {
  user: any;
  setUser: any;
  token: string | null;
  credits: number;
  API_URL: string;
}

export default function Profile({ user, setUser, credits }: Props) {
  useSEO(
    "Candidate Account & Subscription - ResumeOK",
    "View your account status, active AI plan, credit balance, and uploaded resume assets."
  );

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    window.location.hash = '/login';
  };

  return (
    <div className="resumeok-page-container">
      <div className="resumeok-page-header">
        <span className="resumeok-badge resumeok-badge-blue" style={{ marginBottom: '12px' }}>
          <User className="w-3.5 h-3.5" /> USER ACCOUNT PORTAL
        </span>
        <h1 className="resumeok-page-title">Candidate Profile & Credits</h1>
        <p className="resumeok-page-subtitle">
          Manage your account details, active Pro subscription, and remaining AI generation credits.
        </p>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* User Card */}
        <div className="resumeok-card-sand" style={{ padding: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', color: '#141414' }}>
              {user?.name || 'Saman Kazempour'}
            </h2>
            <span className="resumeok-badge resumeok-badge-green">PRO JOB SEEKER</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#555555', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail className="w-4 h-4 text-gray-700" /> {user?.email || 'saman@resumeok.com'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award className="w-4 h-4 text-gray-700" /> Available AI Credits: <strong style={{ color: '#141414' }}>{credits} Credits</strong>
            </div>
          </div>

          <button className="btn-resumeok-outline" onClick={handleLogout} style={{ color: '#dc2626', borderColor: '#fca5a5' }}>
            <LogOut className="w-4 h-4 mr-2 inline-block" /> Log Out of Account
          </button>
        </div>
      </div>
    </div>
  );
}
