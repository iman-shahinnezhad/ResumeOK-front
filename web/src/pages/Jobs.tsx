import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, DollarSign, Sparkles, Briefcase, FileText, User, Bot, GraduationCap, Mic, Gift, Settings as SettingsIcon, Heart, Ban, CheckCircle, Zap, ChevronDown, Sliders, RotateCcw, X, Lock, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useSEO from '../hooks/useSEO';

interface JobApp {
  id: string;
  company: string;
  companyInitials: string;
  title: string;
  location: string;
  salary: string;
  experience: string;
  jobType: string;
  industry: string;
  status: 'Saved' | 'Applied' | 'Interviewing' | 'Offer';
  appliedDate: string;
  matchScore: number;
  matchGrade: 'GREAT MATCH' | 'GOOD MATCH' | 'FAIR MATCH';
  postedAgo: string;
  applicantsCount: string;
  h1bStatus: string;
  tags: string[];
  notes?: string;
  liked?: boolean;
  autoApplied?: boolean;
  isHidden?: boolean;
}

export default function Jobs() {
  useSEO(
    "Jobs Dashboard & AI Auto-Apply - ResumeOK",
    "Discover verified jobs, track applications, view match scores, and enable 1-click AI autofill apply."
  );

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'Recommended' | 'Liked' | 'Applied'>('Recommended');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<JobApp | null>(null);
  const [copiedApply, setCopiedApply] = useState<string | null>(null);

  // Dropdown Popovers state
  const [openDropdown, setOpenDropdown] = useState<'location' | 'role' | 'exp' | 'jobType' | 'salary' | 'date' | null>(null);
  const [showAllFiltersModal, setShowAllFiltersModal] = useState(false);

  // Filters State values
  const [locationFilter, setLocationFilter] = useState<string>('United States');
  const [roleFilter, setRoleFilter] = useState<string>('All Roles');
  const [expFilter, setExpFilter] = useState<string>('All Levels');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('All Types');
  const [salaryFilter, setSalaryFilter] = useState<string>('Any Salary');
  const [dateFilter, setDateFilter] = useState<string>('Anytime');
  const [showHiddenOnly, setShowHiddenOnly] = useState<boolean>(false);

  // Advanced Filter Modal Options
  const [advNoH1B, setAdvNoH1B] = useState(false);
  const [advEarlyApplicant, setAdvEarlyApplicant] = useState(false);
  const [advMinMatch85, setAdvMinMatch85] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [jobs, setJobs] = useState<JobApp[]>([
    {
      id: 'job-1',
      company: 'Stripe Inc.',
      companyInitials: 'S',
      title: 'Android Developer (2-4 years exp) - USC and GC\'s',
      location: 'United States • Remote',
      salary: '$165,000 - $195,000 / yr',
      experience: '2-4 years exp',
      jobType: 'Full-time, Contract',
      industry: 'Fintech / Cloud Infrastructure / Scale-up',
      status: 'Interviewing',
      appliedDate: '2026-07-28',
      matchScore: 94,
      matchGrade: 'GREAT MATCH',
      postedAgo: '1 week ago',
      applicantsCount: 'Less than 25 applicants',
      h1bStatus: '• No H1B Required',
      tags: ['Kotlin Required', 'Be an early applicant'],
      notes: 'Passed recruiter screen. Technical interview scheduled for next week.',
      liked: true,
      autoApplied: true,
      isHidden: false
    },
    {
      id: 'job-2',
      company: 'Linear App',
      companyInitials: 'L',
      title: 'React Native Developer - REMOTE',
      location: 'United States • Remote',
      salary: '$155,000 - $185,000 / yr',
      experience: '1+ years exp',
      jobType: 'Full-time, Part-time',
      industry: 'Developer Tools / Artificial Intelligence / Early Stage',
      status: 'Applied',
      appliedDate: '2026-07-30',
      matchScore: 89,
      matchGrade: 'GOOD MATCH',
      postedAgo: '2 days ago',
      applicantsCount: 'Less than 15 applicants',
      h1bStatus: '• Visa Sponsorship Available',
      tags: ['Be an early applicant', 'TypeScript'],
      notes: 'Applied with tailored resume & cover letter generated via ResumeOK AI.',
      liked: false,
      autoApplied: true,
      isHidden: false
    },
    {
      id: 'job-3',
      company: 'Sinclair Inc.',
      companyInitials: 'S',
      title: 'Contract Associate Engineer, Software Development',
      location: 'United States • Remote',
      salary: '$83,000 - $110,000 / yr',
      experience: '0+ years exp',
      jobType: 'Full-time, Contract',
      industry: 'Media & Entertainment / Digital Media / Public Company',
      status: 'Saved',
      appliedDate: '2026-08-01',
      matchScore: 78,
      matchGrade: 'FAIR MATCH',
      postedAgo: 'Reposted 2 weeks ago',
      applicantsCount: 'Less than 25 applicants',
      h1bStatus: '• No H1B Required',
      tags: ['Entry Level', 'Immediate Hire'],
      notes: 'High priority fit score. Need to highlight React and Node experience.',
      liked: true,
      autoApplied: false,
      isHidden: false
    },
    {
      id: 'job-4',
      company: 'Figma',
      companyInitials: 'F',
      title: 'Senior Design Systems Developer',
      location: 'San Francisco, CA • Hybrid',
      salary: '$180,000 - $220,000 / yr',
      experience: '4+ years exp',
      jobType: 'Full-time',
      industry: 'Design Software / Enterprise SaaS',
      status: 'Offer',
      appliedDate: '2026-07-20',
      matchScore: 96,
      matchGrade: 'GREAT MATCH',
      postedAgo: '3 weeks ago',
      applicantsCount: 'Over 50 applicants',
      h1bStatus: '• Visa Sponsorship Available',
      tags: ['Top Tier Match', 'High Equity'],
      notes: 'Offer letter received! Reviewing equity package and health benefits.',
      liked: true,
      autoApplied: true,
      isHidden: false
    },
    {
      id: 'job-5',
      company: 'Vercel',
      companyInitials: 'V',
      title: 'UI/UX Developer & Systems Designer',
      location: 'Remote (Global)',
      salary: '$170,000 - $210,000 / yr',
      experience: '3+ years exp',
      jobType: 'Full-time',
      industry: 'Developer Experience / Web Platform',
      status: 'Saved',
      appliedDate: '2026-08-02',
      matchScore: 91,
      matchGrade: 'GREAT MATCH',
      postedAgo: '1 day ago',
      applicantsCount: 'Less than 10 applicants',
      h1bStatus: '• No H1B Required',
      tags: ['UI/UX Developer', 'React'],
      notes: 'Architecting Vercel Design Tokens.',
      liked: true,
      autoApplied: true,
      isHidden: true
    }
  ]);

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setJobs(jobs.map(j => j.id === id ? { ...j, liked: !j.liked } : j));
  };

  const toggleHideJob = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setJobs(jobs.map(j => j.id === id ? { ...j, isHidden: !j.isHidden } : j));
  };

  const handleApplyClick = (id: string, _title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCopiedApply(id);
    setTimeout(() => setCopiedApply(null), 2500);
  };

  const resetAllFilters = () => {
    setLocationFilter('All Locations');
    setRoleFilter('All Roles');
    setExpFilter('All Levels');
    setJobTypeFilter('All Types');
    setSalaryFilter('Any Salary');
    setDateFilter('Anytime');
    setShowHiddenOnly(false);
    setAdvNoH1B(false);
    setAdvEarlyApplicant(false);
    setAdvMinMatch85(false);
    setSearchTerm('');
  };

  // Advanced Filtering Logic
  const filteredJobs = jobs.filter(job => {
    // Hidden Filter
    if (showHiddenOnly) {
      if (!job.isHidden) return false;
    } else {
      if (job.isHidden) return false;
    }

    // Tab Filter
    if (activeTab === 'Liked' && !job.liked) return false;
    if (activeTab === 'Applied' && !(job.status === 'Applied' || job.status === 'Interviewing' || job.status === 'Offer')) return false;

    // Search term
    const matchesSearch = job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.industry.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // Location Filter
    if (locationFilter !== 'All Locations' && locationFilter !== 'United States') {
      if (locationFilter === 'Remote Only' && !job.location.includes('Remote')) return false;
      if (locationFilter === 'San Francisco, CA' && !job.location.includes('San Francisco')) return false;
      if (locationFilter === 'Canada' && !job.location.includes('Canada')) return false;
    }

    // Role Filter
    if (roleFilter !== 'All Roles') {
      if (roleFilter === 'UI/UX Developer' && !job.title.includes('UI/UX') && !job.title.includes('Design')) return false;
      if (roleFilter === 'Frontend Engineer' && !job.title.includes('Frontend') && !job.title.includes('React')) return false;
      if (roleFilter === 'Android / Mobile' && !job.title.includes('Android') && !job.title.includes('Native')) return false;
    }

    // Experience Filter
    if (expFilter !== 'All Levels') {
      if (expFilter === 'Entry Level (0-2 yrs)' && !job.experience.includes('0+') && !job.experience.includes('1+')) return false;
      if (expFilter === 'Mid Level (2-4 yrs)' && !job.experience.includes('2-4')) return false;
      if (expFilter === 'Senior Level (4+ yrs)' && !job.experience.includes('4+')) return false;
    }

    // Advanced Modal Controls
    if (advNoH1B && !job.h1bStatus.includes('No H1B')) return false;
    if (advEarlyApplicant && !job.tags.some(t => t.toLowerCase().includes('early'))) return false;
    if (advMinMatch85 && job.matchScore < 85) return false;

    return true;
  });

  const activeFilterCount = [
    locationFilter !== 'All Locations' && locationFilter !== 'United States',
    roleFilter !== 'All Roles',
    expFilter !== 'All Levels',
    jobTypeFilter !== 'All Types',
    salaryFilter !== 'Any Salary',
    dateFilter !== 'Anytime',
    showHiddenOnly,
    advNoH1B,
    advEarlyApplicant,
    advMinMatch85
  ].filter(Boolean).length;

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)', backgroundColor: '#f2f4f5' }}>
      {/* 1. Left Sidebar Navigation */}
      <aside style={{ width: '240px', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', padding: '24px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.1em', color: '#64748b', textTransform: 'uppercase', marginBottom: '16px', paddingLeft: '12px' }}>
            APPLICATION SUITE
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', backgroundColor: '#141414', color: '#ffffff', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <Briefcase className="w-4 h-4 text-emerald-400" /> Jobs Feed
            </button>
            <button onClick={() => navigate('/build')} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', backgroundColor: 'transparent', color: '#334155', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <FileText className="w-4 h-4 text-slate-500" /> Resume Builder
            </button>
            <button onClick={() => navigate('/profile-sections')} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', backgroundColor: 'transparent', color: '#334155', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <User className="w-4 h-4 text-slate-500" /> Target Profile
            </button>
            <button onClick={() => navigate('/match')} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', backgroundColor: 'transparent', color: '#334155', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <Bot className="w-4 h-4 text-slate-500" /> AI Agent Copilot
            </button>
            <button onClick={() => navigate('/audit')} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', backgroundColor: 'transparent', color: '#334155', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <GraduationCap className="w-4 h-4 text-slate-500" /> Coaching
            </button>
            <button onClick={() => navigate('/cover-letter')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', backgroundColor: 'transparent', color: '#334155', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mic className="w-4 h-4 text-slate-500" /> Interview Prep
              </span>
              <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#ef4444', color: '#ffffff', padding: '2px 6px', borderRadius: '4px' }}>NEW</span>
            </button>
          </div>
        </div>

        {/* Bottom Promos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ backgroundColor: '#ecffe0', border: '1px solid #bcf096', padding: '14px', borderRadius: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#141414', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Gift className="w-4 h-4 text-emerald-600" /> Refer & Earn
            </div>
            <div style={{ fontSize: '11.5px', color: '#444444', lineHeight: '1.4', marginBottom: '8px' }}>
              Invite friends to get +50 free AI auto-apply credits.
            </div>
            <button onClick={() => navigate('/tasks')} style={{ fontSize: '12px', fontWeight: '700', color: '#141414', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Claim Invite Credits →
            </button>
          </div>

          <button onClick={() => navigate('/settings')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '13px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
            <SettingsIcon className="w-4 h-4" /> Settings & Preferences
          </button>
        </div>
      </aside>

      {/* 2. Main Middle Dashboard Stream */}
      <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        {/* Top Header Navigation & Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          {/* Breadcrumb Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#141414' }}>JOBS</span>
            <span style={{ color: '#cbd5e1' }}>›</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['Recommended', 'Liked', 'Applied'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '700',
                    backgroundColor: activeTab === tab ? '#141414' : '#ffffff',
                    color: activeTab === tab ? '#ffffff' : '#64748b',
                    border: activeTab === tab ? '1px solid #141414' : '1px solid #e2e8f0',
                    cursor: 'pointer'
                  }}
                >
                  {tab} ({tab === 'Recommended' ? jobs.filter(j => !j.isHidden).length : tab === 'Liked' ? jobs.filter(j => j.liked).length : jobs.filter(j => j.status === 'Applied' || j.status === 'Interviewing' || j.status === 'Offer').length})
                </button>
              ))}
            </div>
          </div>

          {/* Search & Turbo CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '20px', padding: '6px 14px', width: '280px' }}>
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search title, company or skill..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%' }}
              />
            </div>

            <button onClick={() => navigate('/pricing')} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#00f0a0', color: '#141414', border: '1px solid #141414', borderRadius: '20px', padding: '7px 16px', fontSize: '12.5px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <Zap className="w-3.5 h-3.5 fill-current" /> Upgrade to Turbo: Get Hired Faster ›
            </button>
          </div>
        </div>

        {/* 🌟 HIGH-END INTERACTIVE FILTER PILLS TOOLBAR */}
        <div ref={filterRef} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '24px', position: 'relative' }}>

          {/* Location Filter Pill */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setOpenDropdown(openDropdown === 'location' ? null : 'location')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '20px',
                fontSize: '12.5px',
                fontWeight: '700',
                backgroundColor: locationFilter !== 'All Locations' ? '#141414' : '#ffffff',
                color: locationFilter !== 'All Locations' ? '#ffffff' : '#334155',
                border: locationFilter !== 'All Locations' ? '1px solid #141414' : '1px solid #cbd5e1',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <MapPin className="w-3.5 h-3.5" /> {locationFilter} <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {openDropdown === 'location' && (
              <div style={{ position: 'absolute', top: '110%', left: 0, backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '8px', zIndex: 100, minWidth: '180px' }}>
                {['All Locations', 'United States', 'Remote Only', 'San Francisco, CA', 'Canada'].map(loc => (
                  <div
                    key={loc}
                    onClick={() => { setLocationFilter(loc); setOpenDropdown(null); }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: locationFilter === loc ? '800' : '500',
                      color: locationFilter === loc ? '#2563eb' : '#334155',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: locationFilter === loc ? '#eff6ff' : 'transparent'
                    }}
                  >
                    {loc} {locationFilter === loc && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Target Role Filter Pill */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setOpenDropdown(openDropdown === 'role' ? null : 'role')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '20px',
                fontSize: '12.5px',
                fontWeight: '700',
                backgroundColor: roleFilter !== 'All Roles' ? '#141414' : '#ffffff',
                color: roleFilter !== 'All Roles' ? '#ffffff' : '#334155',
                border: roleFilter !== 'All Roles' ? '1px solid #141414' : '1px solid #cbd5e1',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <Briefcase className="w-3.5 h-3.5" /> {roleFilter} <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {openDropdown === 'role' && (
              <div style={{ position: 'absolute', top: '110%', left: 0, backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '8px', zIndex: 100, minWidth: '200px' }}>
                {['All Roles', 'UI/UX Developer', 'Frontend Engineer', 'Android / Mobile', 'Fullstack Engineer'].map(r => (
                  <div
                    key={r}
                    onClick={() => { setRoleFilter(r); setOpenDropdown(null); }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: roleFilter === r ? '800' : '500',
                      color: roleFilter === r ? '#2563eb' : '#334155',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: roleFilter === r ? '#eff6ff' : 'transparent'
                    }}
                  >
                    {r} {roleFilter === r && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Experience Filter Pill */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setOpenDropdown(openDropdown === 'exp' ? null : 'exp')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '20px',
                fontSize: '12.5px',
                fontWeight: '700',
                backgroundColor: expFilter !== 'All Levels' ? '#141414' : '#ffffff',
                color: expFilter !== 'All Levels' ? '#ffffff' : '#334155',
                border: expFilter !== 'All Levels' ? '1px solid #141414' : '1px solid #cbd5e1',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              {expFilter} <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {openDropdown === 'exp' && (
              <div style={{ position: 'absolute', top: '110%', left: 0, backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '8px', zIndex: 100, minWidth: '190px' }}>
                {['All Levels', 'Entry Level (0-2 yrs)', 'Mid Level (2-4 yrs)', 'Senior Level (4+ yrs)'].map(exp => (
                  <div
                    key={exp}
                    onClick={() => { setExpFilter(exp); setOpenDropdown(null); }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: expFilter === exp ? '800' : '500',
                      color: expFilter === exp ? '#2563eb' : '#334155',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: expFilter === exp ? '#eff6ff' : 'transparent'
                    }}
                  >
                    {exp} {expFilter === exp && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Hidden Jobs Button */}
          <button
            onClick={() => setShowHiddenOnly(!showHiddenOnly)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '20px',
              fontSize: '12.5px',
              fontWeight: '700',
              backgroundColor: showHiddenOnly ? '#fee2e2' : '#ffffff',
              color: showHiddenOnly ? '#dc2626' : '#475569',
              border: showHiddenOnly ? '1px solid #fca5a5' : '1px solid #cbd5e1',
              cursor: 'pointer'
            }}
          >
            <Lock className="w-3.5 h-3.5" /> Hidden Jobs ({jobs.filter(j => j.isHidden).length})
          </button>

          {/* All Filters Trigger Button */}
          <button
            onClick={() => setShowAllFiltersModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              borderRadius: '20px',
              fontSize: '12.5px',
              fontWeight: '800',
              backgroundColor: '#00f0a0',
              color: '#141414',
              border: '1px solid #141414',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,240,160,0.2)'
            }}
          >
            <Sliders className="w-3.5 h-3.5" /> ••• All Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>

          {/* Reset Filters Link */}
          {activeFilterCount > 0 && (
            <button
              onClick={resetAllFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                color: '#dc2626',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                paddingLeft: '4px'
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          )}
        </div>

        {/* Live Filter Summary Bar */}
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Showing <strong>{filteredJobs.length}</strong> matching positions</span>
          {showHiddenOnly && <span style={{ color: '#dc2626', fontWeight: '700' }}>⚠️ Viewing Hidden Jobs Bin</span>}
        </div>

        {/* Job Cards Stream (Split 2-Part Layout Matching Jobright) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredJobs.length === 0 ? (
            <div style={{ backgroundColor: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
              <Search className="w-10 h-10 mx-auto mb-3 text-slate-400" />
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#0f172a', marginBottom: '8px' }}>No matching jobs found</h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>Try broadening your search query or resetting your active filter pills.</p>
              <button onClick={resetAllFilters} style={{ padding: '8px 20px', borderRadius: '20px', backgroundColor: '#141414', color: '#ffffff', fontSize: '13px', fontWeight: '700', border: 'none', cursor: 'pointer' }}>
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredJobs.map(job => (
              <div
                key={job.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 220px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
                onClick={() => setSelectedJob(job)}
              >
                {/* Left Main Card Info */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {/* Badges Bar & Time */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      {/* Avatar Initials Logo */}
                      <div style={{ width: '40px', height: '40px', backgroundColor: '#141414', color: '#ffffff', fontWeight: '900', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', flexShrink: 0 }}>
                        {job.companyInitials}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                          {job.postedAgo}
                        </span>
                        {job.tags.map((t, idx) => (
                          <span key={idx} style={{ fontSize: '12px', fontWeight: '700', color: t.includes('Kotlin') ? '#7c3aed' : '#059669', backgroundColor: t.includes('Kotlin') ? '#f3e8ff' : '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Title & Company */}
                    <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: '400', color: '#0f172a', marginBottom: '4px', lineHeight: '1.25' }}>
                      {job.title}
                    </h3>
                    <div style={{ fontSize: '13.5px', color: '#64748b', fontWeight: '600', marginBottom: '16px' }}>
                      {job.company} · <span style={{ color: '#94a3b8' }}>{job.industry}</span>
                    </div>

                    {/* Grid Metadata */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '13px', color: '#334155', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin className="w-4 h-4 text-slate-400" /> {job.location}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Briefcase className="w-4 h-4 text-slate-400" /> {job.jobType}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DollarSign className="w-4 h-4 text-slate-400" /> {job.salary}
                      </div>
                    </div>
                  </div>

                  {/* Subtext & Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {job.applicantsCount}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button onClick={(e) => toggleHideJob(job.id, e)} style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title={job.isHidden ? "Unhide Job" : "Hide Job"}>
                        <Ban className={`w-4 h-4 ${job.isHidden ? 'text-red-600' : 'text-slate-400'}`} />
                      </button>
                      <button onClick={(e) => toggleLike(job.id, e)} style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Save Job">
                        <Heart className={`w-4 h-4 ${job.liked ? 'text-red-500 fill-current' : 'text-slate-400'}`} />
                      </button>

                      <button onClick={(e) => { e.stopPropagation(); navigate('/match'); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 14px', borderRadius: '20px', border: '1px solid #000000', backgroundColor: '#ffffff', color: '#000000', fontSize: '12.5px', fontWeight: '800', cursor: 'pointer' }}>
                        <Sparkles className="w-3.5 h-3.5" /> ASK COPILOT
                      </button>

                      <button onClick={(e) => handleApplyClick(job.id, job.title, e)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '20px', border: 'none', backgroundColor: '#00f0a0', color: '#000000', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}>
                        {copiedApply === job.id ? <><CheckCircle className="w-4 h-4 text-black inline-block" /> APPLIED!</> : 'APPLY WITH AUTOFILL'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Match Box (Dark #1e2024 Container matching Jobright) */}
                <div style={{ backgroundColor: '#1e2024', color: '#ffffff', padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderLeft: '1px solid #334155' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '4px solid #00f0a0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900', color: '#ffffff', marginBottom: '8px' }}>
                    {job.matchScore}%
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>
                    {job.matchGrade}
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '500' }}>
                    {job.h1bStatus}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* 3. Right Sidebar (User Profile & Saved Filters Panel) */}
      <aside style={{ width: '280px', backgroundColor: '#ffffff', borderLeft: '1px solid #e2e8f0', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px', flexShrink: 0 }}>
        {/* User Card */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#00f0a0', color: '#000000', fontWeight: '900', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              I
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>Iman</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Free Plan</div>
            </div>
          </div>
          <button onClick={() => navigate('/pricing')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            ✏️ Upgrade
          </button>
        </div>

        {/* Saved Filters */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Your Saved Filters</span>
            <button style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
          </div>
          <div style={{ fontSize: '12.5px', color: '#334155', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>UI/UX Developer + 3 roles, US</span>
            <span>✏️</span>
          </div>
        </div>

        {/* Onboarding Promo Card */}
        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#065f46', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            💡 Complete to Win 1v1 Private Coaching
          </div>

          <div style={{ width: '100%', backgroundColor: '#e2e8f0', height: '6px', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden' }}>
            <div style={{ width: '50%', backgroundColor: '#00f0a0', height: '100%' }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> 1. Customize Your Resume
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
              ⚪ 2. Enable Autofill Extension
            </div>
          </div>
        </div>
      </aside>

      {/* 🌟 ALL FILTERS MODAL DRAWER */}
      {showAllFiltersModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#ffffff', height: '100%', padding: '32px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#0f172a' }}>Advanced Filters</h2>
                <button onClick={() => setShowAllFiltersModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Checkbox 1 */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: '600', color: '#1e293b', cursor: 'pointer' }}>
                  <input type="checkbox" checked={advNoH1B} onChange={(e) => setAdvNoH1B(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  No H1B / US Citizens & Green Cards Only
                </label>

                {/* Checkbox 2 */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: '600', color: '#1e293b', cursor: 'pointer' }}>
                  <input type="checkbox" checked={advEarlyApplicant} onChange={(e) => setAdvEarlyApplicant(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  Be an Early Applicant (&lt; 25 applicants)
                </label>

                {/* Checkbox 3 */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: '600', color: '#1e293b', cursor: 'pointer' }}>
                  <input type="checkbox" checked={advMinMatch85} onChange={(e) => setAdvMinMatch85(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  High Match Score Only (85%+ Fit Score)
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <button onClick={resetAllFilters} style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontSize: '13px', fontWeight: '700', cursor: 'pointer', flex: 1 }}>
                Reset All
              </button>
              <button onClick={() => setShowAllFiltersModal(false)} style={{ padding: '12px 20px', borderRadius: '10px', border: 'none', backgroundColor: '#00f0a0', color: '#141414', fontSize: '13px', fontWeight: '800', cursor: 'pointer', flex: 1 }}>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Job Details Modal */}
      {selectedJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="resumeok-card-white" style={{ width: '100%', maxWidth: '640px', padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className="resumeok-badge resumeok-badge-blue">{selectedJob.status}</span>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: '#141414', marginTop: '8px' }}>{selectedJob.title}</h2>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#555555' }}>{selectedJob.company}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#059669' }}>{selectedJob.matchScore}% Match Score</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', padding: '16px 0', borderTop: '1px solid #ece9e2', borderBottom: '1px solid #ece9e2', marginBottom: '24px', fontSize: '14px', color: '#555555' }}>
              <div>📍 <strong>Location:</strong> {selectedJob.location}</div>
              <div>💰 <strong>Salary:</strong> {selectedJob.salary}</div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#141414', marginBottom: '8px' }}>Application Notes:</h4>
              <p style={{ fontSize: '14px', color: '#555555', lineHeight: '1.6', background: '#faf9f6', padding: '16px', border: '1px solid #e3dfd5' }}>
                {selectedJob.notes || 'No custom notes added for this position.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-resumeok-black" onClick={() => { setSelectedJob(null); navigate('/match'); }}>
                <Sparkles className="w-4 h-4 mr-2 inline-block" /> Tailor Resume For This Role
              </button>
              <button className="btn-resumeok-outline" onClick={() => setSelectedJob(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
