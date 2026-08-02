import { useState } from 'react';
import { Save, Sparkles } from 'lucide-react';
import useSEO from '../hooks/useSEO';

export default function ProfileSections() {
  useSEO(
    "Candidate Target Profile - ResumeOK",
    "Set your target job titles, preferred locations, target salary ranges, and core skill keywords for AI matching."
  );

  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({
    targetTitle: 'Senior Full Stack Engineer',
    desiredSalary: '$160,000 - $190,000',
    preferredLocation: 'Remote (US/Canada)',
    skills: 'React, TypeScript, Node.js, GraphQL, System Architecture, AWS'
  });

  const handleSave = () => {
    localStorage.setItem('candidate_profile', JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="resumeok-page-container">
      <div className="resumeok-page-header">
        <span className="resumeok-badge resumeok-badge-blue" style={{ marginBottom: '12px' }}>
          <Sparkles className="w-3.5 h-3.5" /> AI TARGETING MATRIX
        </span>
        <h1 className="resumeok-page-title">Candidate Career Preferences</h1>
        <p className="resumeok-page-subtitle">
          Configure your target role titles, minimum compensation expectations, and key skills to train your AI Auto-Apply agent.
        </p>
      </div>

      <div className="resumeok-card-cream" style={{ maxWidth: '720px', margin: '0 auto', padding: '40px' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#141414', marginBottom: '24px' }}>
          Target Criteria
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'block', marginBottom: '6px' }}>
              Primary Target Job Titles *
            </label>
            <input
              type="text"
              className="resumeok-input"
              value={profile.targetTitle}
              onChange={(e) => setProfile({ ...profile, targetTitle: e.target.value })}
              placeholder="e.g. Senior Frontend Developer, Lead Architect"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'block', marginBottom: '6px' }}>
                Minimum Compensation
              </label>
              <input
                type="text"
                className="resumeok-input"
                value={profile.desiredSalary}
                onChange={(e) => setProfile({ ...profile, desiredSalary: e.target.value })}
                placeholder="e.g. $160,000"
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'block', marginBottom: '6px' }}>
                Location Preference
              </label>
              <input
                type="text"
                className="resumeok-input"
                value={profile.preferredLocation}
                onChange={(e) => setProfile({ ...profile, preferredLocation: e.target.value })}
                placeholder="e.g. Remote / San Francisco"
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'block', marginBottom: '6px' }}>
              Core Technical Skills (Comma-separated for ATS Matcher)
            </label>
            <textarea
              rows={4}
              className="resumeok-input"
              value={profile.skills}
              onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
              placeholder="React, TypeScript, System Architecture, Node.js..."
            />
          </div>

          <button className="btn-resumeok-black" onClick={handleSave} style={{ padding: '14px', width: '100%', justifyContent: 'center', marginTop: '12px' }}>
            <Save className="w-4 h-4 mr-2 inline-block" /> {saved ? 'Profile Preferences Saved!' : 'Save Targeting Criteria'}
          </button>
        </div>
      </div>
    </div>
  );
}
