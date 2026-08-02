import { useState } from 'react';
import { Settings as SettingsIcon, Shield, Save } from 'lucide-react';
import useSEO from '../hooks/useSEO';

export default function Settings() {
  useSEO(
    "Account Settings & Privacy Preferences - ResumeOK",
    "Manage your notification preferences, auto-apply security settings, and data privacy options."
  );

  const [saved, setSaved] = useState(false);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="resumeok-page-container">
      <div className="resumeok-page-header">
        <span className="resumeok-badge resumeok-badge-blue" style={{ marginBottom: '12px' }}>
          <SettingsIcon className="w-3.5 h-3.5" /> SYSTEM & PRIVACY CONTROL
        </span>
        <h1 className="resumeok-page-title">Settings & Preferences</h1>
        <p className="resumeok-page-subtitle">
          Configure AI application parameters, notification alerts, and enterprise-grade privacy controls.
        </p>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Auto Apply Settings */}
        <div className="resumeok-card-cream" style={{ padding: '36px' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#141414', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield className="w-5 h-5 text-gray-700" /> AI Auto-Apply Safety Limits
          </h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #e3dfd5' }}>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#141414' }}>Daily Application Cap</div>
              <div style={{ fontSize: '13px', color: '#666666' }}>Limit auto-submissions to 15 matching applications per day</div>
            </div>
            <input type="checkbox" checked={autoApplyEnabled} onChange={(e) => setAutoApplyEnabled(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#141414' }}>Email Interview Alerts</div>
              <div style={{ fontSize: '13px', color: '#666666' }}>Receive real-time notifications when a recruiter responds</div>
            </div>
            <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
          </div>
        </div>

        {/* Save Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn-resumeok-black" onClick={handleSave} style={{ padding: '12px 28px' }}>
            <Save className="w-4 h-4 mr-2 inline-block" /> {saved ? 'Preferences Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
