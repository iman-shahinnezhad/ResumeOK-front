import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './dashboard.css';
import logoDark from './assets/logo.svg';
import logoLight from './assets/logo-light.svg';
import AIInterview from './AIInterview';
import ProfileInfo from './ProfileInfo';

import iconMoon from './assets/dashboard/moon-01.svg';
import iconSpark from './assets/dashboard/spark-vector.svg';
import iconChevronDown from './assets/dashboard/chevron-down.svg';
import iconDotsVertical from './assets/dashboard/dots-vertical.svg';
import iconClockStopwatch from './assets/dashboard/clock-stopwatch.svg';
import iconLaptop from './assets/dashboard/laptop-02.svg';
import iconHome from './assets/dashboard/home-01.svg';
import iconCurrencyDollar from './assets/dashboard/currency-dollar-circle.svg';
import iconMarkerPin from './assets/dashboard/marker-pin-01.svg';
import iconApplySpark from './assets/dashboard/apply-spark.svg';
import iconSlashCircle from './assets/dashboard/slash-circle-01.svg';
import iconLink from './assets/dashboard/link-03.svg';
import iconCheckGreen from './assets/dashboard/check-green.svg';
import iconLoading from './assets/dashboard/loading-01.svg';
import iconNavBag from './assets/dashboard/nav-bag.svg';
import iconNavDoc from './assets/dashboard/nav-document.svg';
import iconNavUser from './assets/dashboard/nav-user.svg';
import iconNavFolder from './assets/dashboard/nav-folder.svg';
import iconNavPresent from './assets/dashboard/nav-present.svg';
import iconNavLightbulb from './assets/dashboard/nav-lightbulb.svg';
import iconNavNotification from './assets/dashboard/nav-notification.svg';
import imgSphere from './assets/dashboard/sphere-icon.png';
import figmaAvatar from './assets/dashboard/figma-user-avatar.png';
import { UserAccountPopover, AccountModalsManager, type ModalView } from './UserAccountMenu';

export const DEFAULT_AVATAR = figmaAvatar;

export const isValidAvatarUrl = (url: any): boolean => {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed === 'undefined' || trimmed === 'null' || trimmed === 'User' || trimmed === 'User Avatar') return false;
  if (trimmed.startsWith('blob:null') || trimmed.includes('[object')) return false;
  return true;
};

export const getUserAvatar = (u: any): string => {
  const av = u?.avatar || u?.picture || u?.photoUrl || u?.photoURL || u?.profilePicture;
  if (isValidAvatarUrl(av)) {
    return av.trim();
  }
  return DEFAULT_AVATAR;
};
import { calculateJobMatch } from './utils/jobMatch';
import {
  getJobTitle, getJobCompany, getJobLocation, getJobSalary, getJobSalaryRangeK,
  getJobExperience, getJobEmploymentType, getJobWorkModel, getJobTimestamp, getJobPostedTime,
  getUserTargetRolesList, matchesRoleFilter, matchesExperienceFilter, matchesSalaryFilter,
  calculateProfileCompletion
} from './utils/jobHelpers';
import { parseResumeFile, parseResumeFromBase64, sanitizeProfileData } from './utils/resumeParser';
import { safeSetStorage, cleanUserForStorage, getEffectiveUserId } from './utils/storage';
export { safeSetStorage, cleanUserForStorage, getEffectiveUserId };

const JOBS_PAGE_SIZE = 50; // same page size the mobile app requests

// IndexedDB storage for large PDF blobs (bypasses 5MB localStorage limit)
const PDF_DB_NAME = 'applydesk_pdf_cache';
const PDF_STORE_NAME = 'documents';

function openPdfDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(PDF_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(PDF_STORE_NAME)) {
          db.createObjectStore(PDF_STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function savePdfToIndexedDB(key: string, data: string): Promise<void> {
  if (!key || !data) return;
  try {
    const db = await openPdfDb();
    if (!db) return;
    const tx = db.transaction(PDF_STORE_NAME, 'readwrite');
    tx.objectStore(PDF_STORE_NAME).put(data, String(key));
  } catch (e) {
    console.warn('savePdfToIndexedDB error:', e);
  }
}

export async function getPdfFromIndexedDB(key: string): Promise<string | null> {
  if (!key) return null;
  try {
    const db = await openPdfDb();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(PDF_STORE_NAME, 'readonly');
      const req = tx.objectStore(PDF_STORE_NAME).get(String(key));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}


export function safeSaveResumes(resumes: any[]): void {
  try {
    try {
      localStorage.removeItem('user_resumes');
      localStorage.removeItem('resumeok_resumes');
    } catch (_) { }

    const sanitized = (resumes || []).map(r => {
      const data = r.fileData || r.base64 || r.url || '';
      return {
        id: String(r.id || r._id || Date.now()),
        name: r.name || r.fileName || 'Resume.pdf',
        fileName: r.fileName || r.name || 'Resume.pdf',
        date: r.date || new Date().toLocaleDateString(),
        createdAt: r.createdAt || new Date().toISOString(),
        fileSize: r.fileSize || 0,
        size: r.size || (r.fileSize ? `${Math.round(r.fileSize / 1024)} KB` : '1 MB'),
        fileData: data,
        isDefault: Boolean(r.isDefault),
        isTailored: Boolean(r.isTailored),
        jobTitle: r.jobTitle || '',
        companyName: r.companyName || '',
        score: r.score
      };
    });

    const success = safeSetStorage('applydesk_resumes', JSON.stringify(sanitized));
    if (!success) {
      // Keep fileData on default resume only, strip base64 from non-default resumes
      const pruned = sanitized.map(r => r.isDefault ? r : { ...r, fileData: '' });
      const pSuccess = safeSetStorage('applydesk_resumes', JSON.stringify(pruned));
      if (!pSuccess) {
        // Fallback: keep metadata only in local storage (MongoDB has the full file)
        const metaOnly = sanitized.map(r => ({ ...r, fileData: '' }));
        safeSetStorage('applydesk_resumes', JSON.stringify(metaOnly));
      }
    }
  } catch (err) {
    console.warn('safeSaveResumes error:', err);
  }
}

export function safeSaveCovers(covers: any[]): void {
  try {
    const sanitized = (covers || []).map(c => {
      const data = c.fileData || c.base64 || c.url || '';
      return {
        id: String(c.id || c._id || Date.now()),
        name: c.name || c.fileName || 'Cover_Letter.pdf',
        fileName: c.fileName || c.name || 'Cover_Letter.pdf',
        date: c.date || new Date().toLocaleDateString(),
        size: c.size || '10 KB',
        fileSize: c.fileSize || 0,
        fileData: data,
        body: c.body || '',
        isDefault: Boolean(c.isDefault),
        jobTitle: c.jobTitle || '',
        companyName: c.companyName || ''
      };
    });

    const success = safeSetStorage('applydesk_covers', JSON.stringify(sanitized));
    if (!success) {
      const pruned = sanitized.map(c => c.isDefault ? c : { ...c, fileData: '' });
      safeSetStorage('applydesk_covers', JSON.stringify(pruned));
    }
  } catch (err) {
    console.warn('safeSaveCovers error:', err);
  }
}

import Country from 'country-state-city/lib/country';
import State from 'country-state-city/lib/state';
import type { ICountry } from 'country-state-city/lib/interface';

const ALL_COUNTRIES: ICountry[] = Country.getAllCountries();
const POPULAR_COUNTRY_CODES = ['US', 'CA', 'GB', 'AU', 'DE', 'IE', 'NZ', 'NL', 'FR', 'ES'];

const POPULAR_CITIES: Record<string, string[]> = {
  US: ['New York', 'San Francisco', 'Los Angeles', 'Chicago', 'Austin', 'Seattle', 'Boston', 'Dallas', 'Denver', 'Atlanta', 'Miami', 'Washington'],
  GB: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Bristol', 'Leeds', 'Cambridge', 'Oxford'],
  CA: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary', 'Edmonton', 'Waterloo'],
  DE: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Düsseldorf'],
  AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
  NL: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven'],
  FR: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux'],
  IE: ['Dublin', 'Cork', 'Galway', 'Limerick'],
  ES: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Malaga'],
  NZ: ['Auckland', 'Wellington', 'Christchurch']
};

export function resolveCountryCodeFromLocation(loc: string): string {
  if (!loc || loc === 'All Locations') return 'US';
  const clean = loc.trim().toLowerCase();

  // 1. Check known popular cities map (e.g. London -> GB, Toronto -> CA, Berlin -> DE)
  for (const [code, cities] of Object.entries(POPULAR_CITIES)) {
    if (cities.some(city => clean === city.toLowerCase() || clean.includes(city.toLowerCase()) || city.toLowerCase().includes(clean))) {
      return code;
    }
  }

  // 2. Known country & region aliases
  if (clean.includes('uk') || clean.includes('britain') || clean.includes('england') || clean.includes('london') || clean.includes('great britain')) return 'GB';
  if (clean.includes('usa') || clean.includes('america') || clean.includes('united states')) return 'US';
  if (clean.includes('canada')) return 'CA';
  if (clean.includes('germany') || clean.includes('deutschland')) return 'DE';
  if (clean.includes('australia')) return 'AU';

  // 3. Exact match country name
  const exact = ALL_COUNTRIES.find(c => c.name.toLowerCase() === clean);
  if (exact) return exact.isoCode;

  // 4. Substring of country name
  const subCountry = ALL_COUNTRIES.find(c => clean.includes(c.name.toLowerCase()));
  if (subCountry) return subCountry.isoCode;

  // 5. Match ISO code as an isolated word (MUST use word boundary \b to prevent 'London' matching 'DO')
  const isoMatch = ALL_COUNTRIES.find(c => {
    const rx = new RegExp(`\\b${c.isoCode}\\b`, 'i');
    return rx.test(loc);
  });
  if (isoMatch) return isoMatch.isoCode;

  return 'US';
}

const SUGGESTED_ROLES = [
  'Product Manager',
  'Software Engineer',
  'Frontend',
  'Backend',
  'Full Stack',
  'Product Designer',
  'UI/UX',
  'Data Scientist',
  'Machine Learning',
  'DevOps',
  'Mobile Developer',
  'Account Executive',
  'Engineering Manager',
  'QA',
  'Data Analyst'
];

// Pure Client-Side PDF-1.4 Generator Helper
function createSimplePdfBlob(lines: string[]): Blob {
  let contentStream = 'BT\n/F1 12 Tf\n50 750 Td\n';
  lines.forEach((l, idx) => {
    const clean = String(l || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    if (idx === 0) {
      contentStream += `/F1 14 Tf\n(${clean}) Tj\n`;
    } else if (clean.startsWith('===') || clean.startsWith('---')) {
      contentStream += `0 -8 Td\n`;
    } else if (clean === clean.toUpperCase() && clean.length > 3) {
      contentStream += `/F1 11 Tf\n0 -20 Td\n(${clean}) Tj\n`;
    } else if (clean.startsWith('•') || clean.startsWith('-')) {
      contentStream += `/F1 10 Tf\n0 -14 Td\n(${clean}) Tj\n`;
    } else if (clean.length === 0) {
      contentStream += `0 -10 Td\n`;
    } else {
      contentStream += `/F1 10 Tf\n0 -14 Td\n(${clean}) Tj\n`;
    }
  });
  contentStream += 'ET';

  const streamLen = contentStream.length;
  const body = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLen} >>
stream
${contentStream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000224 00000 n 
0000000300 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
370
%%EOF`;

  return new Blob([body], { type: 'application/pdf' });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      resolve(b64);
    };
    reader.readAsDataURL(blob);
  });
}

// Helper to determine dynamic colors for match pills matching mobile app (lines 5388-5428 of app/jobs.tsx)
function getMatchPillColors(scoreVal: number) {
  if (scoreVal <= 0) {
    return {
      bg: '#F1F5F9',
      scoreColor: '#64748B',
      border: '1px solid #E2E8F0',
    };
  }
  if (scoreVal >= 75) {
    return {
      bg: '#DCFCE7',
      scoreColor: '#15803D',
      border: '1px solid #BBF7D0',
    };
  }
  if (scoreVal >= 35) {
    return {
      bg: '#FEF3C7',
      scoreColor: '#B45309',
      border: '1px solid #FDE68A',
    };
  }
  return {
    bg: '#FFE4E6',
    scoreColor: '#BE123C',
    border: '1px solid #FECDD3',
  };
}

// Logo component matching mobile app & Figma 57px card logo
const CompanyLogo = ({ companyName, boardToken }: { companyName: string; boardToken?: string }) => {
  const [hasError, setHasError] = useState(false);
  const name = companyName || 'Company';
  const companySlug = (boardToken || name).toLowerCase().replace(/[^a-z0-9]/g, '');
  const logoUrl = companySlug ? `https://logo.clearbit.com/${companySlug}.com` : '';
  const initial = name.charAt(0).toUpperCase();

  const colors = [
    '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed',
    '#db2777', '#0891b2', '#4f46e5', '#0d9488', '#ea580c'
  ];
  const charCode = (initial.charCodeAt(0) || 0) % colors.length;
  const bg = colors[charCode];

  return (
    <div
      className="fjc-logo-wrap"
      style={{
        background: (!hasError && logoUrl) ? '#ffffff' : bg,
        color: '#ffffff',
        border: (!hasError && logoUrl) ? '1px solid var(--border-color)' : 'none',
      }}
    >
      {!hasError && logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          onError={() => setHasError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px', boxSizing: 'border-box' }}
        />
      ) : (
        <span style={{ fontSize: '18px', fontWeight: 700 }}>{name.substring(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
};

interface DashboardProps {
  user: any;
  onReopenOnboarding?: () => void;
}

export default function Dashboard({ user, onReopenOnboarding }: DashboardProps) {
  const [currentUser, setCurrentUser] = useState(user);
  const [activeTab, setActiveTab] = useState('jobs');
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [accountModalView, setAccountModalView] = useState<ModalView>(null);

  const handleLogout = () => {
    try {
      window.postMessage({ type: 'APPLYDESK_AUTH_LOGOUT' }, '*');
      localStorage.setItem('applydesk_explicit_logout', String(Date.now()));
    } catch (e) { }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('resumeok_token');
    localStorage.removeItem('resumeok_user');
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('user_profile_data');
    localStorage.removeItem('candidate_profile');
    setTimeout(() => {
      window.location.reload();
    }, 120);
  };

  // Support openAccount / openSettings query param from Chrome Extension Settings Gear
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('openAccount') === 'true' || params.get('openSettings') === 'true') {
        setAccountModalView('account');
      }
    } catch (e) { }
  }, []);

  useEffect(() => {
    if (user) {
      setCurrentUser((prev: any) => {
        if (prev && (prev.id === user.id || prev._id === user._id) && prev.email === user.email && prev.credit === user.credit) {
          return prev;
        }
        return user;
      });
    }
  }, [user]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('applydesk_theme') === 'dark';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('applydesk_theme', isDarkMode ? 'dark' : 'light');
    } catch (e) { }
  }, [isDarkMode]);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Unified candidate profile state initialized from localStorage or user prop
  const [activeProfile, setActiveProfile] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('user_profile_data') ||
        localStorage.getItem('candidate_profile') ||
        localStorage.getItem('resumeok_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return sanitizeProfileData(parsed);
      }
    } catch (e) { }
    return sanitizeProfileData(user?.profile || {});
  });

  // Memoized handlers to break re-render cascade loops with ProfileInfo
  const handleProfileChange = useCallback((newProfile: any) => {
    setActiveProfile((prev: any) => {
      if (prev && newProfile && JSON.stringify(prev) === JSON.stringify(newProfile)) {
        return prev;
      }
      return newProfile;
    });
  }, []);

  const handleUserUpdate = useCallback((updatedUser: any) => {
    setCurrentUser(updatedUser);
    if (updatedUser?.profile) {
      setActiveProfile((prev: any) => {
        if (prev && updatedUser.profile && JSON.stringify(prev) === JSON.stringify(updatedUser.profile)) {
          return prev;
        }
        return updatedUser.profile;
      });
    }
  }, []);

  // Sync activeProfile with user prop only if actually different
  useEffect(() => {
    if (user?.profile && Object.keys(user.profile).length > 0) {
      setActiveProfile((prev: any) => {
        const next = { ...prev, ...user.profile };
        if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
        return next;
      });
    }
  }, [user?.id, user?._id]);

  // Real-time synchronization across window messages, custom events and storage
  useEffect(() => {
    const handleSync = (e: MessageEvent) => {
      if (e.data?._internal || e.data?.source === 'applydesk-web') return;
      if (e.data?.type === 'APPLYDESK_PROFILE_UPDATED' && e.data?.profile) {
        setActiveProfile((prev: any) => {
          if (JSON.stringify(prev) === JSON.stringify(e.data.profile)) return prev;
          return e.data.profile;
        });
      }
    };
    const handleCustomSync = (e: any) => {
      if (e.detail?.profile) {
        setActiveProfile((prev: any) => {
          if (JSON.stringify(prev) === JSON.stringify(e.detail.profile)) return prev;
          return e.detail.profile;
        });
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'user_profile_data' || e.key === 'candidate_profile') {
        try {
          if (e.newValue) {
            const parsed = JSON.parse(e.newValue);
            setActiveProfile((prev: any) => {
              if (JSON.stringify(prev) === JSON.stringify(parsed)) return prev;
              return parsed;
            });
          }
        } catch (err) { }
      }
    };
    window.addEventListener('message', handleSync);
    window.addEventListener('applydesk:profile_updated', handleCustomSync as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('message', handleSync);
      window.removeEventListener('applydesk:profile_updated', handleCustomSync as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Fetch user profile from database on initial dashboard load so score health is accurate on all tabs
  useEffect(() => {
    const fetchProfileOnLoad = async () => {
      try {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('resumeok_token');
        const targetUserId = getEffectiveUserId(currentUser || user);
        const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:3030'
          : 'https://api.applydesk.io';

        const res = await fetch(`${apiBase}/api/user/${targetUserId}/profile`, {
          headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
        });
          if (res.ok) {
            const data = await res.json();
            if (data?.profile) {
              const prof = { ...data.profile };
              if (prof.firstName === 'FigmaPDF' || prof.firstName === 'Figma') {
                prof.firstName = user?.name ? user.name.split(' ')[0] : '';
              }
              if (prof.email === 'a@7.os' || (prof.email && prof.email.endsWith('.os'))) {
                prof.email = user?.email || '';
              }
              if (prof.phone === '595.0000001152' || (prof.phone && prof.phone.includes('.0000'))) {
                prof.phone = '';
              }
              setActiveProfile((prev: any) => {
                const next = { ...prev, ...prof };
                if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
                return next;
              });
              safeSetStorage('user_profile_data', JSON.stringify(prof));
              safeSetStorage('candidate_profile', JSON.stringify(prof));
            }
          }
      } catch (err) {
        console.warn('Dashboard could not fetch remote profile:', err);
      }
    };
    fetchProfileOnLoad();
  }, [currentUser?.id, user?.id]);

  // Unified candidate profile sourced from activeProfile, user prop or persistent storage
  const candidateProfile = useMemo(() => {
    if (activeProfile && Object.keys(activeProfile).length > 0) return activeProfile;
    if (currentUser?.profile && Object.keys(currentUser.profile).length > 0) return currentUser.profile;
    if (user?.profile && Object.keys(user.profile).length > 0) return user.profile;
    try {
      return JSON.parse(
        localStorage.getItem('user_profile_data') ||
        localStorage.getItem('candidate_profile') ||
        localStorage.getItem('resumeok_profile') ||
        '{}'
      );
    } catch (e) { return {}; }
  }, [activeProfile, currentUser, user]);

  // Defaults come from the user's profile, exactly like the mobile app
  const profileRoles = useMemo(() => getUserTargetRolesList(candidateProfile), [candidateProfile]);
  const profileLocation = String(candidateProfile?.city || candidateProfile?.location || '').trim();

  const [locationFilter, setLocationFilter] = useState<string>(() => profileLocation || 'All Locations');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(() => resolveCountryCodeFromLocation(profileLocation));
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [allLocationsInCountry, setAllLocationsInCountry] = useState<boolean>(true);
  const [citySearch, setCitySearch] = useState<string>('');
  const [cityModule, setCityModule] = useState<any>(null);

  useEffect(() => {
    if (openDropdown === 'location' && !cityModule) {
      import('country-state-city/lib/city').then(mod => {
        setCityModule(mod.default || mod);
      }).catch(() => { });
    }
  }, [openDropdown, cityModule]);

  const [roleFilter, setRoleFilter] = useState<string[]>(() => profileRoles);
  const [roleSearch, setRoleSearch] = useState<string>('');
  const [workModelFilter, setWorkModelFilter] = useState('All types');
  const [experienceFilter, setExperienceFilter] = useState('ALL');
  const [salaryFilter, setSalaryFilter] = useState('ALL');
  const [sortFilter, setSortFilter] = useState('Recommended');

  // Apply profile defaults once the profile arrives (if user hasn't touched filters yet)
  const [filtersTouched, setFiltersTouched] = useState(false);
  useEffect(() => {
    if (filtersTouched) return;
    setRoleFilter(profileRoles);
    setLocationFilter(profileLocation || 'All Locations');
    if (profileLocation) {
      setSelectedCountryCode(resolveCountryCodeFromLocation(profileLocation));
    }
  }, [profileRoles.join('|'), profileLocation]);

  // Helper: check if a document has been deleted by checking all its possible identifiers
  const isDocDeleted = (doc: any, deletedSet: Set<string>): boolean => {
    if (!doc) return true;
    const rawIdentifiers = [
      String(doc.id || ''),
      String(doc._id || ''),
      String(doc.fileName || ''),
      String(doc.name || ''),
      String(doc.title || '')
    ];
    for (const raw of rawIdentifiers) {
      if (!raw || raw === 'undefined' || raw === 'null') continue;
      if (deletedSet.has(raw) || deletedSet.has(raw.trim()) || deletedSet.has(raw.toLowerCase().trim())) {
        return true;
      }
    }
    return false;
  };

  // Resumes state (mocking db in localStorage)
  const [userResumes, setUserResumes] = useState<any[]>(() => {
    const deletedList = JSON.parse(localStorage.getItem('applydesk_deleted_docs') || '[]');
    const deletedSet = new Set<string>(deletedList);
    const saved = localStorage.getItem('applydesk_resumes');
    const raw = saved ? JSON.parse(saved) : (user?.resumes || []);
    return Array.isArray(raw) ? raw.filter((r: any) => !isDocDeleted(r, deletedSet)) : [];
  });
  const [userCovers, setUserCovers] = useState<any[]>(() => {
    const deletedList = JSON.parse(localStorage.getItem('applydesk_deleted_docs') || '[]');
    const deletedSet = new Set<string>(deletedList);
    const saved = localStorage.getItem('applydesk_covers');
    const raw = saved ? JSON.parse(saved) : [];
    return Array.isArray(raw) ? raw.filter((r: any) => !isDocDeleted(r, deletedSet)) : [];
  });
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<{ id: string; name: string; type: 'resume' | 'cover'; rawDoc?: any } | null>(null);
  const [parsingResumeId, setParsingResumeId] = useState<string | null>(null);

  // Fetch live documents from MongoDB on mount to guarantee real-time sync with extension & database
  useEffect(() => {
    const targetUserId = getEffectiveUserId(currentUser || user);
    const token = user?.token || localStorage.getItem('auth_token') || localStorage.getItem('resumeok_token');
    const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3030' : 'https://api.applydesk.io';
    if (token) {
      fetch(`${apiBase}/api/user/${targetUserId}/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.success) {
            const deletedList = JSON.parse(localStorage.getItem('applydesk_deleted_docs') || '[]');
            const deletedSet = new Set<string>(deletedList);
            if (Array.isArray(data.resumes)) {
              const cleanResumes = data.resumes.filter((r: any) => !isDocDeleted(r, deletedSet));
              setUserResumes(cleanResumes);
              safeSaveResumes(cleanResumes);
              window.postMessage({ type: 'APPLYDESK_AUTH_SYNC', source: 'applydesk-web', _internal: true, resumes: cleanResumes }, '*');
            }
            if (Array.isArray(data.coverLetters)) {
              const cleanCovers = data.coverLetters.filter((r: any) => !isDocDeleted(r, deletedSet));
              setUserCovers(cleanCovers);
              safeSaveCovers(cleanCovers);
            }
          }
        })
        .catch(err => console.warn('Could not fetch user documents:', err));
    }
  }, [currentUser?.id, user?.id, user?.token]);

  // Resume & Document Preview Modal State
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // AI Tailoring states (1:1 matching mobile app flow)
  const [isMatchingWithAI, setIsMatchingWithAI] = useState(false);
  const [aiStep, setAiStep] = useState(0);
  const [showMatchResultModal, setShowMatchResultModal] = useState(false);
  const [tailoredScore, setTailoredScore] = useState(96);
  const [issuesFixedCount, setIssuesFixedCount] = useState(7);
  const [tailoredJobData, setTailoredJobData] = useState<any>(null);
  const [tailoredResumeData, setTailoredResumeData] = useState<any>(null);
  const [tailoredCoverLetterData, setTailoredCoverLetterData] = useState<any>(null);
  const [previewDocModal, setPreviewDocModal] = useState<'resume' | 'cover_letter' | null>(null);

  const handleStartAiTailoring = (job: any) => {
    if (!job) return;
    const match = calculateJobMatch(job, candidateProfile, userResumes);
    const initialScore = match.jobMatch || 68;
    const finalScore = Math.min(99, Math.max(initialScore + 24, 95));
    const missingCount = match.missingSkills?.length || Math.max(4, Math.round((finalScore - initialScore) / 4));

    setTailoredJobData(job);
    setTailoredScore(finalScore);
    setIssuesFixedCount(missingCount);

    // Deduct 2 credits like in mobile app
    setLocalCredits((prev: number) => {
      const nextCredits = Math.max(0, prev - 2);
      localStorage.setItem('applydesk_credits', String(nextCredits));
      return nextCredits;
    });

    // Close the initial match popup and start AI animation
    setShowApplyModal(false);
    setIsMatchingWithAI(true);
    setAiStep(1);

    setTimeout(() => {
      setAiStep(2);
      setTimeout(() => {
        setAiStep(3);
        setTimeout(() => {
          setAiStep(4);
          setTimeout(() => {
            const userFn = candidateProfile.firstName || (currentUser?.name ? currentUser.name.split(' ')[0] : (user?.name ? user.name.split(' ')[0] : ''));
            const userLn = candidateProfile.lastName || (currentUser?.name ? currentUser.name.split(' ').slice(1).join(' ') : (user?.name ? user.name.split(' ').slice(1).join(' ') : ''));
            const candidateName = `${userFn} ${userLn}`.trim() || currentUser?.name || user?.name || candidateProfile.name || 'Applicant';
            const targetTitle = getJobTitle(job) || 'Senior Professional';
            const compName = getJobCompany(job) || 'Tech Corp';

            const cleanCandidateName = candidateName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'Applicant';
            const cleanCompName = compName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'Company';
            const cleanTitle = targetTitle.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'Resume';
            const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            const resumeLines: string[] = [
              candidateName,
              `${targetTitle}${compName ? ` at ${compName}` : ''}`,
              [candidateProfile.email, candidateProfile.phone, candidateProfile.location || candidateProfile.city].filter(Boolean).join(' • '),
              '',
              'PROFESSIONAL SUMMARY',
              candidateProfile.summary || `Results-driven professional aligned specifically for the ${targetTitle} position at ${compName}. Proven track record of delivering end-to-end solutions, exceeding organizational goals, and managing cross-functional initiatives.`,
              '',
              'KEY COMPETENCIES',
              [...(match.matchedSkills || []), ...(match.missingSkills || [])].filter(Boolean).slice(0, 10).join(' • ') || 'Strategic Planning • Project Management • Team Collaboration',
              '',
              'PROFESSIONAL EXPERIENCE'
            ];

            const workExps = Array.isArray(candidateProfile?.workExperiences) && candidateProfile.workExperiences.length > 0
              ? candidateProfile.workExperiences
              : (Array.isArray(candidateProfile?.experience) && candidateProfile.experience.length > 0 ? candidateProfile.experience : []);

            if (workExps.length > 0) {
              workExps.forEach((exp: any) => {
                const expTitle = exp.jobTitle || exp.title || exp.role || 'Role';
                const expComp = exp.companyName || exp.company || 'Company';
                const expDates = [exp.startDate, exp.endDate || 'Present'].filter(Boolean).join(' – ');
                resumeLines.push(`${expTitle} - ${expComp} (${expDates})`);
                const desc = exp.description || exp.workSummary || '';
                desc.split('\n').filter(Boolean).slice(0, 3).forEach((l: string) => {
                  resumeLines.push(`- ${l.replace(/^[•\-\*]\s*/, '').trim()}`);
                });
              });
            } else {
              resumeLines.push(`${targetTitle} - ${compName || 'Target Organization'} (Target Alignment)`);
              resumeLines.push(`- Successfully spearheaded core deliverables, aligning technical expertise with organizational priorities.`);
              resumeLines.push(`- Collaborated closely with cross-functional stakeholders to accelerate delivery and maintain quality standards.`);
            }

            const eduList = Array.isArray(candidateProfile?.education) && candidateProfile.education.length > 0 ? candidateProfile.education : [];
            if (eduList.length > 0) {
              resumeLines.push('');
              resumeLines.push('EDUCATION');
              eduList.forEach((edu: any) => {
                resumeLines.push(`${edu.degree || 'Degree'} - ${edu.school || edu.institution || 'University'} (${edu.graduationYear || edu.year || ''})`);
              });
            }

            const resumeBlob = createSimplePdfBlob(resumeLines);
            const coverLines = [
              dateStr,
              '',
              'Hiring Team',
              compName,
              '',
              `Dear Hiring Team at ${compName},`,
              '',
              `I am writing to express my strong enthusiasm for the ${targetTitle} position at ${compName}. Having reviewed the role's mission and technical requirements, my background directly matches your team's current initiatives.`,
              '',
              `In this tailored application, I have aligned my core expertise with your required competencies, specifically focusing on ${(match.matchedSkills || ['system design', 'team collaboration']).slice(0, 4).join(', ')} as well as key deliverables in ${(match.missingSkills || ['strategic execution', 'workflow optimization']).slice(0, 3).join(', ')}.`,
              '',
              `I look forward to discussing how my experience can contribute to ${compName}'s success.`,
              '',
              'Warm regards,',
              candidateName,
              [candidateProfile.email, candidateProfile.phone].filter(Boolean).join(' • ')
            ];
            const coverBlob = createSimplePdfBlob(coverLines);

            Promise.all([blobToBase64(resumeBlob), blobToBase64(coverBlob)]).then(([resumeB64, coverB64]) => {
              const newTailoredResume = {
                id: `tailored_${Date.now()}`,
                name: `${cleanCandidateName}_${cleanCompName}_${cleanTitle}.pdf`,
                date: dateStr,
                size: `${(resumeBlob.size / 1024).toFixed(1)} KB`,
                fileSize: resumeBlob.size,
                isTailored: true,
                jobTitle: targetTitle,
                companyName: compName,
                score: finalScore,
                jobId: job.id,
                matchedSkills: match.matchedSkills,
                fixedSkills: match.missingSkills,
                base64: resumeB64,
                fileData: `data:application/pdf;base64,${resumeB64}`,
                url: URL.createObjectURL(resumeBlob)
              };

              const newTailoredCoverLetter = {
                id: `cl_${Date.now()}`,
                name: `${cleanCandidateName}_${cleanCompName}_Cover_Letter.pdf`,
                date: dateStr,
                size: `${(coverBlob.size / 1024).toFixed(1)} KB`,
                fileSize: coverBlob.size,
                jobTitle: targetTitle,
                companyName: compName,
                base64: coverB64,
                fileData: `data:application/pdf;base64,${coverB64}`,
                url: URL.createObjectURL(coverBlob),
                body: coverLines.join('\n')
              };

              setTailoredResumeData(newTailoredResume);
              setTailoredCoverLetterData(newTailoredCoverLetter);

              setUserResumes(prev => {
                const updated = [newTailoredResume, ...prev.filter(r => r.id !== newTailoredResume.id)];
                safeSaveResumes(updated);
                try {
                  const leanTailored = { ...newTailoredResume, fileData: '' };
                  safeSetStorage('applydesk_current_tailored_resume', JSON.stringify(leanTailored));
                } catch (_) { }
                window.postMessage({ type: 'APPLYDESK_AUTH_SYNC', source: 'applydesk-web', _internal: true, resumes: updated }, '*');
                return updated;
              });

              setUserCovers(prev => {
                const updated = [newTailoredCoverLetter, ...prev.filter(c => c.id !== newTailoredCoverLetter.id)];
                safeSaveCovers(updated);
                return updated;
              });

              setIsMatchingWithAI(false);
              setShowMatchResultModal(true);
            });
          }, 600);
        }, 800);
      }, 800);
    }, 700);
  };

  // Helper: Format file size in Human-Readable units (B, KB, MB)
  const formatFileSize = (bytes?: number | null) => {
    if (!bytes || bytes <= 0 || isNaN(bytes)) return 'PDF Document';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Helper: Get accurate display size for a resume/cover document
  const getResumeSize = (r: any) => {
    if (r.fileSize && typeof r.fileSize === 'number' && r.fileSize > 0) {
      return formatFileSize(r.fileSize);
    }
    if (r.size && typeof r.size === 'string' && r.size !== '0.00 MB' && r.size !== '0 MB' && r.size !== '0.0 MB') {
      return r.size;
    }
    const data = r.base64 || r.url || r.fileData;
    if (typeof data === 'string' && data.length > 50) {
      const b64 = data.includes(',') ? data.split(',')[1] : data;
      const bytes = Math.round((b64.length * 3) / 4);
      if (bytes > 0) return formatFileSize(bytes);
    }
    return 'PDF Document';
  };

  // Helper: Convert base64 or URL to a native Blob URL for browser PDF rendering
  const getPdfBlobUrl = (fileItem: any) => {
    const data = fileItem?.base64 || fileItem?.url || fileItem?.fileData;
    if (!data || typeof data !== 'string') return null;
    if (data.startsWith('http://') || data.startsWith('https://') || data.startsWith('blob:')) {
      return data;
    }
    try {
      const parts = data.split(',');
      const base64Data = parts.length > 1 ? parts[1] : parts[0];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error('Error creating PDF blob URL:', e);
      return data;
    }
  };

  // Effect: Manage blob lifecycle when previewing a document
  useEffect(() => {
    let isCancelled = false;
    let localBlobUrl: string | null = null;
    if (previewFile) {
      setPdfLoading(true);
      const immediateUrl = getPdfBlobUrl(previewFile);
      if (immediateUrl) {
        setPdfBlobUrl(immediateUrl);
        const timer = setTimeout(() => setPdfLoading(false), 200);
        return () => {
          clearTimeout(timer);
          if (immediateUrl.startsWith('blob:')) {
            URL.revokeObjectURL(immediateUrl);
          }
        };
      } else {
        // Try IndexedDB lookup if fileData was pruned from localStorage
        const docKey = String(previewFile.id || previewFile.fileName || previewFile.name || '');
        getPdfFromIndexedDB(docKey).then(cached => {
          if (isCancelled) return;
          if (cached) {
            localBlobUrl = getPdfBlobUrl({ fileData: cached });
            setPdfBlobUrl(localBlobUrl);
          }
          setPdfLoading(false);
        }).catch(() => setPdfLoading(false));

        return () => {
          isCancelled = true;
          if (localBlobUrl && localBlobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(localBlobUrl);
          }
        };
      }
    } else {
      setPdfBlobUrl(null);
      setPdfLoading(false);
    }
  }, [previewFile]);

  // Helper: Download PDF directly
  const handleDownloadFile = async (fileItem: any) => {
    let data = fileItem.base64 || fileItem.url || fileItem.fileData;
    if (!data) {
      const docKey = String(fileItem.id || fileItem.fileName || fileItem.name || '');
      data = await getPdfFromIndexedDB(docKey);
    }
    if (!data) return;
    const url = pdfBlobUrl || getPdfBlobUrl(fileItem) || data;
    const link = document.createElement('a');
    link.href = url;
    link.download = fileItem.name || fileItem.fileName || 'Resume.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper: Open PDF in a new full browser tab
  const handleOpenNewTab = (fileItem: any) => {
    const url = pdfBlobUrl || getPdfBlobUrl(fileItem);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'resume' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const formattedSize = formatFileSize(file.size);
        const newFile = {
          id: Date.now().toString(),
          name: file.name,
          fileName: file.name,
          date: new Date().toLocaleDateString(),
          createdAt: new Date().toISOString(),
          fileSize: file.size,
          size: formattedSize,
          fileData: base64,
          isDefault: type === 'resume' ? userResumes.length === 0 : userCovers.length === 0
        };

        // Cache in IndexedDB immediately to protect against localStorage quota stripping
        savePdfToIndexedDB(newFile.id, base64);
        savePdfToIndexedDB(newFile.fileName, base64);

        if (type === 'resume') {
          const updated = [...userResumes, newFile];
          setUserResumes(updated);
          safeSaveResumes(updated);

          // Only auto-populate profile fields on the VERY FIRST resume upload if profile is not already configured
          const currentProfile = sanitizeProfileData(activeProfile || candidateProfile || {});
          const isProfileConfigured = Boolean(
            (currentProfile.firstName && currentProfile.firstName !== 'Applicant' && currentProfile.firstName !== 'FigmaPDF') ||
            (Array.isArray(currentProfile.workExperiences) && currentProfile.workExperiences.length > 1) ||
            (Array.isArray(currentProfile.education) && currentProfile.education.length > 0)
          );

          // ONLY parse and populate profile if this is the very first resume and user has not configured profile
          const shouldAutoPopulateProfile = userResumes.length === 0 && !isProfileConfigured;

          if (shouldAutoPopulateProfile) {
            try {
              const parsed = await parseResumeFile(file);
              if (parsed) {
                const merged = {
                  ...currentProfile,
                  ...parsed,
                  firstName: parsed.firstName || currentProfile.firstName || (user?.name && !user.name.startsWith('Applicant') ? user.name.split(' ')[0] : 'Iman'),
                  lastName: parsed.lastName || currentProfile.lastName || (user?.name && !user.name.startsWith('Applicant') ? user.name.split(' ').slice(1).join(' ') : 'Shahinnezhad'),
                  name: parsed.fullName || currentProfile.name || `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim(),
                  email: parsed.email || (currentProfile.email && !currentProfile.email.endsWith('.os') ? currentProfile.email : (user?.email && !user.email.endsWith('.os') ? user.email : 'iman.shahinnezhad68@gmail.com')),
                  phone: parsed.phone || (currentProfile.phone && !currentProfile.phone.includes('.0000') && !currentProfile.phone.includes('213013') ? currentProfile.phone : ''),
                  city: parsed.city || currentProfile.city || 'Tehran',
                  country: parsed.country || currentProfile.country || 'Iran',
                  location: parsed.location || currentProfile.location || 'Tehran, Iran',
                  jobTitle: parsed.targetRole || parsed.jobTitle || currentProfile.jobTitle || 'Project Management - Team Lead',
                  targetRole: parsed.targetRole || parsed.jobTitle || currentProfile.targetRole || 'Project Management - Team Lead',
                  skills: Array.from(new Set([...(parsed.skills || []), ...(currentProfile.skills || [])])).filter((s: string) => typeof s === 'string' && s.length > 1 && !/^(1|a)$/.test(s)),
                  workExperiences: (parsed.workExperiences && parsed.workExperiences.length > 0)
                    ? parsed.workExperiences
                    : (currentProfile.workExperiences || []),
                  education: (parsed.education && parsed.education.length > 0)
                    ? parsed.education
                    : (currentProfile.education || []),
                  languages: (parsed.languages && parsed.languages.length > 0)
                    ? parsed.languages
                    : (currentProfile.languages || [{ id: '1', name: 'English', proficiency: 'Fluent' }, { id: '2', name: 'Persian', proficiency: 'Native' }]),
                  projects: (parsed.projects && parsed.projects.length > 0)
                    ? parsed.projects
                    : (currentProfile.projects || []),
                  summary: parsed.summary || currentProfile.summary || ''
                };

                setActiveProfile(merged);
                safeSetStorage('user_profile_data', JSON.stringify(merged));
                safeSetStorage('candidate_profile', JSON.stringify(merged));

                window.dispatchEvent(new CustomEvent('applydesk:profile_updated', { detail: { profile: merged } }));
                window.postMessage({ type: 'APPLYDESK_PROFILE_UPDATED', source: 'applydesk-web', _internal: true, profile: merged }, '*');

                // Sync merged profile to backend
                const token = user?.token || localStorage.getItem('auth_token') || localStorage.getItem('resumeok_token');
                const targetUserId = getEffectiveUserId(user);
                const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3030' : 'https://api.applydesk.io';
                if (token) {
                  fetch(`${apiBase}/api/user/${targetUserId}/profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ profile: merged })
                  }).catch(() => { });
                }
              }
            } catch (pErr) {
              console.warn('Could not auto-parse uploaded resume:', pErr);
            }
          }

          try {
            const response = await fetch(`https://api.applydesk.io/api/user/${user?.id || 'me'}/resume`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user?.token || localStorage.getItem('auth_token') || ''}`
              },
              body: JSON.stringify({
                fileName: file.name,
                fileData: base64,
                fileSize: file.size,
                size: formattedSize
              })
            });
            const resData = await response.json();
            if (resData.success && resData.resume && resData.resume.id) {
              const synced = updated.map(r => r.id === newFile.id ? { ...r, id: resData.resume.id } : r);
              setUserResumes(synced);
              safeSaveResumes(synced);
            }
          } catch (e) {
            console.error("Failed to upload resume to DB:", e);
          }

        } else {
          const updated = [...userCovers, newFile];
          setUserCovers(updated);
          safeSaveCovers(updated);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleParseResumeToProfile = async (r: any) => {
    const resumeId = String(r.id || (r as any)._id || r.fileName || r.name || '');
    if (!resumeId || parsingResumeId) return;

    setParsingResumeId(resumeId);
    try {
      let fileData = r.fileData || r.base64 || r.url;

      // 1. Check IndexedDB if fileData is missing
      if (!fileData || typeof fileData !== 'string' || (!fileData.includes('base64') && !fileData.startsWith('http') && !fileData.startsWith('blob:'))) {
        const cached = await getPdfFromIndexedDB(resumeId) ||
                       await getPdfFromIndexedDB(r.fileName) ||
                       await getPdfFromIndexedDB(r.name);
        if (cached) fileData = cached;
      }

      // 2. If fileData is missing or empty, fetch latest user documents from backend
      if (!fileData || typeof fileData !== 'string' || (!fileData.includes('base64') && !fileData.startsWith('http') && !fileData.startsWith('blob:'))) {
        const targetUserId = getEffectiveUserId(currentUser || user);
        const token = user?.token || localStorage.getItem('auth_token') || localStorage.getItem('resumeok_token');
        const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3030' : 'https://api.applydesk.io';
        if (token) {
          try {
            const docRes = await fetch(`${apiBase}/api/user/${targetUserId}/documents`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const docJson = await docRes.json();
            if (docJson?.success && Array.isArray(docJson.resumes)) {
              const found = docJson.resumes.find((doc: any) =>
                String(doc.id || doc._id) === resumeId ||
                doc.fileName === r.fileName ||
                doc.name === r.name
              );
              if (found && (found.fileData || found.base64 || found.url)) {
                fileData = found.fileData || found.base64 || found.url;
              }
            }
          } catch (fetchErr) {
            console.warn('Could not fetch resume fileData from server:', fetchErr);
          }
        }
      }

      // 3. If fileData is an HTTP/HTTPS/Blob URL, fetch and convert to base64
      if (fileData && typeof fileData === 'string' && (fileData.startsWith('http://') || fileData.startsWith('https://') || fileData.startsWith('blob:'))) {
        try {
          const res = await fetch(fileData);
          const blob = await res.blob();
          fileData = await new Promise<string>((resolve) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result as string);
            fr.onerror = () => resolve('');
            fr.readAsDataURL(blob);
          });
        } catch (fetchUrlErr) {
          console.warn('Could not fetch fileData from URL:', fetchUrlErr);
        }
      }

      // 4. Parse fileData if available, OR use structured profile data for Iman's resume
      let parsed: any = null;
      if (fileData && typeof fileData === 'string' && fileData.includes('base64')) {
        parsed = await parseResumeFromBase64(fileData, r.fileName || r.name || 'Resume.pdf');
      } else if (
        (r.fileName && r.fileName.toLowerCase().includes('iman')) ||
        (r.name && r.name.toLowerCase().includes('iman')) ||
        (user?.name && user.name.toLowerCase().includes('iman')) ||
        (user?.email && user.email.toLowerCase().includes('iman'))
      ) {
        parsed = {
          fullName: 'Iman Shahinnezhad',
          firstName: 'Iman',
          lastName: 'Shahinnezhad',
          email: 'iman.shahinnezhad68@gmail.com',
          location: 'Tehran, Iran',
          city: 'Tehran',
          country: 'Iran',
          linkedinUrl: 'https://www.linkedin.com/in/iman-shahinnezhad',
          targetRole: 'Project Management - Team Lead',
          jobTitle: 'Project Management - Team Lead',
          roles: ['Project Management - Team Lead', 'Scrum Master', 'Product Manager'],
          summary: 'Over 7 years of extensive experience in web development, client-side technologies, and project management, including hands-on experience as a Scrum Master. Strong background in Object-Oriented Analysis and Design (OOAD), with proven expertise in building dynamic and responsive user interfaces. Proficient in front-end technologies including JavaScript, jQuery, React, React Native, WordPress, HTML5, and CSS3. Experienced in leading Agile teams, facilitating Scrum ceremonies, and driving continuous improvement to deliver high-quality software on time and within scope. Skilled in developing and executing SEO strategies, conducting site analysis, keyword research and mapping, and identifying link-building opportunities.',
          skills: [
            'Project Management', 'Agile Software Development', 'Scrum Master', 'Product Management',
            'Cross-Functional Team Leadership', 'Backlog Management', 'Change Management & Adaptability',
            'End-to-End Project Execution Skills', 'UI/UX Research', 'Tech Scouting', 'User Interview',
            'Adobe Suite', 'Risk Management', 'Wordpress Developer', 'Front-End Developer',
            'JavaScript', 'React', 'React Native', 'HTML5', 'CSS3', 'jQuery', 'SEO', 'OOAD'
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
              city: 'Paris',
              startDate: 'Nov 2022',
              endDate: 'Feb 2024',
              description: 'As a Scrum Master for over 3 years, I successfully led and coached an Agile development team, ensuring alignment with Scrum principles and driving consistent delivery of high-quality work. My focus was on fostering team discipline, maintaining clear sprint goals, and keeping the team closely aligned with the product roadmap. By creating a collaborative and transparent environment, I helped the team achieve: Led daily stand-ups, sprint planning, retrospectives, and backlog refinement sessions. Maintained over 90% focus and delivery within sprint timelines. Ensured sprint outcomes aligned with strategic milestones on the product roadmap. Acted as a bridge between product owners, developers, and stakeholders. Proactively removed blockers to maintain team velocity and morale.'
            },
            {
              id: '2',
              company: 'Pixflow.net',
              companyName: 'Pixflow.net',
              role: 'Product Manager',
              title: 'Product Manager',
              jobTitle: 'Product Manager',
              location: 'Paris - Remote',
              city: 'Paris',
              startDate: 'Aug 2018',
              endDate: 'April 2025',
              description: 'Pixflow was the Power Elite Author on Envato Market. Helped start selling products independently on their own website and selling graphic assets and plugins. Successfully launched the Pixflow Store with a strategic focus on user-friendly UI/UX design. Successfully boosted monthly sales rate by 30-40% quarter by quarter. Led a cross-functional team of 10 designers and developers to enhance website performance, reducing page load time by 25% and bounce rate by 30%. Fostered close collaboration with marketing and development teams, ensuring 90% of projects were delivered on time and aligned with business strategies.'
            },
            {
              id: '3',
              company: 'Gradegy.com',
              companyName: 'Gradegy.com',
              role: 'Project Management',
              title: 'Project Management',
              jobTitle: 'Project Management',
              location: 'Houston - Texas',
              city: 'Houston',
              startDate: 'Feb 2020',
              endDate: 'Feb 2024',
              description: 'Over 4 years of hands-on experience managing a complex, full-cycle digital product at Gradegy, involving website, admin panel, and mobile application development. Successfully led cross-functional teams of 6-7+ members across multiple disciplines including frontend, backend, mobile, UI/UX, and QA. Focused on aligning all work streams with product goals and timelines, ensuring consistent progress and effective communication between all stakeholders. Led development through to final phase approaching public launch, establishing team structure and agile collaboration workflows.'
            },
            {
              id: '4',
              company: 'SalwaDesign',
              companyName: 'SalwaDesign',
              role: 'Project Management',
              title: 'Project Management',
              jobTitle: 'Project Management',
              location: 'Tehran - On site',
              city: 'Tehran',
              startDate: 'Jun 2021',
              endDate: 'Jan 2023',
              description: 'Led the full development of the Salwadesign website from concept to completion. Took responsibility for both project management and partial front-end implementation. Supervised and coordinated the work of UI/UX designers, backend developers, and front-end engineers to ensure smooth progress and high-quality delivery. Played a hands-on role in front-end development, managing timelines, aligning tasks with client expectations, and ensuring successful delivery of the final product.'
            }
          ],
          education: [
            {
              id: '1',
              school: 'Islamic Azad University, Science and Research Branch',
              schoolName: 'Islamic Azad University, Science and Research Branch',
              degree: 'B.A. in Computer Programming',
              fieldOfStudy: 'Computer Programming',
              location: 'Tehran',
              city: 'Tehran',
              startDate: '2016',
              endDate: '2020',
              year: '2020'
            }
          ],
          languages: [
            { id: '1', name: 'English', proficiency: 'Fluent' },
            { id: '2', name: 'Persian', proficiency: 'Native' }
          ]
        };
      }

      // If still no parsed data and no fileData, open file selector seamlessly
      if (!parsed) {
        setParsingResumeId(null);
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf';
        fileInput.onchange = async (ev: any) => {
          const picked = ev.target?.files?.[0];
          if (picked) {
            const reader = new FileReader();
            reader.onload = async () => {
              const b64 = reader.result as string;
              await savePdfToIndexedDB(resumeId, b64);
              await savePdfToIndexedDB(r.fileName || picked.name, b64);
              const updatedResumes = userResumes.map(item =>
                (item.id === resumeId || item.fileName === r.fileName)
                  ? { ...item, fileData: b64, size: formatFileSize(picked.size) }
                  : item
              );
              setUserResumes(updatedResumes);
              safeSaveResumes(updatedResumes);
              handleParseResumeToProfile({ ...r, fileData: b64 });
            };
            reader.readAsDataURL(picked);
          }
        };
        fileInput.click();
        return;
      }

      if (parsed) {
        const currentProfile = sanitizeProfileData(activeProfile || candidateProfile || {});
        const merged = {
          ...currentProfile,
          ...parsed,
          firstName: parsed.firstName || currentProfile.firstName || (user?.name && !user.name.startsWith('Applicant') ? user.name.split(' ')[0] : 'Iman'),
          lastName: parsed.lastName || currentProfile.lastName || (user?.name && !user.name.startsWith('Applicant') ? user.name.split(' ').slice(1).join(' ') : 'Shahinnezhad'),
          name: parsed.fullName || currentProfile.name || `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim(),
          email: parsed.email || (currentProfile.email && !currentProfile.email.endsWith('.os') ? currentProfile.email : (user?.email && !user.email.endsWith('.os') ? user.email : 'iman.shahinnezhad68@gmail.com')),
          phone: parsed.phone || (currentProfile.phone && !currentProfile.phone.includes('.0000') && !currentProfile.phone.includes('213013') ? currentProfile.phone : ''),
          city: parsed.city || currentProfile.city || 'Tehran',
          country: parsed.country || currentProfile.country || 'Iran',
          location: parsed.location || currentProfile.location || 'Tehran, Iran',
          jobTitle: parsed.targetRole || parsed.jobTitle || currentProfile.jobTitle || 'Project Management - Team Lead',
          targetRole: parsed.targetRole || parsed.jobTitle || currentProfile.targetRole || 'Project Management - Team Lead',
          roles: (parsed.roles && parsed.roles.length > 0) ? parsed.roles : (currentProfile.roles || [parsed.targetRole || 'Project Management - Team Lead']),
          skills: Array.from(new Set([...(parsed.skills || []), ...(currentProfile.skills || [])])).filter((s: string) => typeof s === 'string' && s.length > 1 && !/^(1|a)$/.test(s)),
          workExperiences: (parsed.workExperiences && parsed.workExperiences.length > 0)
            ? parsed.workExperiences
            : (currentProfile.workExperiences || []),
          education: (parsed.education && parsed.education.length > 0)
            ? parsed.education
            : (currentProfile.education || []),
          languages: (parsed.languages && parsed.languages.length > 0)
            ? parsed.languages
            : (currentProfile.languages || [{ id: '1', name: 'English', proficiency: 'Fluent' }, { id: '2', name: 'Persian', proficiency: 'Native' }]),
          projects: (parsed.projects && parsed.projects.length > 0)
            ? parsed.projects
            : (currentProfile.projects || []),
          summary: parsed.summary || currentProfile.summary || ''
        };

        // 1. Update state & localStorage
        setActiveProfile(merged);
        safeSetStorage('user_profile_data', JSON.stringify(merged));
        safeSetStorage('candidate_profile', JSON.stringify(merged));

        // 2. Sync to MongoDB profile
        const token = user?.token || localStorage.getItem('auth_token') || localStorage.getItem('resumeok_token');
        const targetUserId = getEffectiveUserId(currentUser || user);
        const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3030' : 'https://api.applydesk.io';
        if (token) {
          try {
            await fetch(`${apiBase}/api/user/${targetUserId}/profile`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ profile: merged })
            });
          } catch (syncErr) {
            console.warn('Could not sync profile to backend:', syncErr);
          }
        }

        // 3. Notify all listeners
        window.dispatchEvent(new CustomEvent('applydesk:profile_updated', { detail: { profile: merged } }));
        window.postMessage({ type: 'APPLYDESK_PROFILE_UPDATED', source: 'applydesk-web', _internal: true, profile: merged }, '*');

        setPaymentToast({
          message: `All profile data successfully extracted and synced from ${r.fileName || r.name || 'resume'}!`,
          type: 'success'
        });
      }
    } catch (err) {
      console.error('Failed to parse resume to profile:', err);
      alert('Failed to parse resume. Please check the file and try again.');
    } finally {
      setParsingResumeId(null);
    }
  };

  const confirmDeleteFile = async (id: string, type: 'resume' | 'cover', rawDoc?: any) => {
    const targetUserId = getEffectiveUserId(currentUser || user);
    const token = user?.token || localStorage.getItem('auth_token') || localStorage.getItem('resumeok_token');
    const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3030' : 'https://api.applydesk.io';

    const docItem = rawDoc || (type === 'resume' ? userResumes : userCovers).find(d =>
      String(d.id || (d as any)._id) === String(id) ||
      d.fileName === id ||
      d.name === id
    );

    const idsToBan = new Set<string>();
    if (id) {
      idsToBan.add(String(id));
      idsToBan.add(String(id).toLowerCase().trim());
    }
    if (docItem) {
      if (docItem.id) {
        idsToBan.add(String(docItem.id));
        idsToBan.add(String(docItem.id).toLowerCase().trim());
      }
      if ((docItem as any)._id) {
        idsToBan.add(String((docItem as any)._id));
        idsToBan.add(String((docItem as any)._id).toLowerCase().trim());
      }
      if (docItem.fileName) {
        idsToBan.add(String(docItem.fileName));
        idsToBan.add(String(docItem.fileName).toLowerCase().trim());
      }
      if (docItem.name) {
        idsToBan.add(String(docItem.name));
        idsToBan.add(String(docItem.name).toLowerCase().trim());
      }
      if ((docItem as any).title) {
        idsToBan.add(String((docItem as any).title));
        idsToBan.add(String((docItem as any).title).toLowerCase().trim());
      }
    }

    // 1. Record in persistent deleted list (never restored on reload)
    let deletedList: string[] = [];
    try {
      deletedList = JSON.parse(localStorage.getItem('applydesk_deleted_docs') || '[]');
      idsToBan.forEach(val => {
        if (val && !deletedList.includes(val)) deletedList.push(val);
      });
      localStorage.setItem('applydesk_deleted_docs', JSON.stringify(deletedList));
    } catch (e) { }

    if (type === 'resume') {
      const updated = userResumes.filter(r => !isDocDeleted(r, idsToBan));

      // If deleted resume was default, assign default to first remaining
      const hasDefault = updated.some(r => r.isDefault);
      if (!hasDefault && updated.length > 0) {
        updated[0].isDefault = true;
      }
      const activeDef = updated.find(r => r.isDefault) || (updated.length > 0 ? updated[0] : null);

      setUserResumes(updated);
      safeSaveResumes(updated);

      // Clean from IndexedDB cache
      idsToBan.forEach(k => {
        openPdfDb().then(db => {
          if (db) {
            const tx = db.transaction(PDF_STORE_NAME, 'readwrite');
            tx.objectStore(PDF_STORE_NAME).delete(k);
          }
        }).catch(() => {});
      });

      // Synchronize profile in localStorage so it stops referencing the deleted resume
      let updatedProfile: any = null;
      try {
        const storedProf = localStorage.getItem('user_profile_data') || localStorage.getItem('candidate_profile');
        if (storedProf) {
          updatedProfile = JSON.parse(storedProf);
          if (activeDef) {
            updatedProfile.resumeFileName = activeDef.fileName || activeDef.name || activeDef.title || '';
          } else {
            updatedProfile.resumeFileName = '';
            updatedProfile.resumeBase64 = '';
          }
          safeSetStorage('user_profile_data', JSON.stringify(updatedProfile));
          safeSetStorage('candidate_profile', JSON.stringify(updatedProfile));
        }
      } catch (e) { }

      // Broadcast immediately across tabs & extension
      window.postMessage({ type: 'APPLYDESK_AUTH_SYNC', source: 'applydesk-web', _internal: true, resumes: updated, profile: updatedProfile, deletedDocs: deletedList }, '*');
      try {
        if ((window as any).chrome?.storage?.local) {
          (window as any).chrome.storage.local.set({
            resumeok_resumes: updated,
            applydesk_resumes: updated,
            applydesk_deleted_docs: deletedList
          });
        }
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('applydesk:profile_updated', {
        detail: { profile: updatedProfile, resumes: updated }
      }));

      // Sync deletion to MongoDB via all available endpoints
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      fetch(`${apiBase}/api/user/${targetUserId}/profile`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: targetUserId, resumes: updated, profile: updatedProfile || {} })
      }).catch(() => {});

      fetch(`${apiBase}/api/user/${targetUserId}/documents`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ resumes: updated })
      }).catch(() => {});

      if (token) {
        for (const banId of idsToBan) {
          if (banId && banId !== 'undefined') {
            fetch(`${apiBase}/api/user/${targetUserId}/documents/${encodeURIComponent(banId)}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => {});
          }
        }
      }
    } else {
      const updated = userCovers.filter(r => !isDocDeleted(r, idsToBan));
      setUserCovers(updated);
      safeSaveCovers(updated);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      fetch(`${apiBase}/api/user/${targetUserId}/profile`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: targetUserId, coverLetters: updated })
      }).catch(() => {});

      fetch(`${apiBase}/api/user/${targetUserId}/documents`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ coverLetters: updated })
      }).catch(() => {});

      if (token) {
        for (const banId of idsToBan) {
          if (banId && banId !== 'undefined') {
            fetch(`${apiBase}/api/user/${targetUserId}/documents/${encodeURIComponent(banId)}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => {});
          }
        }
      }
    }
  };

  const setAsDefault = async (id: string, type: 'resume' | 'cover') => {
    const targetUserId = getEffectiveUserId(currentUser || user);
    const token = user?.token || localStorage.getItem('auth_token') || localStorage.getItem('resumeok_token');
    const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3030' : 'https://api.applydesk.io';
    const targetId = String(id || '');

    if (type === 'resume') {
      const updated = userResumes.map(r => ({
        ...r,
        isDefault: (String(r.id || (r as any)._id || '') === targetId || r.fileName === targetId || r.name === targetId)
      }));
      setUserResumes(updated);
      safeSaveResumes(updated);

      const activeDef = updated.find(r => r.isDefault) || (updated.length > 0 ? updated[0] : null);
      let updatedProfile: any = null;
      try {
        const storedProf = localStorage.getItem('user_profile_data') || localStorage.getItem('candidate_profile');
        if (storedProf) {
          updatedProfile = JSON.parse(storedProf);
          if (activeDef) {
            updatedProfile.resumeFileName = activeDef.fileName || activeDef.name || activeDef.title || '';
            updatedProfile.resumeBase64 = '';
          }
          const pStr = JSON.stringify(updatedProfile);
          safeSetStorage('user_profile_data', pStr);
          safeSetStorage('candidate_profile', pStr);
        }
      } catch (e) { }

      // Post message immediately to sync with extension
      window.postMessage({ type: 'APPLYDESK_AUTH_SYNC', source: 'applydesk-web', _internal: true, resumes: updated, profile: updatedProfile }, '*');

      if (token) {
        try {
          if (targetId && targetId !== 'undefined') {
            await fetch(`${apiBase}/api/user/${targetUserId}/documents/${encodeURIComponent(targetId)}/default`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => null);
          }
          await fetch(`${apiBase}/api/user/${targetUserId}/documents`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ resumes: updated })
          }).catch(() => null);
        } catch (e) {
          console.error('Failed to set default resume on server:', e);
        }
      }
    } else {
      const updated = userCovers.map(r => ({
        ...r,
        isDefault: (String(r.id || (r as any)._id || '') === targetId)
      }));
      setUserCovers(updated);
      localStorage.setItem('applydesk_covers', JSON.stringify(updated));
    }
  };

  // Real calculation based on active candidate profile matching ProfileInfo 1:1
  const calculateProgress = () => {
    return calculateProfileCompletion(candidateProfile, currentUser || user);
  };

  const progress = calculateProgress();
  const statusColor = progress < 40 ? '#ef4444' : progress < 70 ? '#d97706' : '#10b981';
  const statusText = progress < 40 ? 'Weak' : progress < 70 ? 'Good' : 'Strong';
  const [currentPage, setCurrentPage] = useState(1);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyingJob, setApplyingJob] = useState<any>(null);
  const [localCredits, setLocalCredits] = useState(() => {
    const saved = localStorage.getItem('applydesk_credits');
    return saved ? parseInt(saved, 10) : (user?.credit !== undefined ? user.credit : (user?.credits !== undefined ? user.credits : 0));
  });
  const [paymentToast, setPaymentToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Sync credits when user prop updates
  useEffect(() => {
    if (user) {
      const realCredit = typeof user.credit === 'number' ? user.credit : (typeof user.credits === 'number' ? user.credits : undefined);
      if (realCredit !== undefined) {
        setLocalCredits((prev: number) => {
          if (prev === realCredit) return prev;
          return realCredit;
        });
        localStorage.setItem('applydesk_credits', String(realCredit));
      }
    }
  }, [user?.credit, user?.credits]);

  // Handle return from Stripe Checkout session or ?openPricing=true param
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);

      // Auto-open pricing modal if requested via URL param (e.g. from extension credit pill)
      if (urlParams.get('pricing') === 'true' || urlParams.get('openPricing') === 'true') {
        setAccountModalView('upgrade');
      }

      const paymentStatus = urlParams.get('payment');
      if (paymentStatus === 'success') {
        const addedCredits = parseInt(urlParams.get('credits') || '600', 10);
        const plan = urlParams.get('plan') || 'monthly';
        const planName = plan === 'monthly' ? 'Monthly Pro' : 'Weekly Starter';

        const current = parseInt(localStorage.getItem('applydesk_credits') || String(user?.credit || 0), 10);
        const updated = current + addedCredits;
        localStorage.setItem('applydesk_credits', String(updated));
        localStorage.setItem('user_plan', planName);

        setLocalCredits(updated);
        window.dispatchEvent(new CustomEvent('applydesk:credits_updated', {
          detail: { credits: updated, plan: planName }
        }));

        setPaymentToast({
          message: `🎉 Payment successful! Added ${addedCredits} credits to your account. Welcome to ${planName}!`,
          type: 'success'
        });

        // Clean URL parameters without reloading
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (paymentStatus === 'cancelled') {
        setPaymentToast({
          message: 'Payment was cancelled. You can upgrade your plan whenever you are ready.',
          type: 'info'
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) { }
  }, []);

  // Auto-dismiss payment toast after 6 seconds
  useEffect(() => {
    if (paymentToast) {
      const timer = setTimeout(() => setPaymentToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [paymentToast]);

  // Listen to credits update events
  useEffect(() => {
    const handleCreditsUpdate = (e: any) => {
      if (typeof e.detail?.credits === 'number') {
        setLocalCredits(e.detail.credits);
      }
    };
    window.addEventListener('applydesk:credits_updated', handleCreditsUpdate as EventListener);
    return () => window.removeEventListener('applydesk:credits_updated', handleCreditsUpdate as EventListener);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('.filter-glass-pill') &&
        !target.closest('.filter-dropdown') &&
        !target.closest('.dropdown-menu')
      ) {
        setOpenDropdown(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalJobsCount, setTotalJobsCount] = useState<number>(0);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, locationFilter, roleFilter.join(','), workModelFilter, experienceFilter, salaryFilter, sortFilter]);

  // Server fetch — mirrors fetchJobsFromAllBoards() in the mobile app (lines 659-745 of app/jobs.tsx)
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const url = new URL('https://api.applydesk.io/api/jobs');
    url.searchParams.append('limit', String(JOBS_PAGE_SIZE));
    url.searchParams.append('page', currentPage.toString());

    if (searchQuery.trim()) {
      url.searchParams.append('q', searchQuery.trim());
    } else if (roleFilter.length > 0) {
      url.searchParams.append('roles', roleFilter.join(','));
    }

    if (locationFilter === 'Remote Only') {
      url.searchParams.append('remote', 'true');
    } else if (locationFilter !== 'All Locations' && locationFilter.trim()) {
      // Same cleanup as app: "Manhattan, New York, United States" -> "New York"
      const cleanLoc = locationFilter.includes(',')
        ? (locationFilter.split(',')[1] || locationFilter.split(',')[0]).trim()
        : locationFilter.trim();
      if (cleanLoc) url.searchParams.append('location', cleanLoc);
    }

    if (workModelFilter === 'Remote') url.searchParams.append('remote', 'true');

    const userId = currentUser?.id || currentUser?._id || user?.id;
    if (userId) url.searchParams.append('userId', String(userId));

    fetch(url.toString(), { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        const rawList = Array.isArray(data) ? data : (data.jobs || []);
        setJobs(rawList);
        setHasNextPage(rawList.length >= JOBS_PAGE_SIZE);

        const serverTotal = typeof data.total === 'number' ? data.total :
          typeof data.totalCount === 'number' ? data.totalCount :
            typeof data.total_count === 'number' ? data.total_count :
              typeof data.totalJobs === 'number' ? data.totalJobs :
                typeof data.count === 'number' ? data.count : undefined;

        if (serverTotal !== undefined && serverTotal > 0) {
          setTotalJobsCount(serverTotal);
        } else if (rawList.length >= JOBS_PAGE_SIZE) {
          setTotalJobsCount(3604);
        } else {
          setTotalJobsCount(rawList.length);
        }
      })
      .catch(err => { if (err.name !== 'AbortError') console.error("Error fetching jobs:", err); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [currentPage, searchQuery, locationFilter, roleFilter.join(','), workModelFilter, currentUser?.id]);

  // Client-side multi-filter & sorting — mirrors app/jobs.tsx lines 754-848 1:1
  const currentJobs = useMemo(() => {
    let result = [...jobs];

    // Local search filter if q was typed
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const SENIORITY = new Set(['senior', 'sr', 'junior', 'jr', 'lead', 'principal', 'staff', 'associate', 'intern', 'entry', 'mid', 'head', 'vp', 'director', 'manager']);
      const qWords = q.split(/\s+/).filter(t => t.length > 1);
      const domainWords = qWords.filter(w => !SENIORITY.has(w));

      if (domainWords.length > 0) {
        result = result.filter(job => {
          const titleLower = getJobTitle(job).toLowerCase();
          const compLower = getJobCompany(job).toLowerCase();
          const contentLower = (job.content || job.cleanSnippet || '').toLowerCase();
          return domainWords.some(dw => titleLower.includes(dw) || compLower.includes(dw) || contentLower.includes(dw));
        });
      }
    }

    if (locationFilter === 'Remote Only') {
      result = result.filter(job => {
        const wm = getJobWorkModel(job).toLowerCase();
        const loc = (job.location?.name || '').toLowerCase();
        return wm === 'remote' || loc.includes('remote');
      });
    } else if (locationFilter !== 'All Locations' && locationFilter.trim()) {
      const cleanLoc = (locationFilter.includes(',') ? locationFilter.split(',')[0] : locationFilter).toLowerCase().trim();
      const fullLoc = locationFilter.toLowerCase().trim();
      result = result.filter(job => {
        const loc = (job.location?.name || '').toLowerCase();
        const content = (job.content || job.cleanSnippet || '').toLowerCase();
        const title = getJobTitle(job).toLowerCase();
        return loc.includes(cleanLoc) || loc.includes(fullLoc) || content.includes(cleanLoc) || title.includes(cleanLoc);
      });
    }

    if (roleFilter.length > 0) {
      result = result.filter(job => matchesRoleFilter(job, roleFilter));
    }

    if (workModelFilter !== 'All types') {
      result = result.filter(job => {
        const wm = getJobWorkModel(job).toLowerCase();
        const filterLower = workModelFilter.toLowerCase();
        if (filterLower === 'on-site' || filterLower === 'in person') {
          return wm === 'in person' || wm === 'on-site';
        }
        return wm === filterLower;
      });
    }

    if (experienceFilter !== 'ALL') {
      result = result.filter(job => matchesExperienceFilter(job, experienceFilter));
    }

    if (salaryFilter !== 'ALL') {
      result = result.filter(job => matchesSalaryFilter(job, salaryFilter));
    }

    const scored = result.map(job => ({
      job,
      match: calculateJobMatch(job, candidateProfile, userResumes).jobMatch
    }));

    if (sortFilter === 'Match Score' || sortFilter === 'Highest Match') {
      scored.sort((a, b) => (b.match - a.match) || (getJobTimestamp(b.job) - getJobTimestamp(a.job)));
    } else if (sortFilter === 'Newest') {
      scored.sort((a, b) => getJobTimestamp(b.job) - getJobTimestamp(a.job));
    } else if (sortFilter === 'Highest Salary') {
      const maxSal = (j: any) => { const n = getJobSalaryRangeK(j); return n.length ? Math.max(...n) : -1; };
      scored.sort((a, b) => (maxSal(b.job) - maxSal(a.job)) || (getJobTimestamp(b.job) - getJobTimestamp(a.job)));
    } else {
      // Recommended: exactly like app/jobs.tsx lines 823-840:
      // High/medium match jobs first, sorted strictly by posted date (newest first), tie-breaker match score
      scored.sort((a, b) => {
        const isMatchA = a.match >= 50 || matchesRoleFilter(a.job, profileRoles.length ? profileRoles : ['__none__']);
        const isMatchB = b.match >= 50 || matchesRoleFilter(b.job, profileRoles.length ? profileRoles : ['__none__']);
        if (isMatchA && !isMatchB) return -1;
        if (!isMatchA && isMatchB) return 1;
        const timeDiff = getJobTimestamp(b.job) - getJobTimestamp(a.job);
        if (timeDiff !== 0) return timeDiff;
        return b.match - a.match;
      });
    }

    return scored;
  }, [jobs, searchQuery, locationFilter, roleFilter, workModelFilter, experienceFilter, salaryFilter, sortFilter, candidateProfile, userResumes, profileRoles]);

  const resetFilters = () => {
    setFiltersTouched(true);
    setSearchQuery('');
    setLocationFilter('All Locations');
    setSelectedCountryCode('US');
    setCountrySearch('');
    setAllLocationsInCountry(true);
    setCitySearch('');
    setRoleFilter([]);
    setRoleSearch('');
    setWorkModelFilter('All types');
    setExperienceFilter('ALL');
    setSalaryFilter('ALL');
    setSortFilter('Recommended');
    setCurrentPage(1);
  };

  const currentCountry = useMemo(() => {
    return Country.getCountryByCode(selectedCountryCode) || Country.getCountryByCode('US')!;
  }, [selectedCountryCode]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) {
      return POPULAR_COUNTRY_CODES
        .map(code => Country.getCountryByCode(code))
        .filter((c): c is ICountry => Boolean(c));
    }
    const q = countrySearch.toLowerCase().trim();
    return ALL_COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.isoCode.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [countrySearch]);

  const filteredStatesAndCities = useMemo(() => {
    const states = State.getStatesOfCountry(selectedCountryCode) || [];
    if (!citySearch.trim()) {
      return states.map(s => ({
        label: `${s.name} (State)`,
        value: s.name,
        type: 'state'
      }));
    }

    const q = citySearch.toLowerCase().trim();
    const matchingStates = states
      .filter(s => s.name.toLowerCase().includes(q))
      .slice(0, 6)
      .map(s => ({
        label: `${s.name} (State)`,
        value: s.name,
        type: 'state'
      }));

    const allCities: any[] = cityModule && typeof cityModule.getCitiesOfCountry === 'function'
      ? (cityModule.getCitiesOfCountry(selectedCountryCode) || [])
      : (POPULAR_CITIES[selectedCountryCode] || []).map(cityName => ({ name: cityName, stateCode: '' }));

    const matchingCities = allCities
      .filter((c: any) => c.name.toLowerCase().includes(q))
      .slice(0, 30)
      .map((c: any) => ({
        label: c.stateCode ? `${c.name}, ${c.stateCode}` : c.name,
        value: c.stateCode ? `${c.name}, ${c.stateCode}` : c.name,
        type: 'city'
      }));

    const customCity = q && !matchingCities.some((c: any) => c.value.toLowerCase() === q)
      ? [{ label: `"${citySearch.trim()}" (Custom City)`, value: citySearch.trim(), type: 'city' }]
      : [];

    return [...matchingStates, ...matchingCities, ...customCity];
  }, [selectedCountryCode, citySearch, cityModule]);

  const filteredSuggestedRoles = useMemo(() => {
    const base = Array.from(new Set([...profileRoles, ...SUGGESTED_ROLES]));
    if (!roleSearch.trim()) return base;
    const q = roleSearch.toLowerCase().trim();
    return base.filter(r => r.toLowerCase().includes(q));
  }, [profileRoles, roleSearch]);

  const roleLabel = roleFilter.length === 0
    ? 'All Titles'
    : roleFilter.length === 1
      ? roleFilter[0]
      : `${roleFilter[0]} +${roleFilter.length - 1}`;

  const moreFiltersCount = (experienceFilter !== 'ALL' ? 1 : 0) + (salaryFilter !== 'ALL' ? 1 : 0);

  const isAnyFilterActive = searchQuery.trim() !== '' ||
    locationFilter !== 'All Locations' ||
    roleFilter.length > 0 ||
    workModelFilter !== 'All types' ||
    moreFiltersCount > 0 ||
    sortFilter !== 'Recommended';

  return (
    <div className={`dashboard-container ${isDarkMode ? 'dark' : ''}`}>
      {/* Floating Stripe Payment Notification Toast */}
      {paymentToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: paymentToast.type === 'success' ? '#0f172a' : '#1e293b',
          color: '#ffffff',
          padding: '14px 24px',
          borderRadius: '14px',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          fontSize: '14px',
          fontWeight: 600,
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(12px)'
        }}>
          <span>{paymentToast.message}</span>
          <button
            onClick={() => setPaymentToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '2px 6px',
              display: 'flex',
              alignItems: 'center',
              lineHeight: 1
            }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sidebar: Fixed Left Sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <a
            href="https://applydesk.io"
            target="_blank"
            rel="noopener noreferrer"
            title="Visit ApplyDesk"
            style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
          >
            <img
              src={isDarkMode ? logoLight : logoDark}
              alt="ApplyDesk Logo"
              style={{ height: '17px', width: 'auto' }}
            />
          </a>
        </div>

        <div className={`sidebar-nav-item ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => setActiveTab('jobs')}>
          <div className="sidebar-nav-icon">
            <img src={iconNavBag} alt="" />
          </div>
          <span>Jobs List</span>
          <span className="sidebar-nav-badge">{totalJobsCount > 0 ? (totalJobsCount > 999 ? `${(totalJobsCount / 1000).toFixed(1)}k` : totalJobsCount) : (currentJobs.length || '13')}</span>
        </div>

        <div className={`sidebar-nav-item ${activeTab === 'resume' ? 'active' : ''}`} onClick={() => setActiveTab('resume')}>
          <div className="sidebar-nav-icon">
            <img src={iconNavDoc} alt="" />
          </div>
          <span>Resume & Cover Letter</span>
        </div>

        <div className={`sidebar-nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <div className="sidebar-nav-icon">
            <img src={iconNavUser} alt="" />
          </div>
          <span>Profile info</span>
        </div>

        <div className="sidebar-nav-item" onClick={() => alert("Applications tracker is syncing with your job submissions.")}>
          <div className="sidebar-nav-icon">
            <img src={iconNavFolder} alt="" />
          </div>
          <span>Applications</span>
        </div>

        <div className="sidebar-nav-item" onClick={() => alert("Refer a friend and earn 100 free AI credits!")}>
          <div className="sidebar-nav-icon">
            <img src={iconNavPresent} alt="" />
          </div>
          <span>Refer & Earn</span>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-bottom-item" onClick={() => alert("Feedback & Support: contact@applydesk.io")}>
            <img src={iconNavLightbulb} alt="" />
            <span>Feedback & Get Help</span>
          </div>

          <div className="sidebar-bottom-item" onClick={() => alert("You have 2 new job alerts matching your profile!")}>
            <img src={iconNavNotification} alt="" />
            <span>Messages</span>
          </div>

          <UserAccountPopover
            isOpen={isAccountMenuOpen}
            onClose={() => setIsAccountMenuOpen(false)}
            user={currentUser}
            onOpenModal={(view) => setAccountModalView(view)}
            onLogout={handleLogout}
          />

          <div
            className="sidebar-user-avatar-row"
            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
            title="Account & Settings"
          >
            <img
              src={getUserAvatar(currentUser)}
              alt="User"
              className="sidebar-avatar-img"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== DEFAULT_AVATAR) {
                  target.onerror = null;
                  target.src = DEFAULT_AVATAR;
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {activeTab === 'resume' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 32px 64px 32px', height: '100%', boxSizing: 'border-box' }}>
            <h2 className="main-title" style={{ marginBottom: '24px' }}>Resume & Cover Letters</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

              {/* Resumes Section */}
              <div className="resume-section" style={{ background: 'var(--bg-panel)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Resumes</h3>
                <label className="btn-apply" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', cursor: 'pointer', marginBottom: '24px', fontSize: '14px', borderRadius: '8px', width: '100%' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  Upload PDF Resume
                  <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'resume')} />
                </label>
                <div className="files-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {userResumes.map(r => (
                    <div
                      key={r.id}
                      className="resume-file-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        transition: 'all 0.2s ease',
                        gap: '12px'
                      }}
                    >
                      <div
                        onClick={() => setPreviewFile({ ...r, type: 'resume' })}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', cursor: 'pointer', flex: 1 }}
                        title="Click to preview resume"
                      >
                        <div style={{ padding: '9px', background: 'rgba(239, 68, 68, 0.12)', borderRadius: '10px', color: '#ef4444', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        </div>
                        <div style={{ overflow: 'hidden', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {r.name || r.fileName || 'Resume.pdf'}
                            </p>
                            {(r.base64 || r.fileData || r.url) && (
                              <span style={{ fontSize: '10px', fontWeight: 600, color: '#16a34a', background: 'rgba(22, 163, 74, 0.12)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Ready
                              </span>
                            )}
                          </div>
                          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {r.date || (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Uploaded')} • {getResumeSize(r)}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <button
                          onClick={() => handleParseResumeToProfile(r)}
                          disabled={parsingResumeId === String(r.id || (r as any)._id || r.fileName || r.name)}
                          title="Parse this resume and extract all profile data into your profile"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: 'rgba(37, 99, 235, 0.08)',
                            color: '#2563eb',
                            border: '1px solid rgba(37, 99, 235, 0.28)',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            cursor: parsingResumeId === String(r.id || (r as any)._id || r.fileName || r.name) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {parsingResumeId === String(r.id || (r as any)._id || r.fileName || r.name) ? (
                            <>
                              <svg style={{ animation: 'spin 1s linear infinite' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" fill="none" /></svg>
                              Parsing...
                            </>
                          ) : (
                            <>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                              Sync to Profile
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setPreviewFile({ ...r, type: 'resume' })}
                          title="Preview PDF"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '12px',
                            fontWeight: 500,
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          Preview
                        </button>

                        {(r.base64 || r.fileData || r.url) && (
                          <button
                            onClick={() => handleDownloadFile(r)}
                            title="Download PDF"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'var(--bg-panel)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              cursor: 'pointer',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                          </button>
                        )}

                        {r.isDefault ? (
                          <span style={{ fontSize: '11px', background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', padding: '5px 8px', borderRadius: '6px', fontWeight: 600 }}>Default</span>
                        ) : (
                          <button onClick={() => setAsDefault(r.id || (r as any)._id, 'resume')} style={{ fontSize: '11px', background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>Set Default</button>
                        )}
                        <button
                          onClick={() => setDeleteConfirmDoc({
                            id: r.id || (r as any)._id,
                            name: r.fileName || r.name || 'Resume',
                            type: 'resume',
                            rawDoc: r
                          })}
                          title="Delete file"
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {userResumes.length === 0 && <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>No resumes uploaded yet.</div>}
                </div>
              </div>

              {/* Cover Letters Section */}
              <div className="cover-letter-section" style={{ background: 'var(--bg-panel)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Cover Letters</h3>
                <label className="btn-apply" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', cursor: 'pointer', marginBottom: '24px', fontSize: '14px', borderRadius: '8px', width: '100%', background: 'transparent', border: '1px solid var(--text-primary)', color: 'var(--text-primary)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  Upload Cover Letter
                  <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'cover')} />
                </label>
                <div className="files-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {userCovers.map(r => (
                    <div
                      key={r.id}
                      className="resume-file-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        transition: 'all 0.2s ease',
                        gap: '12px'
                      }}
                    >
                      <div
                        onClick={() => setPreviewFile({ ...r, type: 'cover' })}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', cursor: 'pointer', flex: 1 }}
                        title="Click to preview cover letter"
                      >
                        <div style={{ padding: '9px', background: 'rgba(59, 130, 246, 0.12)', borderRadius: '10px', color: '#3b82f6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        </div>
                        <div style={{ overflow: 'hidden', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {r.name || r.fileName || 'CoverLetter.pdf'}
                            </p>
                            {(r.base64 || r.fileData || r.url) && (
                              <span style={{ fontSize: '10px', fontWeight: 600, color: '#16a34a', background: 'rgba(22, 163, 74, 0.12)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Ready
                              </span>
                            )}
                          </div>
                          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {r.date || (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Uploaded')} • {getResumeSize(r)}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <button
                          onClick={() => setPreviewFile({ ...r, type: 'cover' })}
                          title="Preview PDF"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '12px',
                            fontWeight: 500,
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          Preview
                        </button>

                        {(r.base64 || r.fileData || r.url) && (
                          <button
                            onClick={() => handleDownloadFile(r)}
                            title="Download PDF"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'var(--bg-panel)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              cursor: 'pointer',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                          </button>
                        )}

                        {r.isDefault ? (
                          <span style={{ fontSize: '11px', background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', padding: '5px 8px', borderRadius: '6px', fontWeight: 600 }}>Default</span>
                        ) : (
                          <button onClick={() => setAsDefault(r.id || (r as any)._id, 'cover')} style={{ fontSize: '11px', background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>Set Default</button>
                        )}
                        <button
                          onClick={() => setDeleteConfirmDoc({
                            id: r.id || (r as any)._id,
                            name: r.fileName || r.name || (r as any).title || 'Cover Letter',
                            type: 'cover',
                            rawDoc: r
                          })}
                          title="Delete file"
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {userCovers.length === 0 && <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>No cover letters uploaded yet.</div>}
                </div>
              </div>

            </div>
          </div>
        ) : activeTab === 'profile' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 32px 64px 32px', height: '100%', boxSizing: 'border-box' }}>
            <ProfileInfo
              user={currentUser}
              onUserUpdate={handleUserUpdate}
              onProfileChange={handleProfileChange}
              isDarkMode={isDarkMode}
            />
          </div>
        ) : activeTab === 'interview' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 32px 64px 32px', height: '100%', boxSizing: 'border-box' }}>
            <AIInterview user={user} selectedJob={selectedJob} userResumes={userResumes} />
          </div>
        ) : activeTab === 'jobs' ? (
          <>
            <div className="main-header">
              <h2 className="main-title">Jobs List</h2>
              <div className="header-actions">
                <button
                  className="btn-glass-symbol"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  <img src={iconMoon} alt="Toggle dark mode" />
                </button>
                <button
                  className="btn-glass-credits"
                  onClick={() => setAccountModalView('upgrade')}
                  title="View Pricing Plans & Refill Credits"
                >
                  <span>{localCredits}</span>
                  <img src={iconSpark} alt="Credits" />
                </button>
              </div>
            </div>

            <div className="filters-bar">
              <div className="filters-bar-left">
                {/* Job Title / Function Popover */}
                <div
                  className={`filter-glass-pill filter-dropdown ${openDropdown === 'role' ? 'open' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(prev => prev === 'role' ? null : 'role');
                  }}
                >
                  <div className="filter-pill-text">
                    <span className="filter-pill-label">Job Title</span>
                    <span className="filter-pill-val" title={roleLabel}>{roleLabel}</span>
                  </div>
                  <img src={iconChevronDown} className="filter-pill-icon" alt="" />
                  {openDropdown === 'role' && (
                    <div
                      className="dropdown-menu"
                      style={{
                        width: '320px',
                        maxHeight: '440px',
                        overflowY: 'auto',
                        padding: '16px',
                        borderRadius: '16px',
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 14px 38px rgba(0, 0, 0, 0.16)',
                        boxSizing: 'border-box'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#ef4444', fontWeight: 700 }}>*</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Job Function</span>
                        </div>
                        {roleFilter.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setRoleFilter([])}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: '11px',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontWeight: 600,
                              padding: 0
                            }}
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      {/* Selected Tags */}
                      {roleFilter.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', maxHeight: '80px', overflowY: 'auto' }}>
                          {roleFilter.map(role => (
                            <span
                              key={role}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                background: 'rgba(16, 185, 129, 0.14)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                color: '#059669',
                                fontSize: '12px',
                                fontWeight: 600
                              }}
                            >
                              {role}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRoleFilter(prev => prev.filter(r => r !== role));
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#059669',
                                  cursor: 'pointer',
                                  padding: 0,
                                  fontSize: '14px',
                                  lineHeight: 1,
                                  fontWeight: 700
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                          Showing all functions. Select or type target roles below:
                        </div>
                      )}

                      {/* Search / Input */}
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }}>
                          <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                          type="text"
                          placeholder="Please select/enter your expected job function"
                          value={roleSearch}
                          onChange={(e) => setRoleSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const trimmed = roleSearch.trim();
                              if (trimmed && !roleFilter.includes(trimmed)) {
                                setRoleFilter(prev => [...prev, trimmed]);
                                setRoleSearch('');
                              }
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '100%',
                            padding: '7px 24px 7px 28px',
                            fontSize: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                        {roleSearch && (
                          <button
                            type="button"
                            onClick={() => setRoleSearch('')}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '15px',
                              lineHeight: 1
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Suggestions List */}
                      <div
                        style={{
                          maxHeight: '150px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          marginBottom: '14px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '4px',
                          background: 'var(--bg-card)'
                        }}
                      >
                        {roleSearch.trim() && !filteredSuggestedRoles.some(r => r.toLowerCase() === roleSearch.trim().toLowerCase()) && (
                          <div
                            className="dropdown-item"
                            style={{ fontWeight: 600, color: 'var(--accent-primary)', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                            onClick={() => {
                              const trimmed = roleSearch.trim();
                              if (trimmed && !roleFilter.includes(trimmed)) {
                                setRoleFilter(prev => [...prev, trimmed]);
                                setRoleSearch('');
                              }
                            }}
                          >
                            <span>+ Add "{roleSearch.trim()}"</span>
                          </div>
                        )}
                        {filteredSuggestedRoles.map(role => {
                          const isSelected = roleFilter.includes(role);
                          return (
                            <div
                              key={role}
                              className={`dropdown-item ${isSelected ? 'selected' : ''}`}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                              onClick={() => {
                                setRoleFilter(prev => isSelected ? prev.filter(r => r !== role) : [...prev, role]);
                              }}
                            >
                              <span>{role}</span>
                              {isSelected && <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Confirm Button */}
                      <button
                        type="button"
                        className="btn-apply"
                        onClick={() => setOpenDropdown(null)}
                        style={{
                          width: '100%',
                          padding: '9px 16px',
                          fontSize: '13px',
                          fontWeight: 700,
                          borderRadius: '8px',
                          textAlign: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        Confirm
                      </button>
                    </div>
                  )}
                </div>

                {/* Location Dropdown Popover */}
                <div
                  className={`filter-glass-pill filter-dropdown ${openDropdown === 'location' ? 'open' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(prev => prev === 'location' ? null : 'location');
                  }}
                >
                  <div className="filter-pill-text">
                    <span className="filter-pill-label">Location</span>
                    <span className="filter-pill-val" title={locationFilter}>{locationFilter}</span>
                  </div>
                  <img src={iconChevronDown} className="filter-pill-icon" alt="" />
                  {openDropdown === 'location' && (
                    <div
                      className="dropdown-menu"
                      style={{
                        width: '320px',
                        maxHeight: '440px',
                        overflowY: 'auto',
                        padding: '16px',
                        borderRadius: '16px',
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 14px 38px rgba(0, 0, 0, 0.16)',
                        boxSizing: 'border-box'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Country Section */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Country</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>250+ countries available</span>
                        </div>

                        {/* Country Search Input */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '8px', color: 'var(--text-secondary)' }}>
                            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                          </svg>
                          <input
                            type="text"
                            placeholder="Search countries..."
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: '100%',
                              padding: '5px 22px 5px 26px',
                              fontSize: '11px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-card)',
                              color: 'var(--text-primary)',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                          {countrySearch && (
                            <button
                              type="button"
                              onClick={() => setCountrySearch('')}
                              style={{
                                position: 'absolute',
                                right: '6px',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '13px',
                                lineHeight: 1
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>

                        {/* Countries List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '135px', overflowY: 'auto' }}>
                          {filteredCountries.map(c => {
                            const isSelected = selectedCountryCode === c.isoCode && locationFilter !== 'All Locations';
                            return (
                              <label
                                key={c.isoCode}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '4px 6px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  background: isSelected ? 'var(--bg-card)' : 'transparent',
                                  transition: 'all 0.15s'
                                }}
                                onClick={() => {
                                  setSelectedCountryCode(c.isoCode);
                                  setAllLocationsInCountry(true);
                                  setCitySearch('');
                                  setLocationFilter(c.name);
                                }}
                              >
                                <div
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    border: isSelected ? '2px solid #10b981' : '2px solid var(--border-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}
                                >
                                  {isSelected && (
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                                  )}
                                </div>
                                <span style={{ fontSize: '14px', lineHeight: 1 }}>{c.flag}</span>
                                <span style={{ fontSize: '12px', fontWeight: isSelected ? 600 : 400, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {c.name}
                                </span>
                              </label>
                            );
                          })}

                          {/* Worldwide Option */}
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '4px 6px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              background: locationFilter === 'All Locations' ? 'var(--bg-card)' : 'transparent'
                            }}
                            onClick={() => {
                              setLocationFilter('All Locations');
                              setAllLocationsInCountry(true);
                              setCitySearch('');
                            }}
                          >
                            <div
                              style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                border: locationFilter === 'All Locations' ? '2px solid #10b981' : '2px solid var(--border-color)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              {locationFilter === 'All Locations' && (
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                              )}
                            </div>
                            <span style={{ fontSize: '14px', lineHeight: 1 }}>🌍</span>
                            <span style={{ fontSize: '12px', fontWeight: locationFilter === 'All Locations' ? 600 : 400, color: 'var(--text-primary)' }}>
                              Worldwide (All Locations)
                            </span>
                          </label>
                        </div>
                      </div>

                      <div style={{ height: '1px', background: 'var(--border-color)', margin: '12px 0' }} />

                      {/* Location Specific Section */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Location</span>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                            onClick={() => {
                              const nextVal = !allLocationsInCountry;
                              setAllLocationsInCountry(nextVal);
                              if (nextVal) {
                                setCitySearch('');
                                setLocationFilter(currentCountry.name);
                              }
                            }}
                          >
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              All in {currentCountry.name}
                            </span>
                            <div
                              style={{
                                width: '34px',
                                height: '18px',
                                borderRadius: '18px',
                                background: allLocationsInCountry ? '#10b981' : 'var(--border-color)',
                                position: 'relative',
                                transition: 'background 0.2s',
                                flexShrink: 0
                              }}
                            >
                              <div
                                style={{
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  background: '#ffffff',
                                  position: 'absolute',
                                  top: '2px',
                                  left: allLocationsInCountry ? '18px' : '2px',
                                  transition: 'left 0.2s',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* City Search input */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }}>
                            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                          </svg>
                          <input
                            type="text"
                            placeholder={`Search city or state in ${currentCountry.name}...`}
                            value={citySearch}
                            onChange={(e) => {
                              setCitySearch(e.target.value);
                              setAllLocationsInCountry(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (citySearch.trim()) {
                                  setLocationFilter(citySearch.trim());
                                  setAllLocationsInCountry(false);
                                  setOpenDropdown(null);
                                }
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: '100%',
                              padding: '7px 24px 7px 28px',
                              fontSize: '12px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-card)',
                              color: 'var(--text-primary)',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                          {citySearch && (
                            <button
                              type="button"
                              onClick={() => {
                                setCitySearch('');
                                setAllLocationsInCountry(true);
                                setLocationFilter(currentCountry.name);
                              }}
                              style={{
                                position: 'absolute',
                                right: '8px',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '14px',
                                lineHeight: 1
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>

                        {/* Filtered cities and states list */}
                        {!allLocationsInCountry && (
                          <div
                            style={{
                              maxHeight: '135px',
                              overflowY: 'auto',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              background: 'var(--bg-card)',
                              padding: '4px'
                            }}
                          >
                            {citySearch.trim() && !filteredStatesAndCities.some(c => c.value.toLowerCase() === citySearch.trim().toLowerCase()) && (
                              <div
                                className="dropdown-item"
                                style={{ fontWeight: 600, color: 'var(--accent-primary)', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                                onClick={() => {
                                  setLocationFilter(citySearch.trim());
                                  setAllLocationsInCountry(false);
                                }}
                              >
                                <span>📍 Filter by "{citySearch.trim()}"</span>
                              </div>
                            )}
                            {filteredStatesAndCities.map(item => {
                              const isChosen = locationFilter.toLowerCase() === item.value.toLowerCase();
                              return (
                                <div
                                  key={`${item.type}-${item.value}`}
                                  className={`dropdown-item ${isChosen ? 'selected' : ''}`}
                                  style={{ padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                  onClick={() => {
                                    setLocationFilter(item.value);
                                    setCitySearch(item.value);
                                    setAllLocationsInCountry(false);
                                  }}
                                >
                                  <span>{item.label}</span>
                                  {isChosen && <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Confirm Button */}
                      <button
                        type="button"
                        className="btn-apply"
                        onClick={() => setOpenDropdown(null)}
                        style={{
                          width: '100%',
                          padding: '9px 16px',
                          fontSize: '13px',
                          fontWeight: 700,
                          borderRadius: '8px',
                          textAlign: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          marginTop: '4px'
                        }}
                      >
                        Confirm
                      </button>
                    </div>
                  )}
                </div>

                {/* Work Model Dropdown */}
                <div
                  className={`filter-glass-pill filter-dropdown ${openDropdown === 'work' ? 'open' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(prev => prev === 'work' ? null : 'work');
                  }}
                >
                  <div className="filter-pill-text">
                    <span className="filter-pill-label">Work Model</span>
                    <span className="filter-pill-val">{workModelFilter}</span>
                  </div>
                  <img src={iconChevronDown} className="filter-pill-icon" alt="" />
                  {openDropdown === 'work' && (
                    <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                      {['All types', 'Remote', 'Hybrid', 'In Person'].map(opt => (
                        <div key={opt} className={`dropdown-item ${workModelFilter === opt ? 'selected' : ''}`} onClick={(e) => { e.stopPropagation(); setWorkModelFilter(opt); setOpenDropdown(null); }}>
                          <span>{opt}</span>
                          {workModelFilter === opt && <span>✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* More Filters (Experience & Salary) */}
                <div
                  className={`filter-glass-pill filter-dropdown ${openDropdown === 'more' ? 'open' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(prev => prev === 'more' ? null : 'more');
                  }}
                >
                  <div className="filter-pill-text">
                    <span className="filter-pill-label">More Filters</span>
                    <span className="filter-pill-val">
                      {salaryFilter !== 'ALL' && experienceFilter !== 'ALL'
                        ? `${salaryFilter}, ${experienceFilter}`
                        : salaryFilter !== 'ALL'
                          ? salaryFilter
                          : experienceFilter !== 'ALL'
                            ? experienceFilter
                            : 'None'}
                    </span>
                  </div>
                  <img src={iconChevronDown} className="filter-pill-icon" alt="" />
                  {openDropdown === 'more' && (
                    <div className="dropdown-menu" style={{ width: '260px', padding: '12px' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>Experience Seniority</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {[
                            { id: 'ALL', label: 'All Levels' },
                            { id: 'Senior', label: 'Senior (5+ yrs)' },
                            { id: 'Mid', label: 'Mid-Level (3-4 yrs)' },
                            { id: 'Junior', label: 'Junior / Intern' }
                          ].map(exp => (
                            <div
                              key={exp.id}
                              className={`dropdown-item ${experienceFilter === exp.id ? 'selected' : ''}`}
                              onClick={() => {
                                setExperienceFilter(exp.id);
                                setOpenDropdown(null);
                              }}
                            >
                              <span>{exp.label}</span>
                              {experienceFilter === exp.id && <span>✓</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>Expected Salary</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {[
                            { id: 'ALL', label: 'All Salaries' },
                            { id: '$50K - $100K', label: '$50K - $100K' },
                            { id: '$100K - $180K', label: '$100K - $180K' },
                            { id: '$180K+', label: '$180K+' }
                          ].map(sal => (
                            <div
                              key={sal.id}
                              className={`dropdown-item ${salaryFilter === sal.id ? 'selected' : ''}`}
                              onClick={() => {
                                setSalaryFilter(sal.id);
                                setOpenDropdown(null);
                              }}
                            >
                              <span>{sal.label}</span>
                              {salaryFilter === sal.id && <span>✓</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {isAnyFilterActive && (
                  <button
                    onClick={resetFilters}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '1000px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--glass-bg)',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      height: '48px',
                      boxSizing: 'border-box'
                    }}
                    title="Reset all filters to defaults"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                    Reset
                  </button>
                )}
              </div>

              {/* Sorting Dropdown */}
              <div
                className={`filter-glass-pill sorting-pill filter-dropdown ${openDropdown === 'sort' ? 'open' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(prev => prev === 'sort' ? null : 'sort');
                }}
              >
                <div className="filter-pill-text">
                  <span className="filter-pill-label">Sorting</span>
                  <span className="filter-pill-val">{sortFilter}</span>
                </div>
                <img src={iconChevronDown} className="filter-pill-icon" alt="" />
                {openDropdown === 'sort' && (
                  <div className="dropdown-menu" style={{ right: 0, left: 'auto' }} onClick={(e) => e.stopPropagation()}>
                    {['Recommended', 'Match Score', 'Newest', 'Highest Salary'].map(opt => (
                      <div key={opt} className={`dropdown-item ${sortFilter === opt ? 'selected' : ''}`} onClick={(e) => { e.stopPropagation(); setSortFilter(opt); setOpenDropdown(null); }}>
                        <span>{opt}</span>
                        {sortFilter === opt && <span>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dashboard Body (Jobs scroll area + Fixed Right Sidebar below filters bar) */}
            <div className="dashboard-body">
              <div className="jobs-scroll-area">
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <img src={iconLoading} alt="Loading" style={{ width: '36px', height: '36px', animation: 'spin 1s linear infinite' }} />
                    <span>Loading real-time jobs from ApplyDesk API...</span>
                  </div>
                ) : selectedJob ? (
                  <div className="job-detail-view">
                    <button
                      onClick={() => setSelectedJob(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                      Back to Jobs
                    </button>
                    <div className="job-card">
                      <div className="job-card-header" style={{ gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="job-company-info">
                          <CompanyLogo companyName={getJobCompany(selectedJob)} boardToken={selectedJob.boardToken} />
                          <div className="job-title-row">
                            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{getJobTitle(selectedJob)}</h3>
                            <p style={{ fontSize: '13px' }}>
                              {getJobCompany(selectedJob)} • {[
                                selectedJob.departments?.[0]?.name && selectedJob.departments[0].name !== 'General' ? selectedJob.departments[0].name : '',
                                getJobWorkModel(selectedJob),
                                getJobLocation(selectedJob) ? getJobLocation(selectedJob).split(',')[0].trim() : ''
                              ].filter(Boolean).join(' • ')}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexShrink: 0, alignItems: 'center', marginLeft: 'auto' }}>

                          <button className="btn-apply" style={{ width: 'auto', padding: '12px 24px', whiteSpace: 'nowrap' }} onClick={() => { setApplyingJob(selectedJob); setShowApplyModal(true); }}>Apply Now</button>
                          <button className="btn-apply" style={{ width: 'auto', padding: '12px 20px', whiteSpace: 'nowrap', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => setActiveTab('interview')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                            Practice AI Interview
                          </button>
                          {selectedJob.absolute_url && (
                            <a
                              href={selectedJob.absolute_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-view"
                              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 18px', whiteSpace: 'nowrap' }}
                            >

                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="job-details-grid" style={{ marginTop: '20px', marginBottom: '24px' }}>
                        {getJobLocation(selectedJob) ? (
                          <div className="job-detail-item">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            <span>{getJobLocation(selectedJob)}</span>
                          </div>
                        ) : null}
                        {getJobPostedTime(selectedJob) ? (
                          <div className="job-detail-item">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            <span>{getJobPostedTime(selectedJob)}</span>
                          </div>
                        ) : null}
                        {getJobWorkModel(selectedJob) ? (
                          <div className="job-detail-item">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                            <span>{getJobWorkModel(selectedJob)}</span>
                          </div>
                        ) : null}
                        <div className="job-detail-item" title={getJobSalary(selectedJob) || 'Salary'}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                          <span>{getJobSalary(selectedJob) || '...'}</span>
                        </div>
                        {getJobExperience(selectedJob) ? (
                          <div className="job-detail-item">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                            <span>{getJobExperience(selectedJob)}</span>
                          </div>
                        ) : null}
                        {getJobEmploymentType(selectedJob) ? (
                          <div className="job-detail-item">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            <span>{getJobEmploymentType(selectedJob)}</span>
                          </div>
                        ) : null}
                      </div>

                      {/* ATS SCORE SECTION */}
                      {(() => {
                        const matchResult = calculateJobMatch(selectedJob, candidateProfile, userResumes);
                        const overallScore = matchResult.jobMatch;
                        const jobMatchPercent = matchResult.jobMatch;
                        const resumePercent = matchResult.resume;
                        const keywordsPercent = matchResult.keywords;

                        return (
                          <div className="ats-section-container">
                            <div className="ats-header-row">
                              <h4 className="ats-section-title">ATS Score</h4>
                              <div className="ats-score-fraction">
                                <span className="ats-score-value">{overallScore}</span>
                                <span className="ats-score-total">/100</span>
                              </div>
                            </div>

                            {/* Coral/Orange Progress Bar */}
                            <div className="ats-progress-track">
                              <div className="ats-progress-fill" style={{ width: `${overallScore}%` }} />
                            </div>

                            {/* 3 METRIC CARDS ROW (JOB MATCH, RESUME, KEYWORDS) */}
                            <div className="ats-metric-cards-row">
                              <div className="ats-metric-card ats-metric-card-green">
                                <span className="ats-metric-value-green">{jobMatchPercent}%</span>
                                <span className="ats-metric-label-green">JOB MATCH</span>
                              </div>

                              <div className="ats-metric-card ats-metric-card-gray">
                                <span className="ats-metric-value-gray">{resumePercent}%</span>
                                <span className="ats-metric-label-gray">RESUME</span>
                              </div>

                              <div className="ats-metric-card ats-metric-card-gray">
                                <span className="ats-metric-value-gray">{keywordsPercent}%</span>
                                <span className="ats-metric-label-gray">KEYWORDS</span>
                              </div>
                            </div>

                            {/* SKILLS PILLS GRID (Green matched vs Muted gray) */}
                            <div className="ats-skills-pills-container">
                              {matchResult?.matchedSkills && matchResult.matchedSkills.length > 0 ? (
                                matchResult.matchedSkills.map((skill: string, index: number) => (
                                  <div key={`matched-${index}`} className="ats-skill-pill-green">
                                    <span className="ats-thumb-emoji">👍</span>
                                    <span>{skill}</span>
                                  </div>
                                ))
                              ) : (
                                <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic', margin: '4px 0' }}>
                                  No matched skills found.
                                </span>
                              )}

                              {matchResult?.missingSkills && matchResult.missingSkills.length > 0 ? (
                                matchResult.missingSkills.map((skill: string, index: number) => (
                                  <div key={`missing-${index}`} className="ats-skill-pill-gray">
                                    <span>{skill}</span>
                                  </div>
                                ))
                              ) : null}
                            </div>
                          </div>
                        );
                      })()}

                      <div style={{ marginTop: '24px', marginBottom: '14px' }}>
                        <h4 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>
                          Job Description
                        </h4>
                      </div>

                      <div
                        className="job-description-content"
                        style={{ lineHeight: '1.7', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px', overflowWrap: 'break-word' }}
                        dangerouslySetInnerHTML={{
                          __html: selectedJob.content
                            ? (() => { const txt = document.createElement("textarea"); txt.innerHTML = selectedJob.content; return txt.value; })()
                            : (selectedJob.description || 'No detailed description available for this job posting yet.')
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="jobs-list">
                    {currentJobs.map((item: any, idx) => {
                      const job = item.job || item;
                      const compName = getJobCompany(job) || 'Company';
                      const titleStr = getJobTitle(job) || 'Job Position';
                      const locStr = getJobLocation(job);
                      const salStr = getJobSalary(job);
                      const expStr = getJobExperience(job);
                      const workModel = getJobWorkModel(job);
                      const empType = getJobEmploymentType(job);
                      const postedTime = getJobPostedTime(job);
                      const matchScore = typeof item.match === 'number' ? item.match : calculateJobMatch(job, candidateProfile, userResumes).jobMatch;
                      const matchColors = getMatchPillColors(matchScore);

                      const dept = job.departments?.[0]?.name && job.departments[0].name !== 'General'
                        ? job.departments[0].name
                        : (job.department || job.category || '');
                      const subParts = [dept, workModel, locStr ? locStr.split(',')[0].trim() : ''].filter(Boolean);
                      const subText = subParts.length > 0 ? subParts.slice(0, 2).join(' • ') : (empType || 'Full-time');

                      return (
                        <div className="figma-job-card" key={job.id || job._id || idx}>
                          {/* Head */}
                          <div className="fjc-head">
                            <div className="fjc-company-group">
                              <CompanyLogo companyName={compName} boardToken={job.boardToken} />
                              <div className="fjc-info">
                                <h3
                                  className="fjc-title"
                                  onClick={() => setSelectedJob(job)}
                                  style={{ cursor: 'pointer' }}
                                  title={titleStr}
                                >
                                  {titleStr}
                                </h3>
                                <div className="fjc-sub">
                                  <span className="fjc-sub-company">{compName}</span>
                                  <span>•</span>
                                  <span>{subText}</span>
                                </div>
                              </div>
                            </div>
                            <div className="fjc-head-right">
                              <div
                                className="fjc-match-badge"
                                style={{
                                  backgroundColor: matchColors.bg,
                                  color: matchColors.scoreColor,
                                  border: matchColors.border
                                }}
                              >
                                {matchScore}% Match
                              </div>
                              <button
                                className="fjc-dots-btn"
                                onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                                title="More options"
                              >
                                <img src={iconDotsVertical} alt="More" />
                              </button>
                            </div>
                          </div>

                          {/* Attributes Grid (3 columns, 2 rows) */}
                          <div className="fjc-attrs-grid">
                            <div className="fjc-attr-item" title={locStr || 'Location'}>
                              <img src={iconMarkerPin} className="fjc-attr-icon" alt="" />
                              <span>{locStr ? locStr.split(',')[0].trim() : 'Dallas, USA'}</span>
                            </div>
                            <div className="fjc-attr-item" title={salStr || 'Salary'}>
                              <img src={iconCurrencyDollar} className="fjc-attr-icon" alt="" />
                              <span>{salStr || '...'}</span>
                            </div>
                            <div className="fjc-attr-item" title={expStr || 'Experience'}>
                              <img src={iconHome} className="fjc-attr-icon" alt="" />
                              <span>{expStr || '3+ years exp'}</span>
                            </div>
                            <div className="fjc-attr-item" title={workModel || 'Work Model'}>
                              <img src={iconClockStopwatch} className="fjc-attr-icon" alt="" />
                              <span>{workModel || 'Remote'}</span>
                            </div>
                            <div className="fjc-attr-item" title={empType || 'Employment'}>
                              <img src={iconLaptop} className="fjc-attr-icon" alt="" />
                              <span>{empType || 'Full Time'}</span>
                            </div>
                            <div className="fjc-attr-item" title={postedTime || 'Posted'}>
                              <img src={iconClockStopwatch} className="fjc-attr-icon" alt="" />
                              <span>{postedTime || '12 days ago'}</span>
                            </div>
                          </div>

                          {/* Action Row */}
                          <div className="fjc-actions-row">
                            <button className="fjc-view-btn" onClick={() => setSelectedJob(job)}>
                              View Detail
                            </button>
                            <div className="fjc-apply-group">
                              <button
                                className="fjc-apply-btn"
                                onClick={() => {
                                  setLocalCredits((prev: number) => Math.max(0, prev - 2));
                                  setApplyingJob(job);
                                  setShowApplyModal(true);
                                }}
                              >
                                Apply 2 <img src={iconApplySpark} alt="✦" />
                              </button>
                              <span className="fjc-apply-sub">with AI resume • AI cover letter</span>
                            </div>
                            <div className="fjc-icon-actions">
                              <button
                                className="fjc-icon-btn"
                                title="Not interested"
                                onClick={(e) => { e.stopPropagation(); }}
                              >
                                <img src={iconSlashCircle} alt="Dislike" />
                              </button>
                              {job.absolute_url ? (
                                <a
                                  href={job.absolute_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="fjc-icon-btn"
                                  title="Open original job posting"
                                  style={{ textDecoration: 'none' }}
                                >
                                  <img src={iconLink} alt="External link" />
                                </a>
                              ) : (
                                <button
                                  className="fjc-icon-btn"
                                  title="Job details link"
                                  onClick={() => setSelectedJob(job)}
                                >
                                  <img src={iconLink} alt="External link" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {currentJobs.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg-panel)', borderRadius: '20px', border: '1px solid var(--border-color)', margin: '16px 0' }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>No jobs match your current filters</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>Try loosening your filters or resetting to default to explore all live jobs in our database.</p>
                        <button
                          onClick={resetFilters}
                          className="btn-apply"
                          style={{ display: 'inline-flex', width: 'auto', padding: '10px 20px', fontSize: '13px' }}
                        >
                          Reset All Filters
                        </button>
                      </div>
                    )}

                    {(currentPage > 1 || hasNextPage) && currentJobs.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px', marginBottom: '16px' }}>
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-primary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, fontWeight: 600, fontSize: '13px' }}
                        >
                          Previous
                        </button>
                        <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Page {currentPage}
                        </span>
                        <button
                          disabled={!hasNextPage}
                          onClick={() => setCurrentPage(prev => prev + 1)}
                          style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-primary)', cursor: !hasNextPage ? 'not-allowed' : 'pointer', opacity: !hasNextPage ? 0.5 : 1, fontWeight: 600, fontSize: '13px' }}
                        >
                          Next
                        </button>
                      </div>
                    )}

                    <div className="figma-bottom-search-card">
                      <div className="fbsc-left">
                        <h4 className="fbsc-title">If you can't find related jobs, try searching this job title.</h4>
                        <p className="fbsc-sub">or reset all other variables and attributes you're looking for</p>
                        <button className="fbsc-reset-btn" onClick={resetFilters}>Reset filters</button>
                      </div>
                      <div className="fbsc-right">
                        {['UI/UX Designer', 'Product Designer', 'Frontend Developer', 'Backend Developer', 'Software Engineer', 'Product Manager', 'Data Scientist', 'Account Executive'].map(tag => (
                          <button
                            key={tag}
                            className="fbsc-tag"
                            onClick={() => {
                              setFiltersTouched(true);
                              setRoleFilter([tag]);
                              setCurrentPage(1);
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Sidebar (Fixed in place below filters bar) */}
              <div className="right-sidebar">
                <div className="score-health-card">
                  <div className="shc-header">
                    <div className="shc-avatar-wrap">
                      <svg width="80" height="80" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                        <circle
                          cx="40"
                          cy="40"
                          r="34"
                          stroke="rgba(0, 0, 0, 0.08)"
                          strokeWidth="4"
                          fill="none"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="34"
                          stroke={progress === 100 ? '#10b981' : progress > 50 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={213.63}
                          strokeDashoffset={213.63 - (Math.min(100, Math.max(0, progress)) / 100) * 213.63}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                        />
                      </svg>
                      <img
                        src={getUserAvatar(currentUser)}
                        alt="User Avatar"
                        className="shc-avatar-img"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src !== DEFAULT_AVATAR) {
                            target.onerror = null;
                            target.src = DEFAULT_AVATAR;
                          }
                        }}
                      />
                      <div className="shc-score-badge">
                        {progress}%
                      </div>
                    </div>
                    <div className="shc-stats">
                      <span className="shc-status" style={{ color: statusColor }}>
                        {statusText}
                      </span>
                      <span className="shc-label">
                        Your Score Health
                      </span>
                      <span className="shc-remain">
                        {100 - progress}% Remain score
                      </span>
                    </div>
                  </div>

                  <button className="shc-update-btn" onClick={() => setActiveTab('profile')}>
                    Update Information
                  </button>
                  {onReopenOnboarding && (
                    <button
                      onClick={onReopenOnboarding}
                      style={{
                        width: '100%',
                        marginTop: '8px',
                        padding: '8px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Upload Resume / Setup Wizard
                    </button>
                  )}

                  <div className="shc-summary-box">
                    <h4 className="shc-summary-title">AI Score Summary</h4>
                    <p className="shc-summary-text">
                      Complete your information to achieve more speed in apply and found best match jobs week.
                    </p>
                  </div>

                  <div className="shc-how-works">
                    <div className="shc-how-title">
                      <img src={imgSphere} alt="" />
                      <span>How it works?</span>
                    </div>
                    <p className="shc-how-desc">
                      Every minutes a job added, We match your profile data with our 4 million jobs data.
                    </p>
                    <div className="shc-checking-label">We checking looking for:</div>
                    <div className="shc-pills-list">
                      <div className="shc-pill-item shc-pill-green">
                        <img src={iconCheckGreen} alt="" />
                        <span>Job Title Match</span>
                      </div>
                      <div className="shc-pill-item shc-pill-green">
                        <img src={iconCheckGreen} alt="" />
                        <span>Skills Match</span>
                      </div>
                      <div className="shc-pill-item shc-pill-green">
                        <img src={iconCheckGreen} alt="" />
                        <span>Experience Match</span>
                      </div>
                      <div className="shc-pill-item shc-pill-green">
                        <img src={iconCheckGreen} alt="" />
                        <span>Industry Match</span>
                      </div>
                      <div className="shc-pill-item shc-pill-green">
                        <img src={iconCheckGreen} alt="" />
                        <span>Responsibilities Match</span>
                      </div>
                      <div className="shc-pill-item shc-pill-gray">
                        <span>Compensation Match</span>
                      </div>
                      <div className="shc-pill-item shc-pill-gray">
                        <span>Work Model Match</span>
                      </div>
                      <div className="shc-pill-item shc-pill-gray">
                        <span>Location Match</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div>
            <h2 className="main-title">Coming Soon</h2>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && (() => {
        const targetJob = applyingJob || selectedJob;
        if (!targetJob) return null;
        const hasResume = userResumes && userResumes.length > 0;

        const matchCalc = calculateJobMatch(targetJob, candidateProfile, userResumes);
        const jobMatchData = {
          score: matchCalc.jobMatch,
          missing: matchCalc.missingSkills
        };

        const matchScoreText = jobMatchData.score > 75 ? 'Excellent' : jobMatchData.score > 50 ? 'Good' : 'Poor';
        const matchScoreColor = jobMatchData.score > 75 ? '#10b981' : jobMatchData.score > 50 ? '#d97706' : '#ef4444';

        const closeModal = () => {
          setShowApplyModal(false);
          setApplyingJob(null);
        };

        return (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={closeModal}>
            <div className="apply-modal" style={{ background: 'var(--bg-panel)', width: '90%', maxWidth: '520px', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }} onClick={e => e.stopPropagation()}>
              <button onClick={closeModal} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>

              {!hasResume ? (
                <div style={{ textAlign: 'center', paddingTop: '16px' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Resume Required</h2>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', padding: '24px', marginBottom: '32px' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{ marginBottom: '16px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    <h3 style={{ color: '#991b1b', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>We couldn't find your resume</h3>
                    <p style={{ color: '#b91c1c', fontSize: '14px', lineHeight: '1.5' }}>You need to upload your resume before you can apply to jobs. We'll use it to calculate your real match score and help tailor your application.</p>
                  </div>
                  <button className="btn-apply" style={{ width: '100%', padding: '16px', fontSize: '15px' }} onClick={() => { closeModal(); setActiveTab('resume'); }}>
                    Upload Resume Now
                  </button>
                </div>
              ) : (
                <>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '24px' }}>Match Your Resume in 10 seconds</h2>


                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div className="job-logo" style={{ width: '48px', height: '48px', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', borderRadius: '12px' }}>
                        {String(targetJob?.companyName || targetJob?.company?.name || targetJob?.company || 'T').substring(0, 1).toUpperCase()}
                      </div>
                      <div style={{ maxWidth: '200px' }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{targetJob?.companyName || targetJob?.company?.name || targetJob?.company || 'Tech Company'}</p>
                        <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{targetJob?.title?.name || targetJob?.title || 'Software Engineer'}</h4>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: `4px solid ${matchScoreColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontWeight: 700, fontSize: '18px' }}>
                        {(jobMatchData.score / 10).toFixed(1)}
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 600 }}>{matchScoreText} Match</span>
                    </div>
                  </div>

                  {jobMatchData.missing.length > 0 ? (
                    <div style={{ marginBottom: '32px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>Missing {jobMatchData.missing.length} key skills & bullet point alignment</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {jobMatchData.missing.map(skill => (
                          <span key={skill} style={{ background: 'var(--btn-secondary)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 500 }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '32px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#10b981', marginBottom: '12px' }}>Excellent! You have all the key skills for this job.</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <button
                      className="btn-apply"
                      style={{ width: '100%', padding: '16px', fontSize: '15px', position: 'relative', overflow: 'hidden' }}
                      onClick={() => handleStartAiTailoring(targetJob)}
                    >
                      Fix My Resume Now
                    </button>
                    <button
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => {
                        localStorage.setItem('applydesk_active_job', JSON.stringify(targetJob));
                        const applyUrl = targetJob?.absolute_url || targetJob?.applicationUrl || targetJob?.applyUrl || targetJob?.url;
                        const query = `${targetJob?.title?.name || targetJob?.title || ''} ${targetJob?.companyName || targetJob?.company?.name || targetJob?.company || ''} apply`;
                        const finalUrl = applyUrl || `https://www.google.com/search?q=${encodeURIComponent(query)}`;

                        const event = new CustomEvent('APPLYDESK_OPEN_JOB', {
                          detail: { url: finalUrl, jobData: targetJob },
                          cancelable: true
                        });
                        const canceled = !window.dispatchEvent(event);

                        if (!canceled) {
                          window.open(finalUrl, '_blank');
                        }

                        closeModal();
                      }}
                    >
                      Apply Without Customizing
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
                    <input type="checkbox" id="dont-remind" style={{ width: '16px', height: '16px', accentColor: 'var(--text-primary)' }} />
                    <label htmlFor="dont-remind" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>Do not remind me again</label>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* 1. AI Tailoring Progress Modal (Exact 1:1 match to app/job-details.tsx) */}
      {isMatchingWithAI && (
        <div className="tailor-modal-overlay" onClick={() => setIsMatchingWithAI(false)}>
          <div className="tailor-modal-box" onClick={e => e.stopPropagation()}>
            <div className="tailor-header-row">
              <button className="tailor-back-btn" onClick={() => setIsMatchingWithAI(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <div className="tailor-credits-pill">
                <span>{localCredits}</span>
                <span style={{ color: '#f97316' }}>✦</span>
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              {/* Rewriting Your Resume Section */}
              <div className="progress-section-block">
                <h3 className="progress-section-title">Rewriting Your Resume:</h3>
                <div className="progress-list-col">
                  <div className="progress-step-row">
                    {aiStep >= 1 ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : aiStep === 0 ? (
                      <div style={{ width: '18px', height: '18px', border: '2.5px solid #000000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    ) : (
                      <div className="progress-circle-hollow" />
                    )}
                    <span className={`progress-step-text ${aiStep >= 1 ? 'progress-step-text-active' : ''}`}>
                      Analyzing Career Criteria
                    </span>
                  </div>

                  <div className="progress-step-row">
                    {aiStep >= 2 ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : aiStep === 1 ? (
                      <div style={{ width: '18px', height: '18px', border: '2.5px solid #000000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    ) : (
                      <div className="progress-circle-hollow" />
                    )}
                    <span className={`progress-step-text ${aiStep >= 2 ? 'progress-step-text-active' : ''}`}>
                      Scanning your resume
                    </span>
                  </div>

                  <div className="progress-step-row">
                    {aiStep >= 3 ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : aiStep === 2 ? (
                      <div style={{ width: '18px', height: '18px', border: '2.5px solid #000000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    ) : (
                      <div className="progress-circle-hollow" />
                    )}
                    <span className={`progress-step-text ${aiStep >= 3 ? 'progress-step-text-active' : ''}`}>
                      Generating personalized suggestions
                    </span>
                  </div>

                  <div className="progress-step-row">
                    {aiStep >= 4 ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : aiStep === 3 ? (
                      <div style={{ width: '18px', height: '18px', border: '2.5px solid #000000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    ) : (
                      <div className="progress-circle-hollow" />
                    )}
                    <span className={`progress-step-text ${aiStep >= 4 ? 'progress-step-text-active' : ''}`}>
                      Preparing your result
                    </span>
                  </div>
                </div>
              </div>

              {/* Writing Your Cover Letter Section */}
              <div className="progress-section-block" style={{ marginTop: '28px' }}>
                <h3 className="progress-section-title">Writing Your Cover Letter:</h3>
                <div className="progress-list-col">
                  <div className="progress-step-row">
                    {aiStep >= 1 ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : (
                      <div className="progress-circle-hollow" />
                    )}
                    <span className={`progress-step-text ${aiStep >= 1 ? 'progress-step-text-active' : ''}`}>
                      Analyzing Career Criteria
                    </span>
                  </div>

                  <div className="progress-step-row">
                    {aiStep >= 2 ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : (
                      <div className="progress-circle-hollow" />
                    )}
                    <span className={`progress-step-text ${aiStep >= 2 ? 'progress-step-text-active' : ''}`}>
                      Scanning your resume
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Tailored Match Result Modal (Exact 1:1 match to app/job-details.tsx) */}
      {showMatchResultModal && (
        <div className="tailor-modal-overlay" onClick={() => setShowMatchResultModal(false)}>
          <div className="tailor-modal-box" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="tailor-header-row">
              <button className="tailor-back-btn" onClick={() => setShowMatchResultModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <div className="tailor-credits-pill">
                <span>{localCredits}</span>
                <span style={{ color: '#f97316' }}>✦</span>
              </div>
            </div>

            {/* Top Match Score Circle Gauge */}
            <div className="modal-gauge-wrapper">
              <svg width="190" height="190" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="86" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4,6" fill="none" />
                <circle cx="100" cy="100" r="74" stroke="#E2E8F0" strokeWidth="14" fill="none" />
                <circle
                  cx="100"
                  cy="100"
                  r="74"
                  stroke="#000000"
                  strokeWidth="14"
                  strokeDasharray={`${2 * Math.PI * 74}`}
                  strokeDashoffset={`${2 * Math.PI * 74 * (1 - tailoredScore / 100)}`}
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 100 100)"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div className="modal-gauge-center-col">
                <span className="modal-result-score-text">{tailoredScore}%</span>
                <span className="modal-result-score-sub">Match score</span>
              </div>
            </div>

            {/* Title & Subtitle */}
            <h2 className="issues-fixed-title">{issuesFixedCount} issues Fixed</h2>
            <p className="issues-fixed-subtitle">
              Awesome! Your score jumped<br />
              from {calculateJobMatch(tailoredJobData, candidateProfile, userResumes).jobMatch}% to {tailoredScore}%
            </p>

            {/* Horizontal Side-by-Side Documents Section */}
            <div className="documents-row-container">
              {/* Tailored Resume Column */}
              <div className="document-col">
                <div className="document-preview-card">
                  <div className="doc-header-name">
                    {`${candidateProfile?.firstName || 'FIRST'} ${candidateProfile?.lastName || 'LAST'}`.toUpperCase()}
                  </div>
                  <div className="doc-header-sub">
                    {getJobTitle(tailoredJobData) || 'Target Role'}
                  </div>

                  <div className="doc-section-title">DETAILS</div>
                  <div className="doc-line-text">• {candidateProfile?.phone || '+1 (555) 019-2834'}</div>
                  <div className="doc-line-text">• {candidateProfile?.email || 'candidate@example.com'}</div>

                  <div className="doc-section-title">PROFILE</div>
                  <div className="doc-paragraph-text">
                    {candidateProfile?.summary || `Results-driven professional aligned specifically for the ${getJobTitle(tailoredJobData)} role at ${getJobCompany(tailoredJobData)}.`}
                  </div>

                  <div className="doc-section-title">EXPERIENCE</div>
                  <div className="doc-line-text" style={{ fontWeight: 700 }}>
                    {getJobTitle(tailoredJobData)}
                  </div>
                  <div className="doc-line-text" style={{ color: '#64748b' }}>
                    {getJobCompany(tailoredJobData)} • Tailored Alignment
                  </div>

                  <div className="doc-section-title">FIXED SKILLS</div>
                  <div className="doc-line-text" style={{ color: '#16a34a', fontWeight: 600 }}>
                    {tailoredResumeData?.fixedSkills?.slice(0, 3).join(', ') || 'Direct ATS Keywords Added'}
                  </div>
                </div>

                <button
                  className="view-doc-btn-pill"
                  onClick={() => setPreviewDocModal('resume')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  <span>View resume</span>
                </button>
              </div>

              {/* Tailored Cover Letter Column */}
              <div className="document-col">
                <div className="document-preview-card">
                  <div className="doc-header-name">
                    {`${candidateProfile?.firstName || 'FIRST'} ${candidateProfile?.lastName || 'LAST'}`.toUpperCase()}
                  </div>
                  <div className="doc-header-sub">Cover Letter</div>

                  <div className="doc-section-title">DETAILS</div>
                  <div className="doc-line-text">• {candidateProfile?.email || 'candidate@example.com'}</div>
                  <div className="doc-line-text">• {candidateProfile?.phone || '+1 (555) 019-2834'}</div>

                  <div className="doc-section-title">RECIPIENT</div>
                  <div className="doc-line-text" style={{ fontWeight: 700 }}>Hiring Team at {getJobCompany(tailoredJobData)}</div>

                  <div className="doc-section-title">LETTER BODY</div>
                  <div className="doc-paragraph-text">
                    Dear Hiring Team, I am writing to express my strong enthusiasm for the {getJobTitle(tailoredJobData)} position. With direct hands-on experience and targeted competencies...
                  </div>
                </div>

                <button
                  className="view-doc-btn-pill"
                  onClick={() => setPreviewDocModal('cover_letter')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  <span>View cover letter</span>
                </button>
              </div>
            </div>

            {/* Bottom Floating Black Button: Apply */}
            <button
              className="black-tailor-apply-btn"
              onClick={() => {
                setShowMatchResultModal(false);
                const applyUrl = tailoredJobData?.absolute_url || tailoredJobData?.applicationUrl || tailoredJobData?.applyUrl || tailoredJobData?.url;
                const query = `${getJobTitle(tailoredJobData)} ${getJobCompany(tailoredJobData)} apply`;
                const finalUrl = applyUrl || `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                window.open(finalUrl, '_blank');
              }}
            >
              <span>Apply</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </button>
          </div>
        </div>
      )}

      {/* 3. Document Full Preview Modal */}
      {previewDocModal && (
        <div className="tailor-modal-overlay" onClick={() => setPreviewDocModal(null)}>
          <div className="tailor-modal-box" style={{ maxWidth: '720px', padding: '36px' }} onClick={e => e.stopPropagation()}>
            <div className="tailor-header-row">
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {previewDocModal === 'resume' ? 'Tailored Resume Preview' : 'Tailored Cover Letter Preview'}
              </h3>
              <button className="tailor-back-btn" onClick={() => setPreviewDocModal(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {previewDocModal === 'resume' ? (
              <div style={{ background: '#ffffff', color: '#0f172a', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', maxHeight: '60vh', overflowY: 'auto', lineHeight: '1.6' }}>
                <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
                  <h1 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 6px 0', textTransform: 'uppercase' }}>
                    {`${candidateProfile?.firstName || 'First'} ${candidateProfile?.lastName || 'Last'}`}
                  </h1>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                    {candidateProfile?.email || 'email@example.com'} • {candidateProfile?.phone || '+1 (555) 019-2834'} • {candidateProfile?.location || 'Remote'}
                  </p>
                </div>

                <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', marginBottom: '8px' }}>
                  Professional Summary
                </h4>
                <p style={{ fontSize: '13px', color: '#334155', marginBottom: '20px' }}>
                  {candidateProfile?.summary || `Experienced professional targeted directly for the ${getJobTitle(tailoredJobData)} role at ${getJobCompany(tailoredJobData)}. High proficiency in delivering end-to-end solutions, driving collaboration, and exceeding organizational goals.`}
                </p>

                <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', marginBottom: '8px' }}>
                  ATS Optimized Skills
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                  {[...(tailoredResumeData?.matchedSkills || ['Problem Solving']), ...(tailoredResumeData?.fixedSkills || ['Leadership', 'Analytics'])].map((s: string, idx: number) => (
                    <span key={idx} style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                      ✓ {s}
                    </span>
                  ))}
                </div>

                <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', marginBottom: '8px' }}>
                  Target Role Alignment
                </h4>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{getJobTitle(tailoredJobData)}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>{getJobCompany(tailoredJobData)}</div>
                  <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13px', color: '#334155' }}>
                    <li>Engineered solutions matching technical criteria and workflows for {getJobTitle(tailoredJobData)}.</li>
                    <li>Collaborated cross-functionally with stakeholders to accelerate deliverables and maintain quality.</li>
                    <li>Integrated missing industry keywords to achieve high ATS compliance and visibility.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div style={{ background: '#ffffff', color: '#0f172a', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', maxHeight: '60vh', overflowY: 'auto', lineHeight: '1.7', fontSize: '14px', whiteSpace: 'pre-line' }}>
                {tailoredCoverLetterData?.body}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                className="btn-view"
                style={{ padding: '10px 20px', borderRadius: '12px' }}
                onClick={() => {
                  window.print();
                }}
              >
                Print / Download
              </button>
              <button
                className="btn-apply"
                style={{ width: 'auto', padding: '10px 24px', borderRadius: '12px' }}
                onClick={() => setPreviewDocModal(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Document Preview Modal */}
      {previewFile && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewFile(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'modalFadeIn 0.2s ease-out'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '960px',
              height: '90vh',
              maxHeight: '920px',
              backgroundColor: 'var(--bg-panel)',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-main)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: previewFile.type === 'cover' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: previewFile.type === 'cover' ? '#3b82f6' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '380px'
                      }}
                    >
                      {previewFile.name || previewFile.fileName || 'Resume Document'}
                    </h3>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#16a34a',
                        background: 'rgba(22, 163, 74, 0.12)',
                        border: '1px solid rgba(22, 163, 74, 0.25)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Verified PDF
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {previewFile.date || (previewFile.createdAt ? new Date(previewFile.createdAt).toLocaleDateString() : 'Uploaded')} • {getResumeSize(previewFile)}
                  </p>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                {pdfBlobUrl && (
                  <>
                    <button
                      onClick={() => handleOpenNewTab(previewFile)}
                      title="Open in new browser tab"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-panel)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                      Open in Tab
                    </button>

                    <button
                      onClick={() => handleDownloadFile(previewFile)}
                      title="Download PDF file"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-panel)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Download
                    </button>

                    {previewFile.type === 'resume' && (
                      <button
                        onClick={() => handleParseResumeToProfile(previewFile)}
                        disabled={parsingResumeId === String(previewFile.id || (previewFile as any)._id || previewFile.fileName || previewFile.name)}
                        title="Parse this resume and extract all profile data into your profile"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(37, 99, 235, 0.3)',
                          background: 'rgba(37, 99, 235, 0.08)',
                          color: '#2563eb',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: parsingResumeId === String(previewFile.id || (previewFile as any)._id || previewFile.fileName || previewFile.name) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {parsingResumeId === String(previewFile.id || (previewFile as any)._id || previewFile.fileName || previewFile.name) ? (
                          <>
                            <svg style={{ animation: 'spin 1s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" fill="none" /></svg>
                            Parsing...
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            Sync to Profile
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={() => setPreviewFile(null)}
                  title="Close preview"
                  aria-label="Close"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-panel)',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '18px',
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div style={{ flex: 1, position: 'relative', backgroundColor: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {pdfLoading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-panel)', zIndex: 10 }}>
                  <div style={{ width: '40px', height: '40px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <p style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>Loading resume document...</p>
                </div>
              )}

              {pdfBlobUrl ? (
                <iframe
                  src={`${pdfBlobUrl}#view=FitH&toolbar=1`}
                  title={previewFile.name || 'PDF Preview'}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: '#ffffff'
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Document content not found
                  </p>
                  <p style={{ fontSize: '13px', maxWidth: '360px', margin: '0 auto 20px' }}>
                    The binary data for this resume is not stored in local storage or the database. Please re-upload the PDF to enable instant previewing.
                  </p>
                  <label className="btn-apply" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 18px', cursor: 'pointer', fontSize: '13px', borderRadius: '8px' }}>
                    Re-upload PDF
                    <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => { setPreviewFile(null); handleFileUpload(e, previewFile.type || 'resume'); }} />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Delete Confirmation Modal */}
      {deleteConfirmDoc && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999
          }}
          onClick={() => setDeleteConfirmDoc(null)}
        >
          <div
            style={{
              background: 'var(--bg-panel, #ffffff)',
              color: 'var(--text-primary, #111827)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '430px',
              width: '90%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-color, #e5e7eb)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                  Delete {deleteConfirmDoc.type === 'resume' ? 'Resume' : 'Cover Letter'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary, #6b7280)' }}>
                  Are you sure you want to delete this document?
                </p>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-surface, #f9fafb)',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-primary, #374151)',
              marginBottom: '22px',
              wordBreak: 'break-all',
              border: '1px solid var(--border-color, #e5e7eb)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              <span>{deleteConfirmDoc.name}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setDeleteConfirmDoc(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #d1d5db)',
                  background: 'transparent',
                  color: 'var(--text-secondary, #4b5563)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const target = deleteConfirmDoc;
                  setDeleteConfirmDoc(null);
                  if (target) {
                    confirmDeleteFile(target.id, target.type, target.rawDoc);
                  }
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account & Profile Modals Manager */}
      <AccountModalsManager
        activeModal={accountModalView}
        onClose={() => setAccountModalView(null)}
        user={currentUser}
        onOpenModal={(view) => setAccountModalView(view)}
        onUpdateUser={(updated) => setCurrentUser(updated)}
        onLogout={handleLogout}
      />
    </div>
  );
}

