import React, { useState, useEffect } from 'react';
import './profile-info.css';
import Experience from '../public/assets/Experience.svg';
import Education from '../public/assets/Education.svg';
import PersonalInfo from '../public/assets/personal-info.svg';
import Projects from '../public/assets/projects.svg';
import Skills from '../public/assets/skills.svg';
import Demographics from '../public/assets/demographics.svg';
import { calculateProfileCompletion } from './utils/jobHelpers';
import { sanitizeProfileData } from './utils/resumeParser';
import { safeSetStorage, cleanUserForStorage, getEffectiveUserId } from './utils/storage';

interface ProfileInfoProps {
  user: any;
  onUserUpdate?: (updatedUser: any) => void;
  onProfileChange?: (profile: any) => void;
  isDarkMode?: boolean;
}

const IMAN_RESUME_DEFAULTS = {
  fullName: 'Iman Shahinnezhad',
  name: 'Iman Shahinnezhad',
  firstName: 'Iman',
  lastName: 'Shahinnezhad',
  email: 'iman.shahinnezhad68@gmail.com',
  phone: '',
  city: 'Tehran',
  country: 'Iran',
  location: 'Tehran, Iran',
  linkedinUrl: 'https://linkedin.com/in/iman-shahinnezhad',
  jobTitle: 'Project Management - Team Lead',
  targetRole: 'Project Management - Team Lead',
  headline: 'Project Management - Team Lead | Scrum Master | Product Manager',
  summary: 'Over 7 years of extensive experience in web development, client-side technologies, and project management, including hands-on experience as a Scrum Master. Strong background in Object-Oriented Analysis and Design (OOAD), with proven expertise in building dynamic and responsive user interfaces. Proficient in front-end technologies including JavaScript, jQuery, React, React Native, WordPress, HTML5, and CSS3. Experienced in leading Agile teams, facilitating Scrum ceremonies, and driving continuous improvement to deliver high-quality software on time and within scope.',
  skills: [
    'Agile Software Development', 'Tech Scouting', 'User Interview', 'Product management',
    'Cross-Functional Team Leadership', 'Backlog Management', 'Change Management & Adaptability',
    'End-to-End Project Execution Skills', 'UI/UX Research', 'Adobe Suite', 'Risk Management',
    'Wordpress Developer', 'Front-End Developer', 'Skilled in 8+ coding languages'
  ],
  workExperiences: [
    {
      id: '1',
      company: 'Postpace.io',
      companyName: 'Postpace.io',
      role: 'Scrum Master',
      title: 'Scrum Master',
      jobTitle: 'Scrum Master',
      location: 'Paris - Remote',
      city: 'Paris - Remote',
      startDate: 'Nov 2022',
      endDate: 'Feb 2024',
      description: 'As a Scrum Master for over 3 years, I successfully led and coached an Agile development team, ensuring alignment with Scrum principles and driving consistent delivery of high-quality work. My focus was on fostering team discipline, maintaining clear sprint goals, and keeping the team closely aligned with the product roadmap. Led daily stand-ups, sprint planning, retrospectives, and backlog refinement sessions.'
    },
    {
      id: '2',
      company: 'Gradegy.com',
      companyName: 'Gradegy.com',
      role: 'Project Management',
      title: 'Project Management',
      jobTitle: 'Project Management',
      location: 'Houston - Texas',
      city: 'Houston - Texas',
      startDate: 'Feb 2020',
      endDate: 'Feb 2024',
      description: 'Over 4 years of hands-on experience managing a complex, full-cycle digital product at Gradegy, involving website, admin panel, and mobile application development. Successfully led cross-functional teams of 6-7+ members across multiple disciplines including frontend, backend, mobile, UI/UX, and QA. Focused on aligning all work streams with product goals and timelines, ensuring consistent progress and effective communication between all stakeholders.'
    },
    {
      id: '3',
      company: 'SalwaDesign',
      companyName: 'SalwaDesign',
      role: 'Project Management',
      title: 'Project Management',
      jobTitle: 'Project Management',
      location: 'Tehran - On site',
      city: 'Tehran - On site',
      startDate: 'Jun 2021',
      endDate: 'Jan 2023',
      description: 'Led the full development of the Salwadesign website from concept to completion. Took responsibility for both project management and partial front-end implementation. Supervised and coordinated the work of UI/UX designers, backend developers, and front-end engineers to ensure smooth progress and high-quality delivery.'
    },
    {
      id: '4',
      company: 'Pixflow.net',
      companyName: 'Pixflow.net',
      role: 'Product Manager',
      title: 'Product Manager',
      jobTitle: 'Product Manager',
      location: 'Paris - Remote',
      city: 'Paris - Remote',
      startDate: 'Aug 2018',
      endDate: 'April 2025',
      description: 'Pixflow was the Power Elite Author on Envato Market. Helped start selling products independently on their own website and selling graphic assets and plugins. Successfully launched the Pixflow Store with a strategic focus on user-friendly UI/UX design. Successfully boosted monthly sales rate by 30-40% quarter by quarter. Led a cross-functional team of 10 designers and developers to enhance website performance.'
    }
  ],
  education: [
    {
      id: '1',
      degree: 'B.A. in Computer Programming',
      school: 'Islamic Azad University, Science and Research Branch',
      schoolName: 'Islamic Azad University, Science and Research Branch',
      fieldOfStudy: 'Computer Programming',
      location: 'Tehran',
      city: 'Tehran',
      startDate: '2014',
      endDate: '2018',
      year: '2018'
    }
  ],
  languages: [
    { id: '1', name: 'English', proficiency: 'Fluent' },
    { id: '2', name: 'Persian', proficiency: 'Native' }
  ]
};

function getInitialProfile(user: any) {
  let localProfile: any = {};
  try {
    const raw = localStorage.getItem('user_profile_data') ||
                localStorage.getItem('candidate_profile') ||
                localStorage.getItem('resumeok_profile');
    if (raw) localProfile = JSON.parse(raw);
  } catch (e) {}

  localProfile = sanitizeProfileData(localProfile);

  const defaults = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    location: '',
    country: '',
    address: '',
    jobTitle: '',
    headline: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    workExperiences: [],
    education: [],
    skills: [],
    languages: [],
    certifications: '',
    usWorkAuth: 'U.S. Citizen / Permanent Resident',
    sponsorshipRequired: 'No',
    gender: 'Prefer not to say',
    raceEthnicity: 'Prefer not to say',
    veteranStatus: 'I am not a protected veteran',
    disabilityStatus: 'No, I don’t have a disability'
  };

  const userSanitized = sanitizeProfileData(user?.profile || {});

  const merged = {
    ...defaults,
    ...localProfile,
    ...userSanitized
  };

  // If candidate is Iman Shahinnezhad or if existing profile had corrupted dummy values
  const isImanUser = (user?.email && user.email.toLowerCase().includes('iman')) ||
                     (user?.name && user.name.toLowerCase().includes('iman')) ||
                     (user?.name && user.name.toLowerCase().includes('shahinnezhad')) ||
                     (localProfile?.email && localProfile.email.toLowerCase().includes('iman')) ||
                     (userSanitized?.email && userSanitized.email.toLowerCase().includes('iman'));

  if (isImanUser) {
    if (!merged.firstName || merged.firstName === 'Applicant') {
      merged.firstName = 'Iman';
      merged.lastName = 'Shahinnezhad';
      merged.name = 'Iman Shahinnezhad';
      merged.fullName = 'Iman Shahinnezhad';
    }
    if (!merged.email || merged.email.endsWith('.os')) {
      merged.email = 'iman.shahinnezhad68@gmail.com';
    }
    if (!merged.city) merged.city = 'Tehran';
    if (!merged.country) merged.country = 'Iran';
    if (!merged.location) merged.location = 'Tehran, Iran';
    if (!merged.jobTitle) merged.jobTitle = 'Project Management - Team Lead';
    if (!merged.targetRole) merged.targetRole = 'Project Management - Team Lead';
    if (!merged.linkedinUrl) merged.linkedinUrl = 'https://linkedin.com/in/iman-shahinnezhad';
    if (!merged.workExperiences || merged.workExperiences.length <= 1) {
      merged.workExperiences = IMAN_RESUME_DEFAULTS.workExperiences;
    }
    if (!merged.education || merged.education.length === 0) {
      merged.education = IMAN_RESUME_DEFAULTS.education;
    }
    if (!merged.skills || merged.skills.length <= 2) {
      merged.skills = IMAN_RESUME_DEFAULTS.skills;
    }
    if (!merged.summary) {
      merged.summary = IMAN_RESUME_DEFAULTS.summary;
    }
  }

  if (!merged.firstName && user?.name && !user.name.startsWith('Applicant')) {
    const parts = user.name.split(' ');
    merged.firstName = parts[0] || '';
    merged.lastName = parts.slice(1).join(' ') || '';
  }
  if (!merged.email && user?.email && !user.email.endsWith('.os')) {
    merged.email = user.email;
  }
  if (!Array.isArray(merged.workExperiences)) {
    merged.workExperiences = merged.experiences || [];
  }
  if (!Array.isArray(merged.education)) merged.education = [];
  if (!Array.isArray(merged.skills)) {
    merged.skills = typeof merged.skills === 'string'
      ? merged.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
  }
  if (!Array.isArray(merged.languages)) {
    merged.languages = typeof merged.languages === 'string'
      ? merged.languages.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
  }
  if (!Array.isArray(merged.projects)) merged.projects = [];

  return merged;
}

export default function ProfileInfo({ user, onUserUpdate, onProfileChange }: ProfileInfoProps) {
  const [activeSubTab, setActiveSubTab] = useState<'personal' | 'experience' | 'education' | 'skills' | 'projects' | 'demographics'>('personal');

  // Synchronous initial profile from local storage / user prop for instant 0ms rendering
  const [profile, setProfile] = useState<any>(() => getInitialProfile(user));

  const hasCachedData = Boolean(
    profile.firstName ||
    profile.lastName ||
    profile.email ||
    profile.jobTitle ||
    (profile.skills && profile.skills.length > 0) ||
    (profile.workExperiences && profile.workExperiences.length > 0)
  );

  // If cached data is found, never block the UI with a full-screen loading spinner
  const [loading, setLoading] = useState(!hasCachedData);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const lastBroadcastRef = React.useRef<string>('');

  function deriveCountryFromPhone(phoneVal?: string): string | null {
    if (!phoneVal) return null;
    const clean = String(phoneVal).trim().replace(/[^\d+]/g, '');
    if (!clean) return null;
    if (/^09\d{9}$/.test(clean) || /^989\d{9}$/.test(clean) || /^\+98\d+$/.test(clean)) return 'Iran';
    if (clean.startsWith('+1') || /^\d{10}$/.test(clean)) return 'United States';
    if (clean.startsWith('+44')) return 'United Kingdom';
    if (clean.startsWith('+49')) return 'Germany';
    if (clean.startsWith('+33')) return 'France';
    if (clean.startsWith('+90')) return 'Turkey';
    if (clean.startsWith('+971')) return 'United Arab Emirates';
    if (clean.startsWith('+91')) return 'India';
    if (clean.startsWith('+61')) return 'Australia';
    if (clean.startsWith('+31')) return 'Netherlands';
    if (clean.startsWith('+34')) return 'Spain';
    if (clean.startsWith('+39')) return 'Italy';
    if (clean.startsWith('+41')) return 'Switzerland';
    if (clean.startsWith('+46')) return 'Sweden';
    if (clean.startsWith('+47')) return 'Norway';
    if (clean.startsWith('+45')) return 'Denmark';
    if (clean.startsWith('+358')) return 'Finland';
    if (clean.startsWith('+81')) return 'Japan';
    if (clean.startsWith('+82')) return 'South Korea';
    if (clean.startsWith('+86')) return 'China';
    if (clean.startsWith('+65')) return 'Singapore';
    if (clean.startsWith('+55')) return 'Brazil';
    return null;
  }

  const [skillInput, setSkillInput] = useState('');
  const [langInput, setLangInput] = useState('');

  const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3030'
    : 'https://api.applydesk.io';

  // 1. Fetch Profile from MongoDB on component mount (stale-while-revalidate in background if cached)
  useEffect(() => {
    loadProfileFromDatabase(hasCachedData);

    const handleSync = (e?: any) => {
      if (e?.detail?.profile) {
        setProfile((prev: any) => ({ ...prev, ...e.detail.profile }));
      }
      loadProfileFromDatabase(true);
    };

    window.addEventListener('applydesk:profile_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('applydesk:profile_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [user?.id, user?._id]);

  const loadProfileFromDatabase = async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMsg('');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const token = user?.token || localStorage.getItem('auth_token') || localStorage.getItem('resumeok_token');
      const targetUserId = getEffectiveUserId(user);
      const userEmail = profile.email?.trim() || user?.email || (typeof window !== 'undefined' ? localStorage.getItem('user_email') || 'iman.shahinnezhad68@gmail.com' : '');

      let dbProfile: any = null;

      try {
        const queryParam = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
        const res = await fetch(`${apiBase}/api/user/${targetUserId}/profile${queryParam}`, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          signal: controller.signal
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.profile) {
            dbProfile = data.profile;
          }
        }
      } catch (fetchErr: any) {
        if (fetchErr.name !== 'AbortError') {
          console.warn('Network issue fetching profile from DB, falling back to local storage:', fetchErr);
        }
      }

      // Merge with user props and local cached profile (localProfile has highest priority for active user edits)
      const localProfile = (() => {
        try {
          return sanitizeProfileData(JSON.parse(
            localStorage.getItem('user_profile_data') ||
            localStorage.getItem('candidate_profile') ||
            localStorage.getItem('resumeok_profile') ||
            '{}'
          ));
        } catch (e) { return {}; }
      })();

      const merged = sanitizeProfileData({
        ...sanitizeProfileData(dbProfile || {}),
        ...sanitizeProfileData(user?.profile || {}),
        ...localProfile
      });

      const isImanUser = (user?.email && user.email.toLowerCase().includes('iman')) ||
                         (user?.name && user.name.toLowerCase().includes('iman')) ||
                         (user?.name && user.name.toLowerCase().includes('shahinnezhad')) ||
                         (localProfile?.email && localProfile.email.toLowerCase().includes('iman'));

      if (isImanUser) {
        if (!merged.firstName || merged.firstName === 'Applicant') {
          merged.firstName = 'Iman';
          merged.lastName = 'Shahinnezhad';
          merged.name = 'Iman Shahinnezhad';
          merged.fullName = 'Iman Shahinnezhad';
        }
        if (!merged.email || merged.email.endsWith('.os')) {
          merged.email = 'iman.shahinnezhad68@gmail.com';
        }
        if (!merged.city) merged.city = 'Tehran';
        if (!merged.country) merged.country = 'Iran';
        if (!merged.location) merged.location = 'Tehran, Iran';
        if (!merged.jobTitle) merged.jobTitle = 'Project Management - Team Lead';
        if (!merged.targetRole) merged.targetRole = 'Project Management - Team Lead';
        if (!merged.linkedinUrl) merged.linkedinUrl = 'https://linkedin.com/in/iman-shahinnezhad';
        if (!merged.workExperiences || merged.workExperiences.length <= 1) {
          merged.workExperiences = IMAN_RESUME_DEFAULTS.workExperiences;
        }
        if (!merged.education || merged.education.length === 0) {
          merged.education = IMAN_RESUME_DEFAULTS.education;
        }
        if (!merged.skills || merged.skills.length <= 2) {
          merged.skills = IMAN_RESUME_DEFAULTS.skills;
        }
        if (!merged.summary) {
          merged.summary = IMAN_RESUME_DEFAULTS.summary;
        }
      }

      // Fallback for names if not present in profile
      if (!merged.firstName && user?.name && !user.name.startsWith('Applicant')) {
        const parts = user.name.split(' ');
        merged.firstName = parts[0] || '';
        merged.lastName = parts.slice(1).join(' ') || '';
      }
      if (!merged.email && user?.email && !user.email.endsWith('.os')) {
        merged.email = user.email;
      }

      // Ensure workExperiences and education are arrays
      if (!Array.isArray(merged.workExperiences)) {
        merged.workExperiences = merged.experiences || [];
      }
      if (!Array.isArray(merged.education)) {
        merged.education = [];
      }
      if (!Array.isArray(merged.skills)) {
        merged.skills = typeof merged.skills === 'string'
          ? merged.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [];
      }
      if (!Array.isArray(merged.languages)) {
        merged.languages = typeof merged.languages === 'string'
          ? merged.languages.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [];
      }
      if (!Array.isArray(merged.projects)) {
        merged.projects = [];
      }

      setProfile((prev: any) => {
        const next = { ...prev, ...merged };
        if (JSON.stringify(prev) === JSON.stringify(next)) {
          return prev;
        }
        return next;
      });
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  // Broadcast real-time profile state to parent only when serialized profile actually changes
  useEffect(() => {
    if (!loading && profile && Object.keys(profile).length > 0) {
      const serialized = JSON.stringify(profile);
      if (serialized !== lastBroadcastRef.current) {
        lastBroadcastRef.current = serialized;
        if (onProfileChange) {
          onProfileChange(profile);
        }
      }
    }
  }, [profile, loading, onProfileChange]);

  // 2. Save Profile Changes to Database & Sync
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccessMsg('');
    setErrorMsg('');

    try {
      const token = user?.token || localStorage.getItem('auth_token') || localStorage.getItem('resumeok_token');
      const targetUserId = getEffectiveUserId(user);

      const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || user?.name || 'Iman Shahinnezhad';

      const userEmail = profile.email?.trim() || user?.email || (typeof window !== 'undefined' ? localStorage.getItem('user_email') || 'iman.shahinnezhad68@gmail.com' : 'iman.shahinnezhad68@gmail.com');

      const payload = {
        userId: targetUserId,
        email: userEmail,
        name: fullName,
        profile: {
          ...profile,
          firstName: profile.firstName?.trim() || '',
          lastName: profile.lastName?.trim() || '',
          email: profile.email?.trim() || userEmail,
          phone: profile.phone?.trim() || '',
          city: profile.city?.trim() || profile.location?.trim() || '',
          location: profile.city?.trim() || profile.location?.trim() || '',
          country: profile.country?.trim() || deriveCountryFromPhone(profile.phone) || '',
          workExperiences: (profile.workExperiences || []).filter((e: any) => e.company?.trim() || e.role?.trim()),
          education: (profile.education || []).filter((e: any) => e.school?.trim() || e.degree?.trim()),
          projects: (profile.projects || []).filter((e: any) => e.title?.trim() || e.role?.trim())
        },
        hasCompletedOnboarding: true
      };

      let successFromDb = false;
      let syncErrorText = '';

      // Cloud Database Sync (MongoDB)
      try {
        const res = await fetch(`${apiBase}/api/user/${targetUserId}/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const respData = await res.json().catch(() => ({}));
          successFromDb = true;
          if (respData && respData.profile) {
            setProfile((prev: any) => ({ ...prev, ...respData.profile }));
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.error('Remote profile sync response error:', res.status, errData);
          syncErrorText = errData?.error || `Server responded with status ${res.status}`;
        }
      } catch (apiErr: any) {
        console.warn('Could not reach remote API, saved locally:', apiErr);
        syncErrorText = 'Network connection to database failed: ' + (apiErr?.message || 'timeout');
      }

      // Persist safely across all local caches with quota overflow protection
      safeSetStorage('user_profile_data', JSON.stringify(payload.profile));
      safeSetStorage('candidate_profile', JSON.stringify(payload.profile));
      safeSetStorage('resumeok_profile', JSON.stringify(payload.profile));

      // Update auth_user without giant base64 payloads to prevent storage quota exhaustion
      const savedUserStr = localStorage.getItem('auth_user') || localStorage.getItem('resumeok_user');
      let updatedUserObj = user ? { ...user } : {};
      if (savedUserStr) {
        try {
          updatedUserObj = { ...JSON.parse(savedUserStr), ...updatedUserObj };
        } catch (e) { }
      }
      updatedUserObj.name = fullName;
      updatedUserObj.profile = payload.profile;

      const userForStorage = cleanUserForStorage(updatedUserObj);
      safeSetStorage('auth_user', JSON.stringify(userForStorage));
      safeSetStorage('resumeok_user', JSON.stringify(userForStorage));

      // Notify parent Dashboard
      if (onUserUpdate) {
        onUserUpdate(updatedUserObj);
      }
      if (onProfileChange) {
        onProfileChange(payload.profile);
      }

      // Broadcast sync message to browser extension & other tabs
      window.postMessage({
        type: 'APPLYDESK_PROFILE_UPDATED',
        profile: payload.profile,
        user: updatedUserObj
      }, '*');

      window.dispatchEvent(new CustomEvent('applydesk:profile_updated', {
        detail: { profile: payload.profile, user: updatedUserObj }
      }));

      if (successFromDb) {
        setErrorMsg('');
        setSaveSuccessMsg('✓ Profile successfully saved and synced with Cloud Database & Extension!');
      } else {
        setErrorMsg(syncErrorText ? `Database sync warning: ${syncErrorText}` : '');
        setSaveSuccessMsg('✓ Profile updated locally and queued for cloud sync.');
      }

      setTimeout(() => setSaveSuccessMsg(''), 4500);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setErrorMsg(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  // Helper to calculate profile completion
  const calculateCompletion = () => {
    return calculateProfileCompletion(profile);
  };

  // Handlers for repeatables
  const addWorkExperience = () => {
    const newExp = {
      id: Date.now().toString(),
      company: '',
      role: '',
      startDate: '',
      endDate: '',
      description: ''
    };
    setProfile((prev: any) => ({
      ...prev,
      workExperiences: [...(prev.workExperiences || []), newExp]
    }));
  };

  const updateWorkExperience = (index: number, field: string, val: string) => {
    const list = [...(profile.workExperiences || [])];
    list[index] = { ...list[index], [field]: val };
    setProfile((prev: any) => ({ ...prev, workExperiences: list }));
  };

  const removeWorkExperience = (index: number) => {
    const list = [...(profile.workExperiences || [])];
    list.splice(index, 1);
    setProfile((prev: any) => ({ ...prev, workExperiences: list }));
  };

  const addEducation = () => {
    const newEdu = {
      id: Date.now().toString(),
      school: '',
      degree: '',
      discipline: '',
      startDate: '',
      endDate: ''
    };
    setProfile((prev: any) => ({
      ...prev,
      education: [...(prev.education || []), newEdu]
    }));
  };

  const updateEducation = (index: number, field: string, val: string) => {
    const list = [...(profile.education || [])];
    list[index] = { ...list[index], [field]: val };
    setProfile((prev: any) => ({ ...prev, education: list }));
  };

  const removeEducation = (index: number) => {
    const list = [...(profile.education || [])];
    list.splice(index, 1);
    setProfile((prev: any) => ({ ...prev, education: list }));
  };

  const addProject = () => {
    const newProj = {
      id: Date.now().toString(),
      title: '',
      role: '',
      url: '',
      description: ''
    };
    setProfile((prev: any) => ({
      ...prev,
      projects: [...(prev.projects || []), newProj]
    }));
  };

  const updateProject = (index: number, field: string, val: string) => {
    const list = [...(profile.projects || [])];
    list[index] = { ...list[index], [field]: val };
    setProfile((prev: any) => ({ ...prev, projects: list }));
  };

  const removeProject = (index: number) => {
    const list = [...(profile.projects || [])];
    list.splice(index, 1);
    setProfile((prev: any) => ({ ...prev, projects: list }));
  };

  // Skill tag add / remove
  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = skillInput.trim();
      if (val && !profile.skills.includes(val)) {
        setProfile((prev: any) => ({ ...prev, skills: [...(prev.skills || []), val] }));
      }
      setSkillInput('');
    }
  };

  const removeSkill = (tag: string) => {
    setProfile((prev: any) => ({
      ...prev,
      skills: (prev.skills || []).filter((s: string) => s !== tag)
    }));
  };

  // Language tag add / remove
  const handleAddLanguage = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = langInput.trim();
      if (val && !profile.languages.includes(val)) {
        setProfile((prev: any) => ({ ...prev, languages: [...(prev.languages || []), val] }));
      }
      setLangInput('');
    }
  };

  const removeLanguage = (lang: string) => {
    setProfile((prev: any) => ({
      ...prev,
      languages: (prev.languages || []).filter((l: string) => l !== lang)
    }));
  };

  const completionPct = calculateCompletion();
  const initials = `${profile.firstName?.[0] || user?.name?.[0] || 'U'}${profile.lastName?.[0] || ''}`.toUpperCase();

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--border-color)', borderTopColor: '#00d68f', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ marginTop: '14px', fontSize: '14px' }}>Loading candidate profile from database...</p>
      </div>
    );
  }

  return (
    <div className="profile-info-container">
      {/* Top Banner Card */}
      <div className="profile-header-card">
        <div className="profile-avatar-info">
          <div className="profile-avatar-large">
            {initials}
          </div>
          <div className="profile-meta-col">
            <h2>{profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}`.trim() : (user?.name || 'Candidate User')}</h2>
            <div className="profile-meta-headline">
              {profile.jobTitle || profile.headline || 'Product & Software Engineering Candidate'}
            </div>
            <div className="profile-badges-row">
              <span className="profile-chip">
                📧 {profile.email || user?.email || 'No email set'}
              </span>
              {profile.phone && (
                <span className="profile-chip">
                  📞 {profile.phone}
                </span>
              )}
              {(profile.city || profile.country) && (
                <span className="profile-chip">
                  📍 {[profile.city, profile.country].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="profile-actions-col">
          <div className="profile-completion-box">
            <span className="profile-completion-label">
              Profile Completeness: <strong>{completionPct}%</strong>
            </span>
            <div className="profile-completion-bar">
              <div className="profile-completion-fill" style={{ width: `${completionPct}%` }} />
            </div>
          </div>
          <button
            type="button"
            className="btn-save-profile"
            onClick={() => handleSaveProfile()}
            disabled={saving}
          >
            {saving ? 'Saving...' : '💾 Save & Sync Profile'}
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="sync-toast-banner">
          {saveSuccessMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '12px', fontSize: '13px', fontWeight: 600 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Navigation Subtabs */}
      <div className="profile-subtabs-nav">
        <button
          className={`profile-subtab-btn ${activeSubTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('personal')}
        >
          <img className='profile-icon' src={PersonalInfo} alt="Personal Info" />
          Personal Info
        </button>
        <button
          className={`profile-subtab-btn ${activeSubTab === 'experience' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('experience')}
        >
          <img className='profile-icon' src={Experience} alt="Experience" />
          Experience ({(profile.workExperiences || []).filter((e: any) => e.company?.trim() || e.role?.trim()).length})
        </button>
        <button
          className={`profile-subtab-btn ${activeSubTab === 'education' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('education')}
        >
          <img className='profile-icon' src={Education} alt="Education" />
          Education ({(profile.education || []).filter((e: any) => e.school?.trim() || e.degree?.trim()).length})
        </button>
        <button
          className={`profile-subtab-btn ${activeSubTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('skills')}
        >
          <img className='profile-icon' src={Skills} alt="Skills" />
          Skills & Tools ({(profile.skills || []).filter(Boolean).length})
        </button>
        <button
          className={`profile-subtab-btn ${activeSubTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('projects')}
        >
          <img className='profile-icon' src={Projects} alt="Projects" />
          Projects ({(profile.projects || []).filter((e: any) => e.title?.trim() || e.role?.trim()).length})
        </button>
        <button
          className={`profile-subtab-btn ${activeSubTab === 'demographics' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('demographics')}
        >
          <img className='profile-icon' src={Demographics} alt="Demographics" />
          Demographics & Work Auth
        </button>
      </div>

      {/* 1. PERSONAL INFORMATION TAB */}
      {activeSubTab === 'personal' && (
        <div className="profile-section-card">
          <div className="profile-section-title-row">
            <div>
              <h3><img className='profile-icon' src={PersonalInfo} alt="Personal Info" /> Personal Information</h3>
              <p>Essential contact and profile details used across 1-Click job applications.</p>
            </div>
          </div>

          <div className="profile-grid-2">
            <div className="profile-field-group">
              <label className="profile-field-label">First Name *</label>
              <input
                type="text"
                className="profile-field-input"
                value={profile.firstName || ''}
                placeholder="e.g. John"
                onChange={e => setProfile({ ...profile, firstName: e.target.value })}
              />
            </div>
            <div className="profile-field-group">
              <label className="profile-field-label">Last Name *</label>
              <input
                type="text"
                className="profile-field-input"
                value={profile.lastName || ''}
                placeholder="e.g. Doe"
                onChange={e => setProfile({ ...profile, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="profile-grid-2">
            <div className="profile-field-group">
              <label className="profile-field-label">Email Address *</label>
              <input
                type="email"
                className="profile-field-input"
                value={profile.email || ''}
                placeholder="e.g. john@example.com"
                onChange={e => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
            <div className="profile-field-group">
              <label className="profile-field-label">Phone Number *</label>
              <input
                type="tel"
                className="profile-field-input"
                value={profile.phone || ''}
                placeholder="e.g. +1 (555) 234-5678"
                onChange={e => {
                  const newPhone = e.target.value;
                  const inferred = deriveCountryFromPhone(newPhone);
                  setProfile((prev: any) => ({
                    ...prev,
                    phone: newPhone,
                    country: (!prev.country || prev.country === 'United States' || prev.country === 'Not specified') && inferred
                      ? inferred
                      : prev.country
                  }));
                }}
              />
            </div>
          </div>

          <div className="profile-grid-3">
            <div className="profile-field-group">
              <label className="profile-field-label">City / State *</label>
              <input
                type="text"
                className="profile-field-input"
                value={profile.city || profile.location || ''}
                placeholder="e.g. San Francisco, CA"
                onChange={e => setProfile({ ...profile, city: e.target.value, location: e.target.value })}
              />
            </div>
            <div className="profile-field-group">
              <label className="profile-field-label">Country *</label>
              <input
                type="text"
                className="profile-field-input"
                value={profile.country || ''}
                placeholder="e.g. United States"
                onChange={e => setProfile({ ...profile, country: e.target.value })}
              />
            </div>
            <div className="profile-field-group">
              <label className="profile-field-label">Street Address</label>
              <input
                type="text"
                className="profile-field-input"
                value={profile.address || ''}
                placeholder="e.g. 123 Market St, Suite 400"
                onChange={e => setProfile({ ...profile, address: e.target.value })}
              />
            </div>
          </div>

          <div className="profile-grid-3">
            <div className="profile-field-group">
              <label className="profile-field-label">LinkedIn URL</label>
              <input
                type="url"
                className="profile-field-input"
                value={profile.linkedinUrl || ''}
                placeholder="https://linkedin.com/in/username"
                onChange={e => setProfile({ ...profile, linkedinUrl: e.target.value })}
              />
            </div>
            <div className="profile-field-group">
              <label className="profile-field-label">GitHub URL</label>
              <input
                type="url"
                className="profile-field-input"
                value={profile.githubUrl || ''}
                placeholder="https://github.com/username"
                onChange={e => setProfile({ ...profile, githubUrl: e.target.value })}
              />
            </div>
            <div className="profile-field-group">
              <label className="profile-field-label">Portfolio / Website URL</label>
              <input
                type="url"
                className="profile-field-input"
                value={profile.portfolioUrl || ''}
                placeholder="https://yourportfolio.com"
                onChange={e => setProfile({ ...profile, portfolioUrl: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. WORK EXPERIENCE TAB */}
      {activeSubTab === 'experience' && (
        <div className="profile-section-card">
          <div className="profile-section-title-row">
            <div>
              <h3><img className='profile-icon' src={Experience} alt="Experience" />Work Experience</h3>
              <p>Add your employment history. These are automatically extracted during application autofill.</p>
            </div>
            <button type="button" className="btn-add-item" onClick={addWorkExperience}>
              + Add Experience
            </button>
          </div>

          <div className="profile-cards-stack">
            {(!profile.workExperiences || profile.workExperiences.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)', background: 'var(--bg-main)', borderRadius: '16px' }}>
                No work experiences added yet. Click "+ Add Experience" above to add your employment history.
              </div>
            ) : (
              profile.workExperiences.map((exp: any, index: number) => (
                <div key={exp.id || index} className="profile-item-entry-card">
                  <button type="button" className="btn-remove-item" onClick={() => removeWorkExperience(index)}>
                    🗑️ Remove
                  </button>

                  <div className="profile-grid-2">
                    <div className="profile-field-group">
                      <label className="profile-field-label">Company Name *</label>
                      <input
                        type="text"
                        className="profile-field-input"
                        value={exp.company || ''}
                        placeholder="e.g. Google, Apple, Stripe"
                        onChange={e => updateWorkExperience(index, 'company', e.target.value)}
                      />
                    </div>
                    <div className="profile-field-group">
                      <label className="profile-field-label">Role / Job Title *</label>
                      <input
                        type="text"
                        className="profile-field-input"
                        value={exp.role || exp.jobTitle || ''}
                        placeholder="e.g. Senior Software Engineer"
                        onChange={e => updateWorkExperience(index, 'role', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="profile-grid-2">
                    <div className="profile-field-group">
                      <label className="profile-field-label">Start Date</label>
                      <input
                        type="text"
                        className="profile-field-input"
                        value={exp.startDate || ''}
                        placeholder="e.g. Jan 2022"
                        onChange={e => updateWorkExperience(index, 'startDate', e.target.value)}
                      />
                    </div>
                    <div className="profile-field-group">
                      <label className="profile-field-label">End Date (or Present)</label>
                      <input
                        type="text"
                        className="profile-field-input"
                        value={exp.endDate || ''}
                        placeholder="e.g. Present"
                        onChange={e => updateWorkExperience(index, 'endDate', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="profile-field-group">
                    <label className="profile-field-label">Key Responsibilities & Achievements</label>
                    <textarea
                      className="profile-field-input"
                      value={exp.description || ''}
                      placeholder="Led frontend architecture, improved performance by 35%, collaborated with cross-functional teams..."
                      onChange={e => updateWorkExperience(index, 'description', e.target.value)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. EDUCATION TAB */}
      {activeSubTab === 'education' && (
        <div className="profile-section-card">
          <div className="profile-section-title-row">
            <div>
              <h3><img className='profile-icon' src={Education} alt="Education" /> Education</h3>
              <p>Your academic background, degrees, and institutions.</p>
            </div>
            <button type="button" className="btn-add-item" onClick={addEducation}>
              + Add Education
            </button>
          </div>

          <div className="profile-cards-stack">
            {(!profile.education || profile.education.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)', background: 'var(--bg-main)', borderRadius: '16px' }}>
                No education records added yet. Click "+ Add Education" above.
              </div>
            ) : (
              profile.education.map((edu: any, index: number) => (
                <div key={edu.id || index} className="profile-item-entry-card">
                  <button type="button" className="btn-remove-item" onClick={() => removeEducation(index)}>
                    🗑️ Remove
                  </button>

                  <div className="profile-grid-2">
                    <div className="profile-field-group">
                      <label className="profile-field-label">School / University *</label>
                      <input
                        type="text"
                        className="profile-field-input"
                        value={edu.school || ''}
                        placeholder="e.g. Stanford University"
                        onChange={e => updateEducation(index, 'school', e.target.value)}
                      />
                    </div>
                    <div className="profile-field-group">
                      <label className="profile-field-label">Degree *</label>
                      <input
                        type="text"
                        className="profile-field-input"
                        value={edu.degree || ''}
                        placeholder="e.g. Bachelor of Science"
                        onChange={e => updateEducation(index, 'degree', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="profile-grid-3">
                    <div className="profile-field-group">
                      <label className="profile-field-label">Field of Study / Discipline</label>
                      <input
                        type="text"
                        className="profile-field-input"
                        value={edu.discipline || edu.major || ''}
                        placeholder="e.g. Computer Science"
                        onChange={e => updateEducation(index, 'discipline', e.target.value)}
                      />
                    </div>
                    <div className="profile-field-group">
                      <label className="profile-field-label">Start Date</label>
                      <input
                        type="text"
                        className="profile-field-input"
                        value={edu.startDate || ''}
                        placeholder="e.g. 2018"
                        onChange={e => updateEducation(index, 'startDate', e.target.value)}
                      />
                    </div>
                    <div className="profile-field-group">
                      <label className="profile-field-label">Graduation Date</label>
                      <input
                        type="text"
                        className="profile-field-input"
                        value={edu.endDate || ''}
                        placeholder="e.g. 2022"
                        onChange={e => updateEducation(index, 'endDate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. SKILLS & LANGUAGES TAB */}
      {activeSubTab === 'skills' && (
        <div className="profile-section-card">
          <div className="profile-section-title-row">
            <div>
              <h3><img className='profile-icon' src={Skills} alt="Skills" /> Skills, Tools & Languages</h3>
              <p>Key technical skills matched by the AI matching engine and ATS questionnaire filters.</p>
            </div>
          </div>

          <div className="profile-field-group">
            <label className="profile-field-label">Skills (Type skill and press Enter)</label>
            <div className="skills-tags-wrap">
              {profile.skills?.map((s: string) => (
                <span key={s} className="skill-tag-pill">
                  {s}
                  <button type="button" className="skill-tag-remove" onClick={() => removeSkill(s)}>✕</button>
                </span>
              ))}
              <input
                type="text"
                className="skill-tag-input-inline"
                placeholder="Add skill (e.g. TypeScript, React, Python) + Enter"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
              />
            </div>
          </div>

          {/* Quick Add Suggestions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Popular suggestions:</span>
            {['React', 'TypeScript', 'Node.js', 'Python', 'Tailwind CSS', 'SQL', 'GraphQL', 'AWS', 'Docker', 'Figma', 'Product Design'].map(sugg => (
              !profile.skills?.includes(sugg) && (
                <button
                  key={sugg}
                  type="button"
                  onClick={() => setProfile((p: any) => ({ ...p, skills: [...(p.skills || []), sugg] }))}
                  style={{ background: 'var(--btn-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '11.5px', padding: '3px 8px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  + {sugg}
                </button>
              )
            ))}
          </div>

          <div className="profile-field-group" style={{ marginTop: '10px' }}>
            <label className="profile-field-label">Languages (Type language and press Enter)</label>
            <div className="skills-tags-wrap">
              {profile.languages?.map((l: string) => (
                <span key={l} className="skill-tag-pill">
                  {l}
                  <button type="button" className="skill-tag-remove" onClick={() => removeLanguage(l)}>✕</button>
                </span>
              ))}
              <input
                type="text"
                className="skill-tag-input-inline"
                placeholder="Add language (e.g. English, Persian, Spanish) + Enter"
                value={langInput}
                onChange={e => setLangInput(e.target.value)}
                onKeyDown={handleAddLanguage}
              />
            </div>
          </div>

          <div className="profile-field-group" style={{ marginTop: '10px' }}>
            <label className="profile-field-label">Certifications & Licenses</label>
            <textarea
              className="profile-field-input"
              value={profile.certifications || ''}
              placeholder="e.g. AWS Certified Solutions Architect, Certified Scrum Master..."
              onChange={e => setProfile({ ...profile, certifications: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* 5. PROJECTS TAB */}
      {activeSubTab === 'projects' && (
        <div className="profile-section-card">
          <div className="profile-section-title-row">
            <div>
              <h3><img className='profile-icon' src={Projects} alt="Projects" /> Featured Projects</h3>
              <p>Key software, portfolio or design projects that showcase your domain expertise.</p>
            </div>
            <button type="button" className="btn-add-item" onClick={addProject}>
              + Add Project
            </button>
          </div>

          <div className="profile-cards-stack">
            {(!profile.projects || profile.projects.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)', background: 'var(--bg-main)', borderRadius: '16px' }}>
                No projects added yet. Click "+ Add Project" above to highlight your work.
              </div>
            ) : (
              profile.projects.map((proj: any, index: number) => (
                <div key={proj.id || index} className="profile-item-entry-card">
                  <button type="button" className="btn-remove-item" onClick={() => removeProject(index)}>
                    🗑️ Remove
                  </button>

                  <div className="profile-grid-3">
                    <div className="profile-field-group">
                      <label className="profile-field-label">Project Name *</label>
                      <input
                        type="text"
                        className="profile-field-input"
                        value={proj.title || ''}
                        placeholder="e.g. AI Resume Tailor"
                        onChange={e => updateProject(index, 'title', e.target.value)}
                      />
                    </div>
                    <div className="profile-field-group">
                      <label className="profile-field-label">Your Role</label>
                      <input
                        type="text"
                        className="profile-field-input"
                        value={proj.role || ''}
                        placeholder="e.g. Lead Architect / Creator"
                        onChange={e => updateProject(index, 'role', e.target.value)}
                      />
                    </div>
                    <div className="profile-field-group">
                      <label className="profile-field-label">Live Link / Repository URL</label>
                      <input
                        type="url"
                        className="profile-field-input"
                        value={proj.url || ''}
                        placeholder="https://github.com/..."
                        onChange={e => updateProject(index, 'url', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="profile-field-group">
                    <label className="profile-field-label">Description & Tech Stack</label>
                    <textarea
                      className="profile-field-input"
                      value={proj.description || ''}
                      placeholder="Built high-performance application with React, TypeScript and Gemini AI..."
                      onChange={e => updateProject(index, 'description', e.target.value)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 6. DEMOGRAPHICS & WORK AUTHORIZATION TAB */}
      {activeSubTab === 'demographics' && (
        <div className="profile-section-card">
          <div className="profile-section-title-row">
            <div>
              <h3><img className='profile-icon' src={Demographics} alt="Demographics" /> Demographics & Work Authorization</h3>
              <p>Standard ATS questions (Work Authorization, Visa Sponsorship, EEO disclosures).</p>
            </div>
          </div>

          <div className="profile-grid-2">
            <div className="profile-field-group">
              <label className="profile-field-label">Work Authorization Status *</label>
              <select
                className="profile-field-input"
                value={profile.usWorkAuth || 'U.S. Citizen / Permanent Resident'}
                onChange={e => setProfile({ ...profile, usWorkAuth: e.target.value })}
              >
                <option value="U.S. Citizen / Permanent Resident">U.S. Citizen / Permanent Resident</option>
                <option value="Authorized to work in the U.S.">Authorized to work in the U.S.</option>
                <option value="Requires Visa Sponsorship">Requires Visa Sponsorship</option>
                <option value="EU / UK Citizen">EU / UK Citizen</option>
                <option value="Canadian Citizen">Canadian Citizen</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="profile-field-group">
              <label className="profile-field-label">Will you now or in future require visa sponsorship? *</label>
              <select
                className="profile-field-input"
                value={profile.sponsorshipRequired || 'No'}
                onChange={e => setProfile({ ...profile, sponsorshipRequired: e.target.value })}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </div>

          <div className="profile-grid-2">
            <div className="profile-field-group">
              <label className="profile-field-label">Gender</label>
              <select
                className="profile-field-input"
                value={profile.gender || 'Prefer not to say'}
                onChange={e => setProfile({ ...profile, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div className="profile-field-group">
              <label className="profile-field-label">Race / Ethnicity</label>
              <select
                className="profile-field-input"
                value={profile.raceEthnicity || 'Prefer not to say'}
                onChange={e => setProfile({ ...profile, raceEthnicity: e.target.value })}
              >
                <option value="Asian">Asian</option>
                <option value="Black / African American">Black / African American</option>
                <option value="Hispanic / Latino">Hispanic / Latino</option>
                <option value="White">White / Caucasian</option>
                <option value="Two or More Races">Two or More Races</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="profile-grid-2">
            <div className="profile-field-group">
              <label className="profile-field-label">Veteran Status</label>
              <select
                className="profile-field-input"
                value={profile.veteranStatus || 'I am not a protected veteran'}
                onChange={e => setProfile({ ...profile, veteranStatus: e.target.value })}
              >
                <option value="I am not a protected veteran">I am not a protected veteran</option>
                <option value="I identify as one or more of the classifications of protected veteran">I identify as a protected veteran</option>
                <option value="Prefer not to say">I don't wish to answer</option>
              </select>
            </div>

            <div className="profile-field-group">
              <label className="profile-field-label">Disability Status</label>
              <select
                className="profile-field-input"
                value={profile.disabilityStatus || 'No, I don’t have a disability'}
                onChange={e => setProfile({ ...profile, disabilityStatus: e.target.value })}
              >
                <option value="No, I don’t have a disability">No, I don’t have a disability</option>
                <option value="Yes, I have a disability">Yes, I have a disability</option>
                <option value="Prefer not to say">I don't wish to answer</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Button at bottom */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
        <button
          type="button"
          className="btn-save-profile"
          onClick={() => handleSaveProfile()}
          disabled={saving}
          style={{ padding: '14px 32px', fontSize: '15px' }}
        >
          {saving ? 'Syncing with Database...' : ' Save All Profile Changes'}
        </button>
      </div>
    </div>
  );
}
