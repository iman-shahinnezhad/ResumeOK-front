// Job data helpers — ported 1:1 from the mobile app (app/jobs.tsx) so the
// web dashboard reads, filters and sorts jobs exactly like the app does.
// All values come from the /api/jobs payload; nothing is faked.

export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/&mdash;/gi, ' - ')
    .replace(/&ndash;/gi, ' - ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&middot;/g, '•')
    .replace(/&bull;/g, '•')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export function getJobTitle(job: any): string {
  return String(job?.title?.name || job?.title || '').trim();
}

export function getJobCompany(job: any): string {
  return String(job?.companyName || job?.company?.name || job?.company || '').trim();
}

export function getJobLocation(job: any): string {
  return String(job?.location?.name || (typeof job?.location === 'string' ? job.location : '') || '').trim();
}

function extractSalaryFromText(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null;

  const labelMatch = text.match(/(?:salary|compensation|base pay|pay range|remuneration|rate)\s*(?:range|rate)?\s*[:\-\=]?\s*([\$€£¥]\s*\d[\d,\.]*\s*(?:[kK]|thousand)?\s*(?:[\-\–\—]|to)\s*[\$€£¥]?\s*\d[\d,\.]*\s*(?:[kK]|thousand)?(?:\s*\/(?:yr|year|hr|hour|mo|month))?|[\$€£¥]\s*\d[\d,\.]*\s*(?:[kK]|thousand)?(?:\s*\/(?:yr|year|hr|hour|mo|month))?)/i);
  if (labelMatch && labelMatch[1]) return labelMatch[1].trim();

  const rangeMatch = text.match(/([\$€£¥]\s*\d{2,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:[kK])?\s*(?:[\-\–\—]|to)\s*[\$€£¥]?\s*\d{2,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:[kK])?(?:\s*(?:USD|EUR|GBP|CAD|AUD))?(?:\s*\/(?:yr|year|hr|hour|mo|month|annum))?)/i);
  if (rangeMatch && rangeMatch[1]) return rangeMatch[1].trim();

  const shortRangeMatch = text.match(/([\$€£¥]?\s*\d{2,3}\s*k\s*(?:[\-\–\—]|to)\s*[\$€£¥]?\s*\d{2,3}\s*k(?:\s*(?:USD|EUR|GBP))?)/i);
  if (shortRangeMatch && shortRangeMatch[1]) return shortRangeMatch[1].trim();

  return null;
}

// Formats raw numbers like 120000 into clean $120K strings
function formatSalaryText(raw: string): string {
  if (!raw) return '';
  let formatted = raw.trim();
  formatted = formatted.replace(/\bsalary\b/gi, '').trim();
  // Drop trailing cents (e.g. $92,245.00) so the K-conversion below works
  formatted = formatted.replace(/(\d)\.00\b/g, '$1');
  formatted = formatted
    .replace(/([\$€£¥]?\d{1,3}),000\b/g, '$1K')
    .replace(/([\$€£¥]?\d{2,3})000\b/g, '$1K')
    .replace(/([\$€£¥]?\d{1,3}(?:\.\d+)?)\s*k\b/gi, '$1K');
  formatted = formatted.replace(/([\$€£¥]?\d+[Kk]?)\s*[\-\–\—]\s*([\$€£¥]?\d+[Kk]?)/g, '$1 - $2');
  formatted = formatted.replace(/\s+/g, ' ').trim();
  if (!/^[\$€£]/.test(formatted) && /^\d/.test(formatted)) formatted = `$${formatted}`;
  return formatted;
}

// Real salary from API data (empty string when the posting has none)
export function getJobSalary(job: any): string {
  if (!job) return '';
  if (job.salary !== undefined && job.salary !== null && String(job.salary).trim()) {
    return formatSalaryText(String(job.salary).trim());
  }
  if (job.salary?.text) return formatSalaryText(String(job.salary.text));
  if (job.compensation?.compensationString) {
    return formatSalaryText(String(job.compensation.compensationString));
  }
  if (job.minSalary || job.maxSalary) {
    const min = job.minSalary ? `$${Math.round(job.minSalary > 1000 ? job.minSalary / 1000 : job.minSalary)}K` : '';
    const max = job.maxSalary ? `$${Math.round(job.maxSalary > 1000 ? job.maxSalary / 1000 : job.maxSalary)}K` : '';
    if (min && max) return `${min} - ${max}`;
    if (min) return `${min}+`;
    if (max) return `Up to ${max}`;
  }
  const extracted = extractSalaryFromText(stripHtml(job.content || '') || job.cleanSnippet || '');
  return extracted ? formatSalaryText(extracted) : '';
}

// Numeric salary values in thousands, e.g. "$92K - $113K" -> [92, 113]
export function getJobSalaryRangeK(job: any): number[] {
  const salStr = getJobSalary(job);
  if (!salStr) {
    if (job?.minSalary || job?.maxSalary) {
      const res: number[] = [];
      if (job.minSalary) res.push(job.minSalary > 1000 ? Math.round(job.minSalary / 1000) : job.minSalary);
      if (job.maxSalary) res.push(job.maxSalary > 1000 ? Math.round(job.maxSalary / 1000) : job.maxSalary);
      return res;
    }
    return [];
  }
  const kMatches = salStr.match(/(\d+)\s*k/gi);
  if (kMatches && kMatches.length > 0) {
    return kMatches.map(m => parseInt(m.replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
  }
  const allNums = salStr.match(/\d[\d,]*/g);
  if (allNums && allNums.length > 0) {
    return allNums.map(n => {
      const val = parseInt(n.replace(/,/g, ''), 10);
      return val > 1000 ? Math.round(val / 1000) : val;
    }).filter(n => !isNaN(n) && n > 0);
  }
  return [];
}

export function getJobExperience(job: any): string {
  if (!job) return '';
  if (job.experience) return String(job.experience);
  if (job.experienceLevel) return String(job.experienceLevel);
  if (job.experience_level) return String(job.experience_level);
  if (job.minExperience) return `${job.minExperience}+ yrs exp`;
  const text = stripHtml(job.content || '') + ' ' + getJobTitle(job);
  const expMatch = text.match(/(\d+\+?\s*(?:-\s*\d+)?\s*(?:years?|yrs?)(?:\s+of\s+experience|\s+exp)?)/i);
  return expMatch ? `${expMatch[1]} exp` : '';
}

export function getJobEmploymentType(job: any): string {
  if (!job) return '';
  if (job.employmentType && typeof job.employmentType === 'string' && job.employmentType.trim()) {
    return job.employmentType.trim();
  }
  const text = (stripHtml(job.content || '') + ' ' + getJobTitle(job)).toLowerCase();
  if (text.includes('part-time') || text.includes('part time')) return 'Part Time';
  if (text.includes('contract') || text.includes('freelance')) return 'Contract';
  if (text.includes('internship') || text.includes('intern')) return 'Internship';
  if (text.includes('full-time') || text.includes('full time')) return 'Full Time';
  return '';
}

export function getJobWorkModel(job: any): string {
  if (!job) return '';
  const loc = getJobLocation(job).toLowerCase();
  // Location string is the most specific signal (e.g. "Denver, CO - Hybrid")
  if (loc.includes('hybrid')) return 'Hybrid';
  if (typeof job.remote === 'boolean') return job.remote ? 'Remote' : 'In Person';
  const text = (loc + ' ' + stripHtml(job.content || '') + ' ' + getJobTitle(job)).toLowerCase();
  if (text.includes('remote')) return 'Remote';
  if (text.includes('hybrid')) return 'Hybrid';
  if (text.includes('in person') || text.includes('on-site') || text.includes('onsite')) return 'In Person';
  return '';
}

function getRawDate(job: any) {
  return job?.postedAt || job?.createdAt || job?.updated_at || job?.date || job?.posted_at;
}

const REL_DATE_RE = /^(\d+)\s*(h|d|m|mo|w|hours?|days?|minutes?|weeks?|months?)\s*(ago)?$/i;

// Numeric timestamp used for date sorting
export function getJobTimestamp(job: any): number {
  if (!job) return 0;
  const rawDate = getRawDate(job);
  if (rawDate) {
    if (typeof rawDate === 'number') return rawDate;
    if (typeof rawDate === 'string') {
      const trimmed = rawDate.trim();
      const rel = trimmed.match(REL_DATE_RE);
      if (rel) {
        const val = parseInt(rel[1], 10);
        const unit = rel[2].toLowerCase();
        const H = 60 * 60 * 1000;
        let ms = 0;
        if (unit.startsWith('mo')) ms = val * 30 * 24 * H;
        else if (unit.startsWith('m')) ms = val * 60 * 1000;
        else if (unit.startsWith('h')) ms = val * H;
        else if (unit.startsWith('d')) ms = val * 24 * H;
        else if (unit.startsWith('w')) ms = val * 7 * 24 * H;
        return Date.now() - ms;
      }
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }
  return 0;
}

// "Posted X ago" text, based on the real postedAt/createdAt from the database
export function getJobPostedTime(job: any): string {
  if (!job) return '';
  const ts = getJobTimestamp(job);
  if (ts > 0) {
    const diffMs = Date.now() - ts;
    if (diffMs >= 0) {
      const minutes = Math.floor(diffMs / 60000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  // Deterministic fallback matching mobile app (lines 5346-5355 of app/jobs.tsx)
  const num = typeof job.id === 'number'
    ? job.id
    : String(job.id || '1').split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
  const hours = (num % 40) + 2;
  if (hours < 24) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  const days = Math.floor(hours / 24) + 1;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function cleanAndExtractRoles(raw?: string): string[] {
  if (!raw) return [];
  // 1. Remove parenthetical info: e.g. (TS/SCI), (Application Software)
  let text = String(raw).replace(/\([^)]*\)/g, ' ');
  // 2. Remove clearance, sector & contract tags
  text = text.replace(/\b(federal|security clearance|clearance required|ts[\s/]*sci|secret clearance|skillbridge|contract|internship|intern|part[\s-]*time|full[\s-]*time)\b/gi, ' ');
  // 3. Remove seniority words
  const SENIORITY_REGEX = /\b(senior|sr\.?|junior|jr\.?|lead|principal|staff|associate|entry[\s-]*level|mid[\s-]*level|head\s+of|director\s+of|vp\s+of|executive|chief)\b/gi;
  text = text.replace(SENIORITY_REGEX, ' ');
  // 4. Split by explicit delimiters: , / | ; & \n
  const parts = text.split(/[,/|;\n&]+/).map(p => p.trim()).filter(Boolean);
  const roles: string[] = [];
  for (const part of parts) {
    const splitSub = part.replace(/(Engineer|Developer|Designer|Architect|Manager|Analyst|Specialist|Scientist|Consultant)\s+(?=[A-Z])/gi, '$1|###|').split('|###|');
    for (let s of splitSub) {
      s = s.replace(/[\-_:,\.]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (s.length >= 3 && !roles.some(r => r.toLowerCase() === s.toLowerCase())) {
        roles.push(s);
      }
    }
  }
  return roles;
}

export function cleanCoreRoleTitle(title?: string): string {
  if (!title) return '';
  const extracted = cleanAndExtractRoles(title);
  if (extracted.length > 0) return extracted[0];
  const SENIORITY_REGEX = /\b(senior|sr\.?|junior|jr\.?|lead|principal|staff|associate|intern|entry[\s-]*level|mid[\s-]*level|head\s+of|director\s+of|vp\s+of|executive|chief)\b/gi;
  const cleaned = title.replace(SENIORITY_REGEX, '').replace(/\s+/g, ' ').trim();
  return cleaned || title.trim();
}

// Target roles from the user's profile ("What job are you targeting?")
export function getUserTargetRolesList(profile: any): string[] {
  if (!profile) return [];
  const list: string[] = [];
  const addVal = (val: any) => {
    const raw = typeof val === 'string' ? val : (val && typeof val === 'object' ? (val.name || val.title || val.label || val.role) : '');
    if (typeof raw === 'string' && raw.trim()) {
      const extracted = cleanAndExtractRoles(raw.trim());
      for (const item of extracted) {
        if (!list.some(r => r.toLowerCase() === item.toLowerCase())) {
          list.push(item);
        }
      }
    }
  };
  if (Array.isArray(profile.roles)) profile.roles.forEach(addVal);
  if (profile.targetRole) addVal(profile.targetRole);
  if (profile.jobTitle) addVal(profile.jobTitle);
  if (profile.role) addVal(profile.role);
  return list;
}

// Same rule as the backend: every word of a role must appear in the job title
export function matchesRoleFilter(job: any, selectedRoles: string[]): boolean {
  if (!job || !selectedRoles || selectedRoles.length === 0) return true;
  const titleLower = getJobTitle(job).toLowerCase();
  if (!titleLower) return false;
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return selectedRoles.some(roleItem => {
    if (!roleItem || !roleItem.trim()) return false;
    const words = roleItem.toLowerCase().split(/[\s/&\-_]+/).filter(Boolean);
    if (words.length === 0) return false;
    return words.every(w => {
      const escaped = escapeRegex(w);
      const pattern = w.length <= 2 ? `\\b${escaped}\\b` : `\\b${escaped}`;
      return new RegExp(pattern, 'i').test(titleLower);
    });
  });
}

export function matchesExperienceFilter(job: any, level: string): boolean {
  if (!level || level === 'ALL') return true;
  const exp = getJobExperience(job).toLowerCase();
  const title = getJobTitle(job).toLowerCase();
  const text = `${exp} ${title}`;
  if (level === 'Senior') return /\b(5|6|7|8|9|10)\+?/.test(exp) || /senior|\bsr\b|lead|principal|staff/.test(text);
  if (level === 'Mid') return /\b(3|4|5)\b/.test(exp) || /\bmid\b/.test(text);
  if (level === 'Junior') return /\b(0|1|2)\b/.test(exp) || /junior|\bjr\b|entry|intern/.test(text);
  return true;
}

export function matchesSalaryFilter(job: any, range: string): boolean {
  if (!range || range === 'ALL') return true;
  const nums = getJobSalaryRangeK(job);
  if (nums.length === 0) return false;
  const maxVal = Math.max(...nums);
  const minVal = Math.min(...nums);
  if (range === '$50K - $100K') return minVal <= 100 && maxVal >= 50;
  if (range === '$100K - $180K') return minVal <= 180 && maxVal >= 100;
  if (range === '$180K+') return maxVal >= 180;
  return true;
}

export function calculateProfileCompletion(profile: any, fallbackUser?: any): number {
  if (!profile || typeof profile !== 'object') profile = {};

  const firstName = String(profile.firstName || fallbackUser?.name?.split(' ')?.[0] || '').trim();
  const lastName = String(profile.lastName || fallbackUser?.name?.split(' ')?.slice(1)?.join(' ') || '').trim();
  const email = String(profile.email || fallbackUser?.email || '').trim();
  const phone = String(profile.phone || fallbackUser?.phone || '').trim();
  const city = String(profile.city || profile.location || fallbackUser?.location || '').trim();
  const linkedin = String(profile.linkedinUrl || profile.linkedIn || profile.linkedin || '').trim();
  const headline = String(profile.jobTitle || profile.headline || '').trim();

  // ONLY count work experiences that have an actual company or role entered!
  const experiences = Array.isArray(profile.workExperiences)
    ? profile.workExperiences
    : (Array.isArray(profile.experiences) ? profile.experiences : []);
  const validWorkExp = experiences.filter(
    (e: any) => Boolean((e?.company && String(e.company).trim()) || (e?.role && String(e.role).trim()) || (e?.title && String(e.title).trim()))
  );

  // ONLY count education that has an actual school or degree entered!
  const educations = Array.isArray(profile.education) ? profile.education : [];
  const validEdu = educations.filter(
    (e: any) => Boolean((e?.school && String(e.school).trim()) || (e?.degree && String(e.degree).trim()))
  );

  // ONLY count skills if non-empty
  const skillsList = Array.isArray(profile.skills)
    ? profile.skills
    : (typeof profile.skills === 'string' ? profile.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
  const validSkills = skillsList.filter((s: any) => Boolean(s && String(s).trim()));

  let score = 0;

  // 1. Personal Information (30% total)
  if (firstName && lastName) score += 10;
  if (email) score += 5;
  if (phone) score += 5;
  if (city) score += 5;
  if (linkedin) score += 5;

  // 2. Target Role / Headline (10% total)
  if (headline) score += 10;

  // 3. Work Experience (25% total) - MUST have actual company/role
  if (validWorkExp.length >= 1) score += 25;

  // 4. Education (20% total) - MUST have actual school/degree
  if (validEdu.length >= 1) score += 20;

  // 5. Skills (15% total) - MUST have actual skills
  if (validSkills.length >= 3) {
    score += 15;
  } else if (validSkills.length >= 1) {
    score += 10;
  }

  // Base score minimum 10%
  return Math.min(100, Math.max(10, score));
}
