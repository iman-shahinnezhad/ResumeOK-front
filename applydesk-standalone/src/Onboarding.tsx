import React, { useState, useRef } from 'react';
import './onboarding.css';
import logoDark from './assets/logo.svg';
import slider1 from './assets/slider1.webp';
import slider2 from './assets/slider2.webp';
import { parseResumeFile } from './utils/resumeParser';
import { getEffectiveUserId } from './utils/storage';

interface OnboardingProps {
  user?: any;
  onComplete: () => void;
}

const CATEGORIES_DATA = [
  {
    name: 'Software & Engineering',
    roles: [
      'Software Engineer',
      'Frontend Engineer',
      'Backend Engineer',
      'Full Stack Engineer',
      'Mobile Engineer',
      'iOS Engineer',
      'Android Engineer',
      'DevOps Engineer',
      'Systems Architect',
      'Site Reliability Engineer',
      'Cloud Engineer',
      'Data Engineer',
      'ML Engineer',
      'QA Engineer',
      'Security Analyst'
    ]
  },
  {
    name: 'Design & UX',
    roles: [
      'Product Designer',
      'UI/UX Designer',
      'UX Researcher',
      'Graphic Designer',
      'Visual Designer',
      'Motion Designer',
      'Web Designer',
      'Art Director'
    ]
  },
  {
    name: 'Product & Project',
    roles: [
      'Product Manager',
      'Product Owner',
      'Technical Product Manager',
      'Associate Product Manager',
      'Project Manager',
      'Scrum Master'
    ]
  },
  {
    name: 'Data & AI',
    roles: [
      'Data Scientist',
      'Data Analyst',
      'Business Intelligence Analyst',
      'Machine Learning Engineer',
      'AI Researcher',
      'AI Product Manager'
    ]
  },
  {
    name: 'Marketing & Sales',
    roles: [
      'Growth Marketer',
      'Marketing Manager',
      'SEO Specialist',
      'Account Executive',
      'Business Development Rep',
      'Customer Success Manager'
    ]
  },
  {
    name: 'Finance & Operations',
    roles: [
      'Financial Analyst',
      'Accountant',
      'Operations Manager',
      'Business Analyst',
      'Compliance Officer'
    ]
  }
];

const POPULAR_PREFERENCES = [
  { label: 'Remote work', emoji: '✈️' },
  { label: 'High salary', emoji: '💸' },
  { label: 'Career growth', emoji: '🚀' },
  { label: 'Innovative Tech', emoji: '🧠' },
  { label: 'Flexible Hours', emoji: '⏱️' },
  { label: 'Cool Startup', emoji: '😎' },
  { label: 'Job stability', emoji: '🧘' },
  { label: 'Challenging Work', emoji: '🔥' },
  { label: 'Great Culture', emoji: '👥' }
];

const EXPERIENCE_LEVELS = [
  { id: 'Internship', label: 'Internship', desc: 'Looking for initial experience' },
  { id: 'Entry level & Graduate', label: 'Entry Level (0-1 yrs)', desc: 'New graduate or entering tech' },
  { id: 'Junior (1-2 years)', label: 'Junior (1-2 yrs)', desc: 'Early career contributor' },
  { id: 'Mid Level (3-5 years)', label: 'Mid Level (3-5 yrs)', desc: 'Experienced autonomous professional' },
  { id: 'Senior (6-9 years)', label: 'Senior (6-9 yrs)', desc: 'Deep technical mastery & mentorship' },
  { id: 'Expert & Leadership (10+ years)', label: 'Lead / Executive (10+ yrs)', desc: 'Strategic architecture & leadership' }
];

const CHALLENGES_LIST = [
  { id: 'Not applying enough', label: 'Not applying to enough jobs', icon: '📝' },
  { id: 'Can’t land interviews', label: 'Struggling to land interviews', icon: '🎯' },
  { id: 'Not ready yet', label: 'Need to tailor resume for every job', icon: '⏳' },
  { id: 'Lack of great job offers', label: 'Lack of relevant or high-paying roles', icon: '💼' }
];

const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Germany',
  'Australia',
  'Netherlands',
  'France',
  'Ireland',
  'Spain',
  'New Zealand'
];

type OnboardingStep =
  | 'intro'
  | 'upload'
  | 'name'
  | 'email'
  | 'jobs'
  | 'interests'
  | 'experience'
  | 'location'
  | 'salary'
  | 'challenge'
  | 'loading';

export default function Onboarding({ user, onComplete }: OnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>('intro');
  const [history, setHistory] = useState<OnboardingStep[]>([]);

  // Form states
  const [firstName, setFirstName] = useState(user?.name ? user.name.split(' ')[0] : '');
  const [lastName, setLastName] = useState(user?.name ? user.name.split(' ').slice(1).join(' ') : '');
  const [email, setEmail] = useState(user?.email || '');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleSearch, setRoleSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(CATEGORIES_DATA[0].name);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>(['Remote work', 'Career growth']);
  const [selectedExperience, setSelectedExperience] = useState('Mid Level (3-5 years)');
  const [country, setCountry] = useState('United States');
  const [city, setCity] = useState('');
  const [openToRemote, setOpenToRemote] = useState(true);
  const [minSalary, setMinSalary] = useState(120000);
  const [maxSalary, setMaxSalary] = useState(220000);
  const [selectedChallenge, setSelectedChallenge] = useState('Can’t land interviews');

  // Resume Upload & Parsing states
  const [isParsing, setIsParsing] = useState(false);
  const [parsedFileName, setParsedFileName] = useState('');
  const [parsedFileSize, setParsedFileSize] = useState('');
  const [parsedProfileCache, setParsedProfileCache] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading animation step counter (Step 11)
  const [loadingProgress, setLoadingProgress] = useState(15);
  const [loadingStage, setLoadingStage] = useState('Analyzing credentials...');

  const row1Images = Array(6).fill(slider1);
  const row2Images = Array(6).fill(slider2);

  const goToStep = (nextStep: OnboardingStep) => {
    setHistory(prev => [...prev, step]);
    setStep(nextStep);
  };

  const handleBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setStep(prev);
    } else {
      setStep('intro');
    }
  };

  // Step Progress Calculation
  const STEP_ORDER: OnboardingStep[] = [
    'intro',
    'upload',
    'name',
    'email',
    'jobs',
    'interests',
    'experience',
    'location',
    'salary',
    'challenge',
    'loading'
  ];
  const currentIndex = STEP_ORDER.indexOf(step);
  const progressPercent = Math.max(10, Math.round(((currentIndex + 1) / STEP_ORDER.length) * 100));

  // Resume File Upload & Parsing (Universal Engine matching mobile app)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsedFileName(file.name);
    setParsedFileSize(`${(file.size / 1024).toFixed(0)} KB`);
    setIsParsing(true);

    try {
      // 1. Universal Client + Server Resume Parsing
      const parsedData = await parseResumeFile(file);

      setParsedProfileCache(parsedData);

      // 2. Populate Onboarding Step states
      if (parsedData.firstName) setFirstName(parsedData.firstName);
      if (parsedData.lastName) setLastName(parsedData.lastName);
      if (parsedData.email) setEmail(parsedData.email);
      if (parsedData.city) setCity(parsedData.city);
      if (parsedData.country) setCountry(parsedData.country);
      if (parsedData.targetRole) {
        setSelectedRoles([parsedData.targetRole]);
      }
      if (Array.isArray(parsedData.skills) && parsedData.skills.length > 0) {
        setSelectedSkills(parsedData.skills.slice(0, 10));
      }
      if (parsedData.experienceLevel) {
        const matchedExp = EXPERIENCE_LEVELS.find(e =>
          e.id.toLowerCase().includes(String(parsedData.experienceLevel).toLowerCase())
        );
        if (matchedExp) setSelectedExperience(matchedExp.id);
      }

      // 3. Read file base64 data to store in resumes list
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const resumeItem = {
          id: `resume-${Date.now()}`,
          name: file.name,
          fileName: file.name,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          size: `${(file.size / 1024).toFixed(0)} KB`,
          isDefault: true,
          fileData: result
        };
        try {
          localStorage.removeItem('user_resumes');
          localStorage.removeItem('resumeok_resumes');
          localStorage.setItem('applydesk_resumes', JSON.stringify([resumeItem]));
        } catch (e) {
          try {
            const pruned = { ...resumeItem, fileData: '' };
            localStorage.setItem('applydesk_resumes', JSON.stringify([pruned]));
          } catch (_) {}
        }

        // Pre-save parsed profile into storage so profile sections are ready
        try {
          localStorage.setItem('user_profile_data', JSON.stringify(parsedData));
          localStorage.setItem('candidate_profile', JSON.stringify(parsedData));
        } catch (_) {}

        setTimeout(() => {
          setIsParsing(false);
          goToStep('name');
        }, 800);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error handling resume file:', err);
      setIsParsing(false);
      goToStep('name');
    }
  };

  // Add custom skill
  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills(prev => [...prev, trimmed]);
      setSkillInput('');
    }
  };

  // Final submit & save to DB & localStorage
  const handleFinishOnboarding = async () => {
    goToStep('loading');

    // Simulate realistic AI matching stages
    setLoadingProgress(25);
    setLoadingStage('Analyzing your resume and background...');

    setTimeout(() => {
      setLoadingProgress(55);
      setLoadingStage('Matching with 4,000,000+ real-time jobs...');
    }, 700);

    setTimeout(() => {
      setLoadingProgress(85);
      setLoadingStage('Calculating ATS scores and match percentages...');
    }, 1500);

    setTimeout(async () => {
      setLoadingProgress(100);
      setLoadingStage('Ready! Entering your custom desk...');

      const formattedMin = `$${minSalary.toLocaleString()}`;
      const formattedMax = `$${maxSalary.toLocaleString()}`;
      const desiredSalary = `${formattedMin} - ${formattedMax}`;

      const finalProfile = {
        ...(parsedProfileCache || {}),
        firstName: firstName.trim() || parsedProfileCache?.firstName || 'Applicant',
        lastName: lastName.trim() || parsedProfileCache?.lastName || '',
        name: `${firstName.trim() || parsedProfileCache?.firstName || 'Applicant'} ${lastName.trim() || parsedProfileCache?.lastName || ''}`.trim(),
        email: email.trim() || parsedProfileCache?.email || user?.email || '',
        phone: parsedProfileCache?.phone || '',
        city: city.trim() || parsedProfileCache?.city || 'San Francisco',
        location: city.trim() ? `${city.trim()}, ${country}` : (parsedProfileCache?.location || country),
        country: country || parsedProfileCache?.country || 'United States',
        jobTitle: selectedRoles[0] || parsedProfileCache?.targetRole || 'Software Engineer',
        targetRole: selectedRoles[0] || parsedProfileCache?.targetRole || 'Software Engineer',
        roles: selectedRoles.length > 0 ? selectedRoles : (parsedProfileCache?.roles || ['Software Engineer']),
        skills: selectedSkills.length > 0 ? selectedSkills : (parsedProfileCache?.skills || []),
        interests: selectedPreferences,
        experience: selectedExperience || parsedProfileCache?.experienceLevel || 'Mid Level (3-5 years)',
        desiredSalary: desiredSalary,
        expectedSalary: { min: minSalary, max: maxSalary },
        challenge: selectedChallenge,
        openToRemote: openToRemote,
        workExperiences: parsedProfileCache?.workExperiences || [],
        education: parsedProfileCache?.education || [],
        languages: parsedProfileCache?.languages || [{ id: '1', name: 'English', proficiency: 'Fluent' }],
        projects: parsedProfileCache?.projects || [],
        summary: parsedProfileCache?.summary || '',
        headline: parsedProfileCache?.headline || `${selectedRoles[0] || 'Professional'} | Applicant`,
        linkedinUrl: parsedProfileCache?.linkedinUrl || '',
        githubUrl: parsedProfileCache?.githubUrl || '',
        portfolioUrl: parsedProfileCache?.portfolioUrl || '',
        onboardingCompleted: true
      };

      // Persist in localStorage under all keys
      localStorage.setItem('user_profile_data', JSON.stringify(finalProfile));
      localStorage.setItem('candidate_profile', JSON.stringify(finalProfile));
      localStorage.setItem('resumeok_profile', JSON.stringify(finalProfile));
      localStorage.setItem('onboarding_completed', 'true');

      // Sync to backend DB
      const token = localStorage.getItem('auth_token') || localStorage.getItem('resumeok_token');
      const targetUserId = getEffectiveUserId(user);
      const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3030'
        : 'https://api.applydesk.io';

      if (token) {
        try {
          await fetch(`${apiBase}/api/user/${targetUserId}/profile`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ profile: finalProfile })
          });
        } catch (syncErr) {
          console.warn('Could not sync onboarding profile to server:', syncErr);
        }
      }

      setTimeout(() => {
        onComplete();
      }, 500);
    }, 2200);
  };

  // -------------------------------------------------------------
  // Render Steps
  // -------------------------------------------------------------

  return (
    <div className="onboarding-container">
      {/* Header */}
      <div className="onboarding-header">
        <div className="onboarding-logo">
          <a href="https://applydesk.io" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <img src={logoDark} alt="ApplyDesk Logo" style={{ height: '20px', width: 'auto' }} />
          </a>
        </div>

        {step !== 'intro' && step !== 'loading' && (
          <button className="onboarding-back-btn" onClick={handleBack} title="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
        )}

        <div className="onboarding-progress">
          <div className="onboarding-progress-bar" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      {/* STEP 1: INTRO */}
      {step === 'intro' && (
        <div className="onboarding-step-view">
          <div className="onboarding-text-content">
            <div className="onboarding-top-text">More than AI.</div>
            <div className="onboarding-title">Engineered</div>
            <div className="onboarding-subtitle">for today's hiring process.</div>
          </div>

          <div className="onboarding-visuals">
            <div className="marquee-row marquee-row-1">
              {row1Images.map((src, idx) => (
                <img key={`r1-${idx}`} src={src} className="marquee-item" alt="Companies" />
              ))}
            </div>
            <div className="marquee-row marquee-row-2">
              {row2Images.map((src, idx) => (
                <img key={`r2-${idx}`} src={src} className="marquee-item" alt="Companies" />
              ))}
            </div>
          </div>

          <div className="companies-pill-container">
            <div className="companies-pill">+1200 Tech Companies Hiring</div>
          </div>

          <div className="onboarding-footer">
            <button className="onboarding-btn primary" onClick={() => goToStep('upload')}>
              Upload Resume (PDF)
            </button>
            <button className="onboarding-text-btn" onClick={() => goToStep('name')}>
              Build from scratch
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: RESUME UPLOAD */}
      {step === 'upload' && (
        <div className="onboarding-step-view">
          {isParsing ? (
            <div className="upload-parsing-state">
              <div className="pulsing-spinner"></div>
              <h2 className="step-title" style={{ marginTop: '24px' }}>Analyzing your resume...</h2>
              <p className="step-subtitle">
                Reading your work history, education, and skills to auto-fill your target roles.
              </p>
            </div>
          ) : (
            <>
              <div className="step-header">
                <h2 className="step-title">Upload your resume</h2>
                <p className="step-subtitle">
                  We'll extract your skills and experience to find 100% matched jobs.
                </p>
              </div>

              <div
                className="upload-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                <div className="dropzone-icon">
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                </div>

                <div className="dropzone-text">
                  <span className="dropzone-primary">Click to upload or drag & drop</span>
                  <span className="dropzone-sub">PDF resume files up to 10MB</span>
                </div>

                {parsedFileName && (
                  <div className="file-badge">
                    ✓ {parsedFileName} ({parsedFileSize})
                  </div>
                )}
              </div>

              <div className="onboarding-footer">
                <button
                  className="onboarding-btn primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse PDF File
                </button>
                <button className="onboarding-text-btn" onClick={() => goToStep('name')}>
                  Build Later / Skip
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 3: NAME */}
      {step === 'name' && (
        <div className="onboarding-step-view">
          <div className="step-header">
            <h2 className="step-title">What should we call you?</h2>
            <p className="step-subtitle">Your legal or preferred applicant name.</p>
          </div>

          <div className="input-group-row">
            <input
              type="text"
              className="onboarding-input"
              placeholder="First Name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              autoFocus
            />
            <input
              type="text"
              className="onboarding-input"
              placeholder="Last Name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && firstName.trim() && lastName.trim()) goToStep('email');
              }}
            />
          </div>

          <div className="onboarding-footer">
            <button
              className="onboarding-btn primary"
              onClick={() => goToStep('email')}
              disabled={!firstName.trim() || !lastName.trim()}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: EMAIL */}
      {step === 'email' && (
        <div className="onboarding-step-view">
          <div className="step-header">
            <h2 className="step-title">What is your email?</h2>
            <p className="step-subtitle">We'll use this for tailored resume delivery and job matches.</p>
          </div>

          <div className="input-group-single">
            <input
              type="email"
              className="onboarding-input"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && email.includes('@')) goToStep('jobs');
              }}
            />
          </div>

          <div className="onboarding-footer">
            <button
              className="onboarding-btn primary"
              onClick={() => goToStep('jobs')}
              disabled={!email.trim() || !email.includes('@')}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: TARGET ROLES */}
      {step === 'jobs' && (
        <div className="onboarding-step-view wide">
          <div className="step-header">
            <h2 className="step-title">What job are you targeting?</h2>
            <p className="step-subtitle">Select or enter your primary target roles.</p>
          </div>

          {/* Selected Roles Chips */}
          {selectedRoles.length > 0 && (
            <div className="selected-chips-wrap">
              {selectedRoles.map(role => (
                <span key={role} className="selected-chip">
                  {role}
                  <button onClick={() => setSelectedRoles(prev => prev.filter(r => r !== role))}>×</button>
                </span>
              ))}
            </div>
          )}

          {/* Search role input */}
          <div className="role-search-wrap">
            <input
              type="text"
              className="onboarding-input"
              placeholder="Search or enter role (e.g. Frontend Engineer, Product Manager)..."
              value={roleSearch}
              onChange={e => setRoleSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const trimmed = roleSearch.trim();
                  if (trimmed && !selectedRoles.includes(trimmed)) {
                    setSelectedRoles(prev => [...prev, trimmed]);
                    setRoleSearch('');
                  }
                }
              }}
            />
            {roleSearch.trim() && (
              <button
                type="button"
                className="add-custom-role-btn"
                onClick={() => {
                  const trimmed = roleSearch.trim();
                  if (trimmed && !selectedRoles.includes(trimmed)) {
                    setSelectedRoles(prev => [...prev, trimmed]);
                    setRoleSearch('');
                  }
                }}
              >
                + Add "{roleSearch.trim()}"
              </button>
            )}
          </div>

          {/* Categories & Roles Grid */}
          <div className="categories-tabs">
            {CATEGORIES_DATA.map(cat => (
              <button
                key={cat.name}
                className={`category-tab ${activeCategory === cat.name ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.name)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="roles-pill-grid">
            {(CATEGORIES_DATA.find(c => c.name === activeCategory)?.roles || []).map(r => {
              const isSelected = selectedRoles.includes(r);
              return (
                <button
                  key={r}
                  className={`role-select-pill ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedRoles(prev =>
                      isSelected ? prev.filter(item => item !== r) : [...prev, r]
                    );
                  }}
                >
                  {isSelected && '✓ '} {r}
                </button>
              );
            })}
          </div>

          <div className="onboarding-footer">
            <button
              className="onboarding-btn primary"
              onClick={() => goToStep('interests')}
              disabled={selectedRoles.length === 0}
            >
              Continue ({selectedRoles.length} selected)
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: SKILLS & PREFERENCES */}
      {step === 'interests' && (
        <div className="onboarding-step-view wide">
          <div className="step-header">
            <h2 className="step-title">Your skills & preferences</h2>
            <p className="step-subtitle">What are your top strengths and work style preferences?</p>
          </div>

          {/* Skills Input & Chips */}
          <div className="skills-adder-wrap">
            <label className="section-small-label">Top Technical & Professional Skills</label>
            <div className="add-skill-bar">
              <input
                type="text"
                className="onboarding-input"
                placeholder="Type skill & press Enter (e.g. React, Python, AWS)..."
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
              />
              <button type="button" className="add-btn" onClick={handleAddSkill}>
                Add
              </button>
            </div>

            <div className="skills-chips-list">
              {selectedSkills.map(s => (
                <span key={s} className="skill-chip">
                  {s}
                  <button onClick={() => setSelectedSkills(prev => prev.filter(item => item !== s))}>×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="preferences-wrap">
            <label className="section-small-label">What matters most in your next job?</label>
            <div className="preferences-grid">
              {POPULAR_PREFERENCES.map(pref => {
                const isSelected = selectedPreferences.includes(pref.label);
                return (
                  <div
                    key={pref.label}
                    className={`preference-card ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedPreferences(prev =>
                        isSelected ? prev.filter(p => p !== pref.label) : [...prev, pref.label]
                      );
                    }}
                  >
                    <span className="pref-emoji">{pref.emoji}</span>
                    <span className="pref-label">{pref.label}</span>
                    {isSelected && <span className="pref-check">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="onboarding-footer">
            <button className="onboarding-btn primary" onClick={() => goToStep('experience')}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: EXPERIENCE */}
      {step === 'experience' && (
        <div className="onboarding-step-view">
          <div className="step-header">
            <h2 className="step-title">Years of experience?</h2>
            <p className="step-subtitle">Helps us filter entry, mid, and senior level roles.</p>
          </div>

          <div className="experience-cards-list">
            {EXPERIENCE_LEVELS.map(exp => {
              const isSelected = selectedExperience === exp.id;
              return (
                <div
                  key={exp.id}
                  className={`selection-card ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedExperience(exp.id)}
                >
                  <div className="selection-card-content">
                    <span className="card-title">{exp.label}</span>
                    <span className="card-desc">{exp.desc}</span>
                  </div>
                  <div className={`radio-dot ${isSelected ? 'active' : ''}`}></div>
                </div>
              );
            })}
          </div>

          <div className="onboarding-footer">
            <button className="onboarding-btn primary" onClick={() => goToStep('location')}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 8: LOCATION */}
      {step === 'location' && (
        <div className="onboarding-step-view">
          <div className="step-header">
            <h2 className="step-title">Where are you looking?</h2>
            <p className="step-subtitle">Target country and city for job matches.</p>
          </div>

          <div className="location-fields-wrap">
            <div className="field-group">
              <label className="field-label">Target Country</label>
              <select
                className="onboarding-select"
                value={country}
                onChange={e => setCountry(e.target.value)}
              >
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">Target City (Optional)</label>
              <input
                type="text"
                className="onboarding-input"
                placeholder="e.g. London, San Francisco, New York..."
                value={city}
                onChange={e => setCity(e.target.value)}
              />
            </div>

            <label className="remote-toggle-label">
              <input
                type="checkbox"
                checked={openToRemote}
                onChange={e => setOpenToRemote(e.target.checked)}
              />
              <span>Open to Remote positions worldwide</span>
            </label>
          </div>

          <div className="onboarding-footer">
            <button className="onboarding-btn primary" onClick={() => goToStep('salary')}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 9: SALARY */}
      {step === 'salary' && (
        <div className="onboarding-step-view">
          <div className="step-header">
            <h2 className="step-title">Target salary range?</h2>
            <p className="step-subtitle">We will prioritize jobs that match your expected compensation.</p>
          </div>

          <div className="salary-display-badge">
            ${minSalary.toLocaleString()} – ${maxSalary.toLocaleString()} <span>/ year</span>
          </div>

          <div className="salary-sliders-wrapper">
            <div className="salary-slider-group">
              <div className="salary-labels">
                <span>Minimum Salary</span>
                <span className="slider-val">${minSalary.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="50000"
                max="500000"
                step="5000"
                value={minSalary}
                onChange={e => {
                  const val = parseInt(e.target.value);
                  setMinSalary(val);
                  if (val > maxSalary) setMaxSalary(val);
                }}
                className="custom-slider"
              />
            </div>

            <div className="salary-slider-group">
              <div className="salary-labels">
                <span>Maximum Salary</span>
                <span className="slider-val">${maxSalary.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="50000"
                max="500000"
                step="5000"
                value={maxSalary}
                onChange={e => {
                  const val = parseInt(e.target.value);
                  setMaxSalary(val);
                  if (val < minSalary) setMinSalary(val);
                }}
                className="custom-slider"
              />
            </div>
          </div>

          <div className="onboarding-footer">
            <button className="onboarding-btn primary" onClick={() => goToStep('challenge')}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 10: CHALLENGE */}
      {step === 'challenge' && (
        <div className="onboarding-step-view">
          <div className="step-header">
            <h2 className="step-title">Biggest job search challenge?</h2>
            <p className="step-subtitle">ApplyDesk adapts its AI tools specifically to your bottleneck.</p>
          </div>

          <div className="experience-cards-list">
            {CHALLENGES_LIST.map(ch => {
              const isSelected = selectedChallenge === ch.id;
              return (
                <div
                  key={ch.id}
                  className={`selection-card ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedChallenge(ch.id)}
                >
                  <span style={{ fontSize: '24px', marginRight: '8px' }}>{ch.icon}</span>
                  <div className="selection-card-content">
                    <span className="card-title">{ch.label}</span>
                  </div>
                  <div className={`radio-dot ${isSelected ? 'active' : ''}`}></div>
                </div>
              );
            })}
          </div>

          <div className="onboarding-footer">
            <button className="onboarding-btn primary" onClick={handleFinishOnboarding}>
              Find My Matched Jobs
            </button>
          </div>
        </div>
      )}

      {/* STEP 11: LOADING ANIMATION */}
      {step === 'loading' && (
        <div className="onboarding-step-view loading-state">
          <div className="radar-spinner"></div>
          <h2 className="step-title" style={{ marginTop: '28px' }}>Matching you with jobs...</h2>
          <p className="step-subtitle">{loadingStage}</p>

          <div className="loading-checklist">
            <div className={`loading-check-item ${loadingProgress >= 25 ? 'done' : ''}`}>
              <span>{loadingProgress >= 25 ? '✓' : '○'}</span> Profile and skills indexed
            </div>
            <div className={`loading-check-item ${loadingProgress >= 55 ? 'done' : ''}`}>
              <span>{loadingProgress >= 55 ? '✓' : '○'}</span> Scanning 4M+ verified job openings
            </div>
            <div className={`loading-check-item ${loadingProgress >= 85 ? 'done' : ''}`}>
              <span>{loadingProgress >= 85 ? '✓' : '○'}</span> Calibrating AI match & ATS ranking
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
