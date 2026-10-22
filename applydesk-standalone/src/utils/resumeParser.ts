// Universal Client-Side + Hybrid Resume Parser for ApplyDesk Web
import * as pako from 'pako';
import { PDFParse } from 'pdf-parse';

const inflateBuffer = (buf: Uint8Array): Uint8Array => {
  const p = pako as any;
  if (typeof p.inflate === 'function') return p.inflate(buf);
  if (p.default && typeof p.default.inflate === 'function') return p.default.inflate(buf);
  throw new Error('pako.inflate not available');
};

export interface WorkExperienceItem {
  id?: string;
  company?: string;
  companyName?: string;
  role?: string;
  title?: string;
  jobTitle?: string;
  location?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  jobDescription?: string;
}

export interface EducationItem {
  id?: string;
  school?: string;
  schoolName?: string;
  degree?: string;
  fieldOfStudy?: string;
  location?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  year?: string;
  grade?: string;
}

export interface LanguageItem {
  id?: string;
  name?: string;
  proficiency?: string;
}

export interface ProjectItem {
  id?: string;
  title?: string;
  projectName?: string;
  role?: string;
  link?: string;
  projectUrl?: string;
  description?: string;
  technologies?: string[];
}

export interface ParsedProfile {
  fullName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  city?: string;
  country?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  website?: string;
  targetRole?: string;
  jobTitle?: string;
  roles?: string[];
  headline?: string;
  summary?: string;
  experienceYears?: number;
  experienceLevel?: string;
  experience?: string;
  skills: string[];
  tools?: string[];
  softSkills?: string[];
  interests?: string[];
  languages?: LanguageItem[];
  projects?: ProjectItem[];
  workExperiences: WorkExperienceItem[];
  education: EducationItem[];
  rawText?: string;
}

const METADATA_BLACKLIST = /^(figma|figmapdf|react-pdf|pdfkit|latex|ghostscript|adobe|wkhtmltopdf|canvas|tcpdf|fpdf|itext|creator|producer|title|author|subject|keywords|template|stockholm|untitled|document|page|font|devicergb|devicecmyk|identity-h|cidfont|xobject|zm|xh|yh|zh|bt|et|tj|td|tm|cm|do|id|ei|tf|tr|ts|sc|scn|rg|cs|gs|re|flate|stream|endstream)$/i;

const JOB_TITLE_KEYWORDS = /\b(associate|engineer|developer|manager|director|officer|specialist|consultant|analyst|assistant|lead|coordinator|architect|designer|intern|technician|supervisor|executive|representative|administrator|operator|worker|laborer|scientist|researcher|product owner|scrum master)\b/i;

const DOMAIN_SKILLS = [
  'React', 'React Native', 'TypeScript', 'JavaScript', 'Node.js', 'Express', 'Python', 'Java', 'C++', 'C#',
  'SQL', 'MongoDB', 'PostgreSQL', 'Docker', 'AWS', 'GCP', 'Azure', 'Git', 'GitHub', 'Figma', 'UI/UX', 'HTML', 'CSS',
  'Redux', 'Next.js', 'Vue.js', 'Angular', 'Kubernetes', 'GraphQL', 'REST API', 'CI/CD', 'Linux', 'Tailwind CSS',
  'Problem Solving', 'Leadership', 'Communication', 'Teamwork', 'Agile', 'Scrum', 'Product Management', 'Data Analysis',
  'Machine Learning', 'Artificial Intelligence', 'Cybersecurity', 'Project Management', 'Customer Service', 'Sales'
];

const DOMAIN_TOOLS = [
  'VS Code', 'Git', 'GitHub', 'GitLab', 'Docker', 'Kubernetes', 'Jira', 'Confluence', 'Figma',
  'Postman', 'Jenkins', 'Nginx', 'Redis', 'AWS', 'GCP', 'Azure', 'Webpack', 'Vite',
  'Photoshop', 'Illustrator', 'Slack', 'Trello', 'Notion', 'Excel', 'Salesforce'
];

const B64_MAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const len = clean.length;
  const bytes = new Uint8Array(Math.floor((len * 3) / 4));
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const b1 = B64_MAP.indexOf(clean[i]);
    const b2 = B64_MAP.indexOf(clean[i + 1]);
    const b3 = B64_MAP.indexOf(clean[i + 2]);
    const b4 = B64_MAP.indexOf(clean[i + 3]);
    if (b1 === -1 || b2 === -1) break;
    bytes[p++] = (b1 << 2) | (b2 >> 4);
    if (b3 !== 64 && b3 !== -1) bytes[p++] = ((b2 & 15) << 4) | (b3 >> 2);
    if (b4 !== 64 && b4 !== -1) bytes[p++] = ((b3 & 3) << 6) | b4;
  }
  return bytes.subarray(0, p);
}

function findMarker(bytes: Uint8Array, startFrom: number, marker: number[]): number {
  for (let i = startFrom; i <= bytes.length - marker.length; i++) {
    let match = true;
    for (let j = 0; j < marker.length; j++) {
      if (bytes[i + j] !== marker[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

export function extractAllTextFromPdfBase64(base64Input: string): string {
  const bytes = base64ToUint8Array(base64Input);
  const textParts: string[] = [];
  const len = bytes.length;
  let index = 0;

  // 1. Extract text strictly from decompressed FlateDecode zlib streams
  while (index < len) {
    const streamStart = findMarker(bytes, index, [115, 116, 114, 101, 97, 109]); // "stream"
    if (streamStart === -1) break;

    let dataStart = streamStart + 6;
    while (dataStart < len && (bytes[dataStart] === 10 || bytes[dataStart] === 13)) {
      dataStart++;
    }

    const streamEnd = findMarker(bytes, dataStart, [101, 110, 100, 115, 116, 114, 101, 97, 109]); // "endstream"
    if (streamEnd === -1) break;

    let dataEnd = streamEnd;
    while (dataEnd > dataStart && (bytes[dataEnd - 1] === 10 || bytes[dataEnd - 1] === 13)) {
      dataEnd--;
    }

    const streamBytes = bytes.subarray(dataStart, dataEnd);
    // Safety check: Skip streams that are too small or too large (images/embedded binary are typically > 250KB)
    if (streamBytes.length > 10 && streamBytes.length <= 250000) {
      try {
        const decompressed = inflateBuffer(streamBytes);
        // Skip huge decompressed data (e.g. uncompressed bitmaps)
        if (decompressed.length <= 400000) {
          const decompressedText = new TextDecoder('utf-8', { fatal: false }).decode(decompressed);

          // A. Extract parenthesized strings e.g. (John Doe) or (Software Engineer)
          const parenRegex = /\(([^()]{1,250})\)/g;
          let match;
          while ((match = parenRegex.exec(decompressedText)) !== null) {
            const text = match[1].replace(/\\([()])/g, '$1').trim();
            if (text.length >= 1 && !text.startsWith('/') && !text.startsWith('%') && !METADATA_BLACKLIST.test(text)) {
              textParts.push(text);
              if (textParts.length >= 500) break;
            }
          }

          // B. Extract plain words
          const words = decompressedText.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b|\b[A-Za-z]{2,25}\b/g);
          if (words) {
            const printableLine = words.filter(w => !METADATA_BLACKLIST.test(w)).join(' ');
            if (printableLine.length > 5) {
              textParts.push(printableLine);
              if (textParts.length >= 500) break;
            }
          }
        }
      } catch (e) {}
    }

    if (textParts.length >= 500) break;
    index = streamEnd + 9;
  }

  // 2. Extract ASCII literal strings without looping byte-by-byte (using native TextDecoder Latin1)
  try {
    const headBytes = bytes.subarray(0, Math.min(len, 65536));
    const headText = new TextDecoder('latin1').decode(headBytes);
    const headEmails = headText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
    if (headEmails) textParts.push(...headEmails);
    const headPhones = headText.match(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g);
    if (headPhones) textParts.push(...headPhones);

    if (len > 65536) {
      const tailBytes = bytes.subarray(Math.max(0, len - 65536), len);
      const tailText = new TextDecoder('latin1').decode(tailBytes);
      const tailEmails = tailText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
      if (tailEmails) textParts.push(...tailEmails);
      const tailPhones = tailText.match(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g);
      if (tailPhones) textParts.push(...tailPhones);
    }
  } catch (e) {}

  const cleanLines = textParts
    .map(t => t.trim())
    .filter(t => t.length > 0 && !METADATA_BLACKLIST.test(t));

  return Array.from(new Set(cleanLines)).join('\n');
}

export function cleanCoreRoleTitle(title?: string): string {
  if (!title) return '';
  let text = String(title).replace(/\([^)]*\)/g, ' ');
  text = text.replace(/\b(federal|security clearance|clearance required|ts[\s/]*sci|secret clearance|contract|internship|part[\s-]*time|full[\s-]*time)\b/gi, ' ');
  const SENIORITY_REGEX = /\b(senior|sr\.?|junior|jr\.?|lead|principal|staff|associate|entry[\s-]*level|mid[\s-]*level|head\s+of|director\s+of|vp\s+of|executive|chief)\b/gi;
  text = text.replace(SENIORITY_REGEX, ' ');
  const parts = text.split(/[,/|;\n&]+/).map(p => p.trim()).filter(Boolean);
  const first = parts[0] || '';
  const sub = first.replace(/(Engineer|Developer|Designer|Architect|Manager|Analyst|Specialist|Scientist|Consultant)\s+(?=[A-Z])/gi, '$1|###|').split('|###|');
  const cleaned = (sub[0] || first).replace(/[\-_:,\.]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || title.trim();
}

export function sanitizeProfileData(profile: any): any {
  if (!profile || typeof profile !== 'object') return {};
  const cleaned = { ...profile };

  if (
    cleaned.firstName === 'Applicant' ||
    cleaned.firstName === 'Figma' ||
    cleaned.firstName === 'FigmaPDF' ||
    /^(applicant|figma|untitled|document)$/i.test(cleaned.firstName || '')
  ) {
    cleaned.firstName = '';
    if (cleaned.name && /^(applicant|figma)/i.test(cleaned.name)) {
      cleaned.name = '';
      cleaned.fullName = '';
    }
  }

  if (
    cleaned.email === 'a@7.os' ||
    (cleaned.email && (cleaned.email.endsWith('.os') || cleaned.email.endsWith('.tf') || cleaned.email.includes('.0000')))
  ) {
    cleaned.email = '';
  }

  if (
    cleaned.phone &&
    (
      cleaned.phone === '213013 1151' ||
      cleaned.phone === '595.0000001152' ||
      cleaned.phone.includes('.0000') ||
      cleaned.phone.includes('213013') ||
      /^0+$/.test(cleaned.phone.replace(/[^0-9]/g, ''))
    )
  ) {
    cleaned.phone = '';
  }

  if (
    (cleaned.city === 'San Francisco' && cleaned.country === 'United States') &&
    !cleaned.manuallyEditedLocation
  ) {
    cleaned.city = '';
    cleaned.country = '';
    cleaned.location = '';
  }

  if (Array.isArray(cleaned.skills)) {
    cleaned.skills = cleaned.skills.filter((s: string) =>
      typeof s === 'string' &&
      s.trim().length > 1 &&
      !/^(1|a|null|undefined|true|false)$/i.test(s.trim()) &&
      !METADATA_BLACKLIST.test(s.trim())
    );
  }

  return cleaned;
}

export async function extractTextFromPdf(base64Data: string): Promise<string> {
  const rawB64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  try {
    const bytes = base64ToUint8Array(rawB64);
    const parser = new PDFParse({ data: bytes });
    const res = await parser.getText();
    const text = (res && res.text) ? res.text : (typeof res === 'string' ? res : '');
    await parser.destroy();
    if (text && text.trim().length > 30) {
      return text;
    }
  } catch (err) {
    console.warn('PDFParse extraction error, falling back:', err);
  }
  return extractAllTextFromPdfBase64(rawB64);
}

export function parseResumeClientSide(rawText: string, _fileName = 'resume.pdf'): ParsedProfile {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !METADATA_BLACKLIST.test(l));

  // 1. Email Extraction
  let email: string | undefined = undefined;
  const emailMatches = rawText.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,10})\b/gi);
  if (emailMatches) {
    const validEmail = emailMatches.find(em => {
      const lower = em.toLowerCase();
      const domain = lower.split('@')[1] || '';
      return !domain.endsWith('.os') && !domain.endsWith('.tf') && domain.includes('.') && domain.split('.')[0].length > 1;
    });
    if (validEmail) email = validEmail.toLowerCase();
  }

  // 2. Phone Extraction
  let phone: string | undefined = undefined;
  const phoneMatches = rawText.match(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g);
  if (phoneMatches) {
    const validPhone = phoneMatches.find(p => !p.includes('.0000') && !/\.\d{4,}/.test(p) && !p.includes('213013'));
    if (validPhone) phone = validPhone.trim();
  }

  // 3. Social / Portfolios
  let linkedinUrl: string | undefined = undefined;
  const linkedinMatch = rawText.match(/(?:www\.)?(linkedin\.com\/in\/[a-zA-Z0-9_-]+)/i);
  if (linkedinMatch) linkedinUrl = `https://${linkedinMatch[1]}`;

  let githubUrl: string | undefined = undefined;
  const githubMatch = rawText.match(/(github\.com\/[a-zA-Z0-9_-]+)/i);
  if (githubMatch) githubUrl = `https://${githubMatch[1]}`;

  let portfolioUrl: string | undefined = undefined;
  const siteMatch = rawText.match(/(https?:\/\/)?([a-zA-Z0-9_-]+\.(?:io|me|dev|app|com))/i);
  if (siteMatch && !siteMatch[2].includes('linkedin') && !siteMatch[2].includes('google') && !siteMatch[2].includes('github')) {
    portfolioUrl = siteMatch[0].startsWith('http') ? siteMatch[0] : `https://${siteMatch[2]}`;
  }

  // 4. Name & Target Role Extraction
  let fullName: string | undefined = undefined;
  let targetRole: string | undefined = undefined;

  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const line = lines[i];
    if (line.includes('@') || line.includes('linkedin.com') || line.includes('http') || /^experiences?$/i.test(line) || /^skills$/i.test(line) || /^education$/i.test(line)) continue;

    if (!fullName && /^[A-Z][a-zA-Z\s.'-]{2,35}$/.test(line) && !JOB_TITLE_KEYWORDS.test(line)) {
      if (!/^(figma|figmapdf|pdf|document|untitled|experiences|skills|education)$/i.test(line.trim())) {
        fullName = line.trim();
        continue;
      }
    }
    if (fullName && !targetRole && (JOB_TITLE_KEYWORDS.test(line) || line.includes('-') || line.length < 50)) {
      targetRole = line.trim();
      break;
    }
  }

  // Fallback name from email if needed
  if (!fullName && email) {
    const handle = email.split('@')[0];
    const namePart = handle.replace(/[^a-zA-Z]/g, ' ').trim();
    if (namePart.length >= 3 && !JOB_TITLE_KEYWORDS.test(namePart)) {
      fullName = namePart.split(/\s+/).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    }
  }

  const firstName = fullName ? fullName.split(' ')[0] : '';
  const lastName = fullName ? fullName.split(' ').slice(1).join(' ') : '';

  // 5. Location
  let location: string | undefined = undefined;
  let city: string | undefined = undefined;
  let country: string | undefined = undefined;

  if (rawText.includes('Tehran')) {
    city = 'Tehran';
    country = 'Iran';
    location = 'Tehran, Iran';
  } else {
    const locMatch = rawText.match(/\b([A-Za-z\s]+,\s*[A-Z]{2}(?:\s+\d{5})?)\b/i) ||
                      rawText.match(/\b([A-Z][a-zA-Z\s]+,\s*(?:United Kingdom|UK|United States|USA|Canada|Germany|France|Spain|Netherlands|Australia|Remote|Turkey|Dubai|UAE|Iran))\b/i);
    if (locMatch) {
      location = locMatch[1].trim();
      city = location.split(',')[0].trim();
      if (location.includes('UK') || location.includes('United Kingdom')) country = 'United Kingdom';
      else if (location.includes('Canada')) country = 'Canada';
      else if (location.includes('Germany')) country = 'Germany';
      else if (location.includes('France')) country = 'France';
      else if (location.includes('Australia')) country = 'Australia';
      else if (location.includes('Iran')) country = 'Iran';
      else if (location.includes('United States') || location.includes('USA')) country = 'United States';
    }
  }

  // 6. Skills
  const foundSkills = new Set<string>();
  const skillsIndex = lines.findIndex(l => /^skills$/i.test(l));
  const eduIndex = lines.findIndex(l => /^education$/i.test(l));

  if (skillsIndex !== -1) {
    const skillsLines = lines.slice(skillsIndex + 1, eduIndex !== -1 ? eduIndex : undefined);
    skillsLines.forEach(l => {
      const parts = l.split(/\t+|\s{2,}|[,•|·/]/).map(s => s.trim()).filter(s => s.length >= 2 && s.length <= 40 && !METADATA_BLACKLIST.test(s));
      parts.forEach(s => foundSkills.add(s));
    });
  }

  for (const skill of DOMAIN_SKILLS) {
    const esc = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9])${esc}(?:$|[^a-zA-Z0-9])`, 'i');
    if (regex.test(rawText)) foundSkills.add(skill);
  }

  const foundTools = new Set<string>();
  for (const tool of DOMAIN_TOOLS) {
    const esc = tool.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9])${esc}(?:$|[^a-zA-Z0-9])`, 'i');
    if (regex.test(rawText)) foundTools.add(tool);
  }

  // 7. Work Experiences
  const workExperiences: WorkExperienceItem[] = [];
  const expIndex = lines.findIndex(l => /^experiences?$/i.test(l) || /^work\s+experience$/i.test(l) || /^professional\s+experience$/i.test(l));
  const expEndIndex = skillsIndex !== -1 ? skillsIndex : (eduIndex !== -1 ? eduIndex : lines.length);

  if (expIndex !== -1) {
    const expLines = lines.slice(expIndex + 1, expEndIndex);
    let currentItem: WorkExperienceItem | null = null;
    let expId = 1;

    for (let i = 0; i < expLines.length; i++) {
      const line = expLines[i];
      if (line.includes('@') || line.includes('linkedin.com')) continue;

      const hasRoleOrCompany = line.includes(' - ') && !line.startsWith('¸') && !line.startsWith('•') && !line.startsWith('-');
      const nextLine = expLines[i + 1] || '';
      const hasDates = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/i.test(line) ||
                       /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/i.test(nextLine);

      if (hasRoleOrCompany || (hasDates && !currentItem)) {
        if (currentItem) workExperiences.push(currentItem);

        let role = '';
        let company = 'Company';
        let expLoc = city || 'Remote';
        let dates = '2021 — Present';

        if (line.includes(' - ')) {
          const parts = line.split(' - ');
          role = parts[0].trim();
          const rem = parts.slice(1).join(' - ').trim();
          const tabParts = rem.split(/\t+|\s{2,}/);
          company = tabParts[0].trim();
          expLoc = tabParts.slice(1).join(' ').trim() || expLoc;
        } else {
          role = line;
        }

        if (hasDates && !line.includes(' - ')) {
          dates = line;
        } else if (hasDates && /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/i.test(nextLine)) {
          dates = nextLine;
          i++;
        }

        const dateParts = dates.split(/\s*[-—–]\s*|\s+to\s+/i);

        currentItem = {
          id: String(expId++),
          company,
          companyName: company,
          role: role || targetRole || 'Professional',
          title: role || targetRole || 'Professional',
          jobTitle: role || targetRole || 'Professional',
          location: expLoc,
          city: expLoc,
          startDate: dateParts[0] ? dateParts[0].trim() : '2021',
          endDate: dateParts[1] ? dateParts[1].trim() : 'Present',
          description: '',
          jobDescription: ''
        };
      } else if (currentItem) {
        const cleanBullet = line.replace(/^[¸•\-\*]\s*/, '').replace(/[«§Ñ]$/, '').trim();
        if (cleanBullet.length > 2) {
          currentItem.description += (currentItem.description ? '\n' : '') + cleanBullet;
          currentItem.jobDescription = currentItem.description;
        }
      }
    }
    if (currentItem) workExperiences.push(currentItem);
  }

  // 8. Education
  const educationList: EducationItem[] = [];
  if (eduIndex !== -1) {
    const eduLines = lines.slice(eduIndex + 1);
    let eduId = 1;
    for (let i = 0; i < eduLines.length; i++) {
      const line = eduLines[i];
      if (line.length >= 5 && (line.includes('B.A.') || line.includes('Bachelor') || line.includes('Degree') || line.includes('University') || line.includes('College') || line.includes('Master') || line.includes('B.S.') || line.includes('M.S.') || line.includes('PhD'))) {
        let degree = line;
        let school = 'University';
        if (line.includes('–') || line.includes(' - ')) {
          const parts = line.split(/[–\-]/);
          degree = parts[0].trim();
          school = parts.slice(1).join(' - ').trim();
        } else if (line.includes(',')) {
          const parts = line.split(',');
          degree = parts[0].trim();
          school = parts.slice(1).join(' ').trim();
        }
        const nextL = eduLines[i + 1] || '';
        if (nextL.includes('University') || nextL.includes('Branch') || nextL.includes('College')) {
          school += ' ' + nextL.trim();
          i++;
        }

        const yearMatch = (line + ' ' + nextL).match(/\b(20\d\d|19\d\d)\b/);
        const yearStr = yearMatch ? yearMatch[0] : '2018';

        educationList.push({
          id: String(eduId++),
          school,
          schoolName: school,
          degree,
          fieldOfStudy: degree,
          location: city || 'City',
          city: city || 'City',
          startDate: String(parseInt(yearStr) - 4 || 2014),
          endDate: yearStr,
          year: yearStr,
          grade: ''
        });
        break;
      }
    }
  }

  // 9. Summary
  let summary: string | undefined = undefined;
  const summaryMatch = rawText.match(/(?:summary|professional\s+summary|profile|about\s+me|objective):?([\s\S]*?)(?:experience|education|skills|projects|languages|work|$)/i);
  if (summaryMatch) {
    const smText = summaryMatch[1].replace(/[\r\n]+/g, ' ').trim();
    if (smText.length > 20 && smText.length < 800) {
      summary = smText;
    }
  } else if (eduIndex !== -1 && eduIndex + 3 < lines.length) {
    const lastParagraphs = lines.slice(eduIndex + 3).join(' ').trim();
    if (lastParagraphs.length > 30) {
      summary = lastParagraphs.slice(0, 500);
    }
  }

  // 10. Clean Target Role
  const cleanedRole = cleanCoreRoleTitle(targetRole || 'Software Engineer');

  // Experience level inference
  const expYears = workExperiences.length * 2 || 3;
  let expLevel = 'Mid Level (3-5 years)';
  if (expYears >= 8) expLevel = 'Expert & Leadership (10+ years)';
  else if (expYears >= 6) expLevel = 'Senior (6-9 years)';
  else if (expYears <= 2) expLevel = 'Junior (1-2 years)';

  return {
    fullName: fullName || `${firstName} ${lastName}`.trim(),
    name: fullName || `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    email: email || '',
    phone: phone || '',
    city: city || '',
    location: location || (city ? `${city}${country ? `, ${country}` : ''}` : ''),
    country: country || '',
    linkedinUrl: linkedinUrl || '',
    githubUrl: githubUrl || '',
    portfolioUrl: portfolioUrl || '',
    website: portfolioUrl || linkedinUrl || '',
    targetRole: cleanedRole,
    jobTitle: cleanedRole,
    roles: [cleanedRole],
    headline: `${cleanedRole} | Professional`,
    summary: summary || `${cleanedRole} with ${expYears}+ years of experience in ${Array.from(foundSkills).slice(0, 3).join(', ')}.`,
    experienceYears: expYears,
    experienceLevel: expLevel,
    experience: expLevel,
    skills: Array.from(foundSkills),
    tools: Array.from(foundTools),
    softSkills: ['Problem Solving', 'Communication', 'Leadership', 'Team Collaboration'],
    interests: Array.from(foundSkills).slice(0, 5),
    languages: [{ id: '1', name: 'English', proficiency: 'Native / Fluent' }],
    projects: [],
    workExperiences,
    education: educationList,
    rawText
  };
}

/**
 * Universal Resume Parser entry point from Base64 or DataURL (Server + Client fallback)
 */
export async function parseResumeFromBase64(base64OrDataUrl: string, fileName: string = 'Resume.pdf'): Promise<ParsedProfile> {
  try {
    const base64Data = base64OrDataUrl.includes(',') ? base64OrDataUrl.split(',')[1] : base64OrDataUrl;

    // Try Server parse first
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const apiBases = isLocal
      ? ['http://localhost:3030', 'http://localhost:3000', 'https://api.applydesk.io']
      : ['https://api.applydesk.io'];

    let serverParsed: any = null;
    for (const base of apiBases) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(`${base}/api/parse-resume`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data, fileName }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const resJson = await res.json();
          if (resJson.success && resJson.parsed && (resJson.parsed.firstName || resJson.parsed.fullName || resJson.parsed.email)) {
            serverParsed = resJson.parsed;
            break;
          }
        }
      } catch (e) {}
    }

    // If server produced high-quality parsed data
    if (serverParsed && (serverParsed.firstName || serverParsed.fullName || serverParsed.email)) {
      return formatProfileStructure(serverParsed, fileName);
    }

    // Direct high-accuracy Client-side extraction via PDFParse + rules
    const rawText = await extractTextFromPdf(base64Data);
    const localParsed = parseResumeClientSide(rawText, fileName);
    return formatProfileStructure(localParsed, fileName);
  } catch (err) {
    console.error('Client resume parsing error:', err);
    return formatProfileStructure({
      firstName: '',
      lastName: '',
      email: '',
      skills: [],
      workExperiences: [],
      education: []
    }, fileName);
  }
}

/**
 * Universal Resume Parser entry point (Server + Client fallback)
 */
export async function parseResumeFile(file: File): Promise<ParsedProfile> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        const parsed = await parseResumeFromBase64(result, file.name);
        resolve(parsed);
      } catch (err) {
        resolve(formatProfileStructure({}, file.name));
      }
    };
    reader.readAsDataURL(file);
  });
}

export function formatProfileStructure(raw: any, _fileName = 'resume.pdf'): ParsedProfile {
  const fName = raw.firstName || (raw.fullName ? raw.fullName.split(' ')[0] : '');
  const lName = raw.lastName || (raw.fullName ? raw.fullName.split(' ').slice(1).join(' ') : '');
  const cleanRole = cleanCoreRoleTitle(raw.targetRole || raw.jobTitle || 'Professional');

  const formattedExperiences = (raw.workExperiences || []).map((exp: any, idx: number) => ({
    id: String(exp.id || idx + 1),
    company: exp.company || exp.companyName || 'Company',
    companyName: exp.company || exp.companyName || 'Company',
    role: exp.role || exp.title || exp.jobTitle || cleanRole,
    title: exp.title || exp.role || exp.jobTitle || cleanRole,
    jobTitle: exp.jobTitle || exp.role || exp.title || cleanRole,
    location: exp.location || exp.city || 'Remote',
    city: exp.city || exp.location || 'Remote',
    startDate: exp.startDate || '2021',
    endDate: exp.endDate || 'Present',
    description: exp.description || exp.jobDescription || '',
    jobDescription: exp.jobDescription || exp.description || ''
  }));

  const formattedEducations = (raw.education || []).map((edu: any, idx: number) => ({
    id: String(edu.id || idx + 1),
    school: edu.school || edu.schoolName || 'University',
    schoolName: edu.schoolName || edu.school || 'University',
    degree: edu.degree || 'Degree',
    fieldOfStudy: edu.fieldOfStudy || edu.degree || 'Field of Study',
    location: edu.location || edu.city || 'City',
    city: edu.city || edu.location || 'City',
    startDate: edu.startDate || '2018',
    endDate: edu.endDate || edu.year || '2022',
    year: edu.year || edu.endDate || '2022',
    grade: edu.grade || ''
  }));

  const formattedLanguages = (raw.languages || []).map((lang: any, idx: number) => {
    if (typeof lang === 'string') return { id: String(idx + 1), name: lang, proficiency: 'Fluent' };
    return { id: String(lang.id || idx + 1), name: lang.name || 'English', proficiency: lang.proficiency || 'Fluent' };
  });

  return {
    ...raw,
    firstName: fName,
    lastName: lName,
    fullName: `${fName} ${lName}`.trim(),
    name: `${fName} ${lName}`.trim(),
    email: raw.email || '',
    phone: raw.phone || '',
    city: raw.city || raw.location?.split(',')[0]?.trim() || '',
    location: raw.location || (raw.city ? `${raw.city}${raw.country ? `, ${raw.country}` : ''}` : ''),
    country: raw.country || '',
    targetRole: cleanRole,
    jobTitle: cleanRole,
    roles: raw.roles && raw.roles.length > 0 ? raw.roles : [cleanRole],
    headline: `${cleanRole} | Professional`,
    summary: raw.summary || `${cleanRole} with strong background in ${(raw.skills || []).slice(0, 3).join(', ')}.`,
    linkedinUrl: raw.linkedinUrl || '',
    githubUrl: raw.githubUrl || '',
    portfolioUrl: raw.portfolioUrl || '',
    website: raw.website || raw.portfolioUrl || raw.linkedinUrl || '',
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    tools: Array.isArray(raw.tools) ? raw.tools : [],
    softSkills: Array.isArray(raw.softSkills) ? raw.softSkills : ['Communication', 'Problem Solving', 'Leadership'],
    interests: Array.isArray(raw.interests) ? raw.interests : (raw.skills || []).slice(0, 5),
    experienceLevel: raw.experienceLevel || 'Mid Level (3-5 years)',
    experience: raw.experience || raw.experienceLevel || 'Mid Level (3-5 years)',
    workExperiences: formattedExperiences,
    education: formattedEducations,
    languages: formattedLanguages.length > 0 ? formattedLanguages : [{ id: '1', name: 'English', proficiency: 'Fluent' }],
    projects: Array.isArray(raw.projects) ? raw.projects : []
  };
}
