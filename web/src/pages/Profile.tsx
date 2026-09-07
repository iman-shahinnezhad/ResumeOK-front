import React, { useState, useEffect } from 'react';
import { User, Award, LogOut, Briefcase, GraduationCap, ShieldAlert, FileText, Save, CheckCircle2, Upload } from 'lucide-react';
import useSEO from '../hooks/useSEO';

interface Props {
  user: any;
  setUser: any;
  token: string | null;
  credits: number;
  API_URL: string;
}

export default function Profile({ user, setUser, credits, API_URL }: Props) {
  useSEO(
    "Candidate Profile & Autofill Settings - ApplyDesk",
    "Edit your full candidate profile, work experience, education, demographics, and uploaded PDF assets for 1-Click Autofill."
  );

  const [activeTab, setActiveTab] = useState<'personal' | 'work' | 'education' | 'skills' | 'demographics' | 'documents'>('personal');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile Form State
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    country: '',
    linkedinUrl: '',
    portfolioUrl: '',
    // Current Work Experience
    companyName: '',
    jobTitle: '',
    workStartDate: '',
    workEndDate: '',
    workDescription: '',
    // Education
    schoolName: '',
    degree: '',
    discipline: '',
    eduStartDate: '',
    eduEndDate: '',
    // Skills
    skills: '',
    // EEO / Demographics
    gender: 'Decline to self-identify',
    race: 'Decline to self-identify',
    veteranStatus: 'Decline to self-identify',
    disabilityStatus: 'Decline to self-identify',
    // PDF Assets
    resumeFileName: '',
    resumeBase64: '',
    coverLetterText: ''
  });

  useEffect(() => {
    // Load from local storage or user object
    const saved = localStorage.getItem('user_profile_data');
    if (saved) {
      try {
        setProfile(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) { console.error(e); }
    } else if (user) {
      const parts = (user.name || '').split(' ');
      setProfile(prev => ({
        ...prev,
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  const handleSaveProfile = async () => {
    localStorage.setItem('user_profile_data', JSON.stringify(profile));
    
    // If backend token exists, sync with API
    if (user && API_URL) {
      try {
        await fetch(`${API_URL}/api/user/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify(profile)
        });
      } catch(e) { console.error('API sync error:', e); }
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResumeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const b64 = result.split(',')[1] || '';
        setProfile(prev => ({
          ...prev,
          resumeFileName: file.name,
          resumeBase64: b64
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    window.location.hash = '/login';
  };

  return (
    <div className="resumeok-page-container">
      {/* Page Header */}
      <div className="resumeok-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span className="resumeok-badge resumeok-badge-blue">
                <User className="w-3.5 h-3.5" /> CANDIDATE PROFILE HUB
              </span>
              <span className="resumeok-badge resumeok-badge-green">
                <Award className="w-3.5 h-3.5" /> {credits || 100} AI CREDITS
              </span>
            </div>
            <h1 className="resumeok-page-title">Candidate Profile & Autofill Settings</h1>
            <p className="resumeok-page-subtitle">
              Manage your personal info, work history, education, and PDF assets used by 1-Click Autofill and the Chrome Extension.
            </p>
          </div>
          <button className="btn-resumeok-black" onClick={handleSaveProfile} style={{ gap: '8px', padding: '12px 24px' }}>
            {saveSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
            {saveSuccess ? 'Saved Successfully!' : 'Save Profile Changes'}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px' }}>
        {/* Navigation Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            className={`btn-resumeok-outline ${activeTab === 'personal' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('personal')}
            style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '14px 18px', backgroundColor: activeTab === 'personal' ? '#141414' : 'transparent', color: activeTab === 'personal' ? '#ffffff' : '#141414' }}
          >
            <User className="w-4 h-4 mr-3" /> Personal Info
          </button>
          <button
            className={`btn-resumeok-outline ${activeTab === 'work' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('work')}
            style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '14px 18px', backgroundColor: activeTab === 'work' ? '#141414' : 'transparent', color: activeTab === 'work' ? '#ffffff' : '#141414' }}
          >
            <Briefcase className="w-4 h-4 mr-3" /> Work Experience
          </button>
          <button
            className={`btn-resumeok-outline ${activeTab === 'education' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('education')}
            style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '14px 18px', backgroundColor: activeTab === 'education' ? '#141414' : 'transparent', color: activeTab === 'education' ? '#ffffff' : '#141414' }}
          >
            <GraduationCap className="w-4 h-4 mr-3" /> Education
          </button>
          <button
            className={`btn-resumeok-outline ${activeTab === 'skills' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('skills')}
            style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '14px 18px', backgroundColor: activeTab === 'skills' ? '#141414' : 'transparent', color: activeTab === 'skills' ? '#ffffff' : '#141414' }}
          >
            <Award className="w-4 h-4 mr-3" /> Skills & Expertise
          </button>
          <button
            className={`btn-resumeok-outline ${activeTab === 'demographics' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('demographics')}
            style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '14px 18px', backgroundColor: activeTab === 'demographics' ? '#141414' : 'transparent', color: activeTab === 'demographics' ? '#ffffff' : '#141414' }}
          >
            <ShieldAlert className="w-4 h-4 mr-3" /> EEO & Demographics
          </button>
          <button
            className={`btn-resumeok-outline ${activeTab === 'documents' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('documents')}
            style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '14px 18px', backgroundColor: activeTab === 'documents' ? '#141414' : 'transparent', color: activeTab === 'documents' ? '#ffffff' : '#141414' }}
          >
            <FileText className="w-4 h-4 mr-3" /> PDF Attachments
          </button>

          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e5e3dc' }}>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
              Logged in as: <strong>{user?.email || profile.email || 'Guest Candidate'}</strong>
            </div>
            <button className="btn-resumeok-outline" onClick={handleLogout} style={{ width: '100%', color: '#dc2626', borderColor: '#fca5a5' }}>
              <LogOut className="w-4 h-4 mr-2" /> Log Out
            </button>
          </div>
        </div>

        {/* Content Card Area */}
        <div className="resumeok-card-white" style={{ padding: '36px', borderRadius: '12px', border: '1px solid #e5e3dc' }}>
          {activeTab === 'personal' && (
            <div>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', marginBottom: '24px', color: '#141414' }}>
                Personal Contact Details
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>First Name</label>
                  <input className="resumeok-input" value={profile.firstName} onChange={e => setProfile({...profile, firstName: e.target.value})} placeholder="e.g. Omid" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Last Name</label>
                  <input className="resumeok-input" value={profile.lastName} onChange={e => setProfile({...profile, lastName: e.target.value})} placeholder="e.g. Moradi" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Email Address</label>
                  <input className="resumeok-input" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} placeholder="omid@example.com" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Phone Number</label>
                  <input className="resumeok-input" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} placeholder="+1 555-0192" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>City / Location</label>
                  <input className="resumeok-input" value={profile.city} onChange={e => setProfile({...profile, city: e.target.value})} placeholder="San Francisco, CA" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Country</label>
                  <input className="resumeok-input" value={profile.country} onChange={e => setProfile({...profile, country: e.target.value})} placeholder="United States" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>LinkedIn Profile URL</label>
                  <input className="resumeok-input" value={profile.linkedinUrl} onChange={e => setProfile({...profile, linkedinUrl: e.target.value})} placeholder="https://linkedin.com/in/username" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Portfolio / Personal Website</label>
                  <input className="resumeok-input" value={profile.portfolioUrl} onChange={e => setProfile({...profile, portfolioUrl: e.target.value})} placeholder="https://myportfolio.com" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'work' && (
            <div>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', marginBottom: '24px', color: '#141414' }}>
                Current / Recent Work Experience
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Company / Employer Name</label>
                  <input className="resumeok-input" value={profile.companyName} onChange={e => setProfile({...profile, companyName: e.target.value})} placeholder="e.g. Acme Corp" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Job Title / Role</label>
                  <input className="resumeok-input" value={profile.jobTitle} onChange={e => setProfile({...profile, jobTitle: e.target.value})} placeholder="e.g. Senior Software Engineer" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Start Date</label>
                  <input className="resumeok-input" value={profile.workStartDate} onChange={e => setProfile({...profile, workStartDate: e.target.value})} placeholder="e.g. Jan 2022" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>End Date</label>
                  <input className="resumeok-input" value={profile.workEndDate} onChange={e => setProfile({...profile, workEndDate: e.target.value})} placeholder="e.g. Present" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'education' && (
            <div>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', marginBottom: '24px', color: '#141414' }}>
                Highest Education
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>School / University Name</label>
                  <input className="resumeok-input" value={profile.schoolName} onChange={e => setProfile({...profile, schoolName: e.target.value})} placeholder="e.g. Stanford University" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Degree</label>
                  <input className="resumeok-input" value={profile.degree} onChange={e => setProfile({...profile, degree: e.target.value})} placeholder="e.g. Bachelor of Science" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Discipline / Major</label>
                  <input className="resumeok-input" value={profile.discipline} onChange={e => setProfile({...profile, discipline: e.target.value})} placeholder="e.g. Computer Science" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Graduation Year / Date</label>
                  <input className="resumeok-input" value={profile.eduEndDate} onChange={e => setProfile({...profile, eduEndDate: e.target.value})} placeholder="e.g. May 2021" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', marginBottom: '24px', color: '#141414' }}>
                Core Skills & Competencies
              </h2>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Skills (comma separated)</label>
                <textarea
                  className="resumeok-input"
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  value={profile.skills}
                  onChange={e => setProfile({...profile, skills: e.target.value})}
                  placeholder="React, TypeScript, Node.js, Python, AWS, Docker, GraphQL, REST APIs"
                />
              </div>
            </div>
          )}

          {activeTab === 'demographics' && (
            <div>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', marginBottom: '24px', color: '#141414' }}>
                Equal Opportunity & Demographics (EEO)
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Gender</label>
                  <select className="resumeok-input" value={profile.gender} onChange={e => setProfile({...profile, gender: e.target.value})}>
                    <option value="Decline to self-identify">Decline to self-identify</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Race / Ethnicity</label>
                  <select className="resumeok-input" value={profile.race} onChange={e => setProfile({...profile, race: e.target.value})}>
                    <option value="Decline to self-identify">Decline to self-identify</option>
                    <option value="Asian">Asian</option>
                    <option value="White">White</option>
                    <option value="Black or African American">Black or African American</option>
                    <option value="Hispanic or Latino">Hispanic or Latino</option>
                    <option value="Two or More Races">Two or More Races</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Veteran Status</label>
                  <select className="resumeok-input" value={profile.veteranStatus} onChange={e => setProfile({...profile, veteranStatus: e.target.value})}>
                    <option value="Decline to self-identify">Decline to self-identify</option>
                    <option value="I am not a protected veteran">I am not a protected veteran</option>
                    <option value="I identify as one or more protected veterans">I identify as one or more protected veterans</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Disability Status</label>
                  <select className="resumeok-input" value={profile.disabilityStatus} onChange={e => setProfile({...profile, disabilityStatus: e.target.value})}>
                    <option value="Decline to self-identify">Decline to self-identify</option>
                    <option value="No, I do not have a disability">No, I do not have a disability</option>
                    <option value="Yes, I have a disability">Yes, I have a disability</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', marginBottom: '24px', color: '#141414' }}>
                PDF Resume & Cover Letter Attachments
              </h2>
              
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#141414', marginBottom: '8px' }}>
                  Upload PDF Resume File
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <label className="btn-resumeok-black" style={{ cursor: 'pointer', gap: '8px' }}>
                    <Upload className="w-4 h-4" /> Choose Resume PDF
                    <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleResumeFileUpload} />
                  </label>
                  {profile.resumeFileName ? (
                    <span className="resumeok-badge resumeok-badge-green">
                      <FileText className="w-3.5 h-3.5" /> {profile.resumeFileName} (Loaded)
                    </span>
                  ) : (
                    <span style={{ fontSize: '13px', color: '#666' }}>No PDF selected yet</span>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#141414', marginBottom: '8px' }}>
                  Default Cover Letter Text
                </label>
                <textarea
                  className="resumeok-input"
                  style={{ minHeight: '140px', resize: 'vertical' }}
                  value={profile.coverLetterText}
                  onChange={e => setProfile({...profile, coverLetterText: e.target.value})}
                  placeholder="Dear Hiring Manager, I am excited to apply..."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
