import { useState } from 'react';
import { User, Briefcase, GraduationCap, Code, Award, Globe, Plus, Check, ShieldCheck } from 'lucide-react';
import useSEO from '../hooks/useSEO';

export default function ProfileSections() {
  useSEO("Profile & Resume Sections", "Manage your profile, work experience, education, skills, awards, and certificates.");

  const [activeTab, setActiveTab] = useState<'personal' | 'experience' | 'education' | 'skills' | 'projects' | 'awards' | 'certificates'>('personal');

  // State forms
  const [personal, setPersonal] = useState({
    fullName: 'Alex Turner',
    email: 'alex.turner@example.com',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco, CA',
    title: 'Senior Software Engineer',
    website: 'https://alexturner.dev',
    linkedin: 'https://linkedin.com/in/alexturner',
    summary: 'Experienced Senior Frontend & Full Stack Software Engineer with 6+ years of building web and mobile applications using React, TypeScript, and modern AI pipelines.'
  });

  const [skills, setSkills] = useState(['React', 'TypeScript', 'Node.js', 'Next.js', 'Python', 'Tailwind CSS', 'GraphQL', 'PostgreSQL']);
  const [newSkill, setNewSkill] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const addSkill = () => {
    if (!newSkill.trim()) return;
    setSkills([...skills, newSkill.trim()]);
    setNewSkill('');
  };

  const removeSkill = (sk: string) => {
    setSkills(skills.filter(s => s !== sk));
  };

  return (
    <div className="container page-wrapper animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Master Profile & Sections</h1>
        <p className="page-subtitle">
          Keep your professional details updated. ResumeOK uses this master data to build and autofill your resumes instantly.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px' }}>
        {/* Navigation Sidebar */}
        <div className="card" style={{ padding: '16px', height: 'fit-content' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { id: 'personal', label: 'Personal Details & Bio', icon: User },
              { id: 'experience', label: 'Work Experience', icon: Briefcase },
              { id: 'education', label: 'Education & Degrees', icon: GraduationCap },
              { id: 'skills', label: 'Skills & Proficiencies', icon: Code },
              { id: 'projects', label: 'Featured Projects', icon: Globe },
              { id: 'awards', label: 'Awards & Honors', icon: Award },
              { id: 'certificates', label: 'Certificates & Licenses', icon: ShieldCheck },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    textAlign: 'left',
                    backgroundColor: activeTab === tab.id ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                    color: activeTab === tab.id ? '#ffffff' : 'var(--dark-text-secondary)',
                    border: activeTab === tab.id ? '1px solid rgba(79, 70, 229, 0.3)' : '1px solid transparent'
                  }}
                >
                  <Icon className="w-4 h-4 text-indigo-400" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Form Content */}
        <div className="card" style={{ padding: '32px' }}>
          {activeTab === 'personal' && (
            <div>
              <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Personal Details & Professional Summary</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dark-text-secondary)' }}>Full Name</label>
                  <input type="text" value={personal.fullName} onChange={e => setPersonal({ ...personal, fullName: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dark-text-secondary)' }}>Job Title</label>
                  <input type="text" value={personal.title} onChange={e => setPersonal({ ...personal, title: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dark-text-secondary)' }}>Email</label>
                  <input type="email" value={personal.email} onChange={e => setPersonal({ ...personal, email: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dark-text-secondary)' }}>Phone</label>
                  <input type="text" value={personal.phone} onChange={e => setPersonal({ ...personal, phone: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dark-text-secondary)' }}>Location</label>
                  <input type="text" value={personal.location} onChange={e => setPersonal({ ...personal, location: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dark-text-secondary)' }}>Website / Portfolio</label>
                  <input type="text" value={personal.website} onChange={e => setPersonal({ ...personal, website: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dark-text-secondary)' }}>Executive Summary</label>
                <textarea rows={5} value={personal.summary} onChange={e => setPersonal({ ...personal, summary: e.target.value })} />
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div>
              <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Skills & Technical Competencies</h2>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <input
                  type="text"
                  placeholder="Add a new skill (e.g., Docker, GraphQL)..."
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSkill()}
                />
                <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={addSkill}>
                  <Plus className="w-4 h-4 mr-2" /> Add Skill
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {skills.map(sk => (
                  <span
                    key={sk}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    {sk}
                    <button onClick={() => removeSkill(sk)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {(activeTab === 'experience' || activeTab === 'education' || activeTab === 'projects' || activeTab === 'awards' || activeTab === 'certificates') && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', textTransform: 'capitalize' }}>{activeTab} Management</h2>
                <button className="btn btn-primary">
                  <Plus className="w-4 h-4 mr-2" /> Add {activeTab}
                </button>
              </div>
              <p style={{ color: 'var(--dark-text-secondary)', fontSize: '14px' }}>
                Manage your entries for {activeTab}. All changes will automatically sync across your resumes.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--dark-border)' }}>
            <button className="btn btn-primary" onClick={handleSave} style={{ minWidth: '140px' }}>
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-emerald-400" /> Saved!
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
