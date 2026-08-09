// Universal Client-Side PDF Resume Parser Utility (Robust Binary Base64 + Pako FlateDecode Decompressor)
import pako from 'pako';

export interface WorkExperienceItem {
  company?: string;
  title?: string;
  location?: string;
  dates?: string;
  description?: string;
}

export interface EducationItem {
  degree?: string;
  school?: string;
  year?: string;
}

export interface ParsedProfile {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  targetRole?: string;
  experienceYears?: number;
  experienceLevel?: string;
  skills: string[];
  workExperiences: WorkExperienceItem[];
  education: EducationItem[];
  rawText?: string;
}

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

function extractAllTextFromPdfBytes(base64Input: string): string {
  const bytes = base64ToUint8Array(base64Input);
  const textParts: string[] = [];

  // 1. Decompress PDF FlateDecode zlib streams
  const len = bytes.length;
  let index = 0;

  while (index < len) {
    // Find "stream" (ASCII: 115, 116, 114, 101, 97, 109)
    const streamStart = findMarker(bytes, index, [115, 116, 114, 101, 97, 109]);
    if (streamStart === -1) break;

    let dataStart = streamStart + 6;
    while (dataStart < len && (bytes[dataStart] === 10 || bytes[dataStart] === 13)) {
      dataStart++;
    }

    // Find "endstream" (ASCII: 101, 110, 100, 115, 116, 114, 101, 97, 109)
    const streamEnd = findMarker(bytes, dataStart, [101, 110, 100, 115, 116, 114, 101, 97, 109]);
    if (streamEnd === -1) break;

    let dataEnd = streamEnd;
    while (dataEnd > dataStart && (bytes[dataEnd - 1] === 10 || bytes[dataEnd - 1] === 13)) {
      dataEnd--;
    }

    const streamBytes = bytes.subarray(dataStart, dataEnd);
    if (streamBytes.length > 10) {
      try {
        const decompressed = pako.inflate(streamBytes);
        const decompressedText = new TextDecoder('utf-8', { fatal: false }).decode(decompressed);

        // Extract text inside parentheses (Text) Tj or [(Hello) -10 (World)] TJ
        const parenRegex = /\(([^()]{2,150})\)/g;
        let match;
        while ((match = parenRegex.exec(decompressedText)) !== null) {
          const text = match[1].replace(/\\([()])/g, '$1').trim();
          if (text.length >= 2 && !text.startsWith('/') && !text.startsWith('%')) {
            textParts.push(text);
          }
        }

        // Also extract clean text lines from stream
        const textLines = decompressedText
          .split(/[\r\n]+/)
          .map(l => l.trim())
          .filter(l => l.length >= 2 && !l.startsWith('/') && !l.startsWith('%') && !l.includes('obj'));
        if (textLines.length > 0) {
          textParts.push(...textLines);
        }
      } catch (inflateErr) {
        // Raw stream might not be compressed
      }
    }

    index = streamEnd + 9;
  }

  // 2. Extract literal strings and ASCII printable sequences from raw bytes
  let rawAscii = '';
  for (let i = 0; i < bytes.length; i++) {
    const code = bytes[i];
    if ((code >= 32 && code <= 126) || code === 10 || code === 13) {
      rawAscii += String.fromCharCode(code);
    } else {
      rawAscii += ' ';
    }
  }

  const parenRegex = /\(([^()]{2,150})\)/g;
  let match;
  while ((match = parenRegex.exec(rawAscii)) !== null) {
    const text = match[1].trim();
    if (text.length >= 2 && !text.startsWith('%') && !text.startsWith('/')) {
      textParts.push(text);
    }
  }

  // 3. Extract raw emails/phone numbers/urls from raw ASCII string
  const rawEmails = rawAscii.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
  if (rawEmails) textParts.push(...rawEmails);

  const rawPhones = rawAscii.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g);
  if (rawPhones) textParts.push(...rawPhones);

  return textParts.join('\n');
}

export async function parsePdfResumeText(rawInput: string, fileName = 'resume.pdf'): Promise<ParsedProfile> {
  console.log(`📄 [PDF PARSER DEEP SEARCH] Starting extraction for: ${fileName}`);
  const cleanText = extractAllTextFromPdfBytes(rawInput);
  const lines = cleanText.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);

  // 1. Email Extraction
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const emailMatch = cleanText.match(emailRegex);
  const email = emailMatch ? emailMatch[1].toLowerCase() : undefined;

  // 2. Phone Number Extraction
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const phoneMatch = cleanText.match(phoneRegex);
  const phone = phoneMatch ? phoneMatch[0].trim() : undefined;

  // 3. Social & Portfolio Links
  const linkedinRegex = /(linkedin\.com\/in\/[a-zA-Z0-9_-]+)/i;
  const linkedinMatch = cleanText.match(linkedinRegex);
  const linkedinUrl = linkedinMatch ? `https://${linkedinMatch[1]}` : undefined;

  const portfolioRegex = /(portfolio:?\s*|website:?\s*|github\.com\/)?([a-zA-Z0-9_-]+\.(com|io|net|org|me|dev|app|co))/i;
  const portfolioMatch = cleanText.match(portfolioRegex);
  const portfolioUrl = portfolioMatch ? portfolioMatch[2] : undefined;

  // 4. Location Extraction
  let location: string | undefined = undefined;
  const locationLineMatch = cleanText.match(/\b([A-Z][a-zA-Z\s]+,\s*(?:Turkey|France|UAE|Dubai|United States|UK|Canada|Germany|Iran|Spain|Italy|Remote))\b/i);
  if (locationLineMatch) {
    location = locationLineMatch[1].trim();
  }

  // 5. Full Name & Job Title Extraction (Top header lines)
  let fullName: string | undefined = undefined;
  let targetRole: string | undefined = undefined;

  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i];

    if (!fullName && !line.includes('@') && !line.includes('http') && !line.includes('www') && !/\d/.test(line) && !line.startsWith('%') && !line.startsWith('/')) {
      if (!/resume|curriculum|vitae|page|profile|work|experience|skills|education/i.test(line)) {
        if (/^[A-Za-z\s.'-]{3,35}$/.test(line)) {
          fullName = line;
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            if (!nextLine.includes('@') && !/\d/.test(nextLine) && nextLine.length > 3 && nextLine.length < 50) {
              if (!/work|experience|skills|education/i.test(nextLine)) {
                targetRole = nextLine;
              }
            }
          }
          break;
        }
      }
    }
  }

  // Fallback Name from Email Handle (e.g. omidmoradime@gmail.com -> Omid Moradi)
  if (!fullName && email) {
    const handle = email.split('@')[0];
    const cleanHandle = handle.replace(/(me|dev|design|mail|app|work)$/i, '');
    const parts = cleanHandle.replace(/[^a-zA-Z]/g, ' ').trim().split(/\s+/);
    if (parts.length > 0) {
      fullName = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    }
  }

  const firstName = fullName ? fullName.split(' ')[0] : undefined;
  const lastName = fullName ? fullName.split(' ').slice(1).join(' ') : undefined;

  // 6. Dynamic Section-Based Extraction (Skills, Work Experience, Education)
  const skillsList: Set<string> = new Set();
  const workExperiences: WorkExperienceItem[] = [];
  const educationList: EducationItem[] = [];

  let currentSection: 'skills' | 'experience' | 'education' | 'none' = 'none';
  let currentWorkItem: Partial<WorkExperienceItem> | null = null;

  for (const line of lines) {
    const lowerLine = line.toLowerCase().trim();

    // SECTION HEADERS DETECTOR
    if (/^(skills|skillset|core competencies|key skills|technical skills|areas of expertise)\b/i.test(lowerLine)) {
      currentSection = 'skills';
      continue;
    }
    if (/^(work experience[s]?|employment history|professional experience|experience)\b/i.test(lowerLine)) {
      currentSection = 'experience';
      continue;
    }
    if (/^(education|academic background|qualifications)\b/i.test(lowerLine)) {
      currentSection = 'education';
      continue;
    }

    // A. SKILLS SECTION CONTENT EXTRACTION
    if (currentSection === 'skills') {
      const tokens = line.split(/[•·,|\/]/).map(t => t.trim()).filter(t => t.length >= 2 && t.length <= 40);
      tokens.forEach(token => {
        if (!/^(skills|experience|education|page|\d+)/i.test(token)) {
          skillsList.add(token);
        }
      });
    }

    // B. WORK EXPERIENCE SECTION CONTENT EXTRACTION
    else if (currentSection === 'experience') {
      const dateMatch = line.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|20\d{2}|19\d{2})\s*[\d\s,-–]*\b(20\d{2}|19\d{2}|Present|Current)\b/i);

      if (dateMatch || /^(Senior|Head|Lead|Junior|Manager|Designer|Engineer|Architect|Consultant|Specialist|Director|Analyst|Developer)/i.test(line)) {
        if (currentWorkItem && (currentWorkItem.title || currentWorkItem.company)) {
          workExperiences.push(currentWorkItem as WorkExperienceItem);
        }
        currentWorkItem = {
          title: line.split(/[-–|]/)[0]?.trim() || line,
          company: line.includes('-') ? line.split(/[-–|]/)[1]?.trim() : undefined,
          dates: dateMatch ? dateMatch[0] : undefined,
          description: ''
        };
      } else if (currentWorkItem) {
        if (line.length > 5 && !line.startsWith('%') && !line.startsWith('/')) {
          currentWorkItem.description = (currentWorkItem.description ? currentWorkItem.description + '\n• ' : '• ') + line;
        }
      }
    }

    // C. EDUCATION SECTION CONTENT EXTRACTION
    else if (currentSection === 'education') {
      if (/^(B\.A\.|B\.S\.|M\.S\.|Ph\.D\.|Bachelor|Master|Doctor|Diploma|Degree|University|College|Institute)/i.test(line) || /\b(20\d{2}|19\d{2})\b/.test(line)) {
        educationList.push({
          degree: line.split(/in|from|–|-/)[0]?.trim() || line,
          school: line.includes('University') || line.includes('College') ? line : undefined,
          year: line.match(/\b(20\d{2}|19\d{2})\b/)?.[0]
        });
      }
    }
  }

  // Push last pending work item
  const lastWorkItem = currentWorkItem as Partial<WorkExperienceItem> | null;
  if (lastWorkItem && (lastWorkItem.title || lastWorkItem.company)) {
    workExperiences.push({
      company: lastWorkItem.company,
      title: lastWorkItem.title,
      dates: lastWorkItem.dates,
      description: lastWorkItem.description
    });
  }

  // Calculate experience years dynamically from date ranges
  const dateRanges = cleanText.match(/\b(20\d{2}|19\d{2})\s*(?:-|–|to)\s*(20\d{2}|Present|Current)\b/gi);
  let totalYears = 0;
  if (dateRanges && dateRanges.length > 0) {
    const currentYear = new Date().getFullYear();
    dateRanges.forEach(range => {
      const match = range.match(/\b(20\d{2}|19\d{2})\s*(?:-|–|to)\s*(20\d{2}|Present|Current)\b/i);
      if (match) {
        const start = parseInt(match[1], 10);
        const endStr = match[2];
        const end = (endStr.toLowerCase() === 'present' || endStr.toLowerCase() === 'current') ? currentYear : parseInt(endStr, 10);
        if (end >= start) {
          totalYears += (end - start);
        }
      }
    });
  }

  let experienceLevel = '3+ years';
  if (totalYears >= 7) {
    experienceLevel = '7+ years';
  } else if (totalYears >= 5) {
    experienceLevel = '5+ years';
  } else if (totalYears >= 3) {
    experienceLevel = '3+ years';
  } else if (totalYears >= 1) {
    experienceLevel = '1-2 years';
  } else {
    experienceLevel = 'Entry / Junior';
  }

  const extractedSkillsArray = Array.from(skillsList);

  const result: ParsedProfile = {
    fullName,
    firstName,
    lastName,
    email,
    phone,
    location,
    linkedinUrl,
    portfolioUrl,
    targetRole: targetRole || 'Professional',
    experienceYears: Math.max(totalYears, 3),
    experienceLevel,
    skills: extractedSkillsArray.length > 0 ? extractedSkillsArray : ['Management', 'Strategy', 'Communication'],
    workExperiences,
    education: educationList,
    rawText: cleanText
  };

  // COMPREHENSIVE CONSOLE LOG BOX FOR DEEP SEARCH
  console.log('\n=================================================================');
  console.log(`🌍 [UNIVERSAL DECOMPRESSED PDF RESUME PARSER] 🌍`);
  console.log(`-----------------------------------------------------------------`);
  console.log(`📄 File Name        : ${fileName}`);
  console.log(`👤 Full Name        : ${fullName || '❌ Not Found'}`);
  console.log(`👤 First Name       : ${firstName || '❌ Not Found'}`);
  console.log(`👤 Last Name        : ${lastName || '❌ Not Found'}`);
  console.log(`📧 Email Address    : ${email || '❌ Not Found'}`);
  console.log(`📞 Phone Number     : ${phone || '❌ Not Found'}`);
  console.log(`🔗 LinkedIn URL     : ${linkedinUrl || '❌ Not Found'}`);
  console.log(`🌐 Portfolio Website: ${portfolioUrl || '❌ Not Found'}`);
  console.log(`📍 Location         : ${location || '❌ Not Found'}`);
  console.log(`🎯 Target Job Role  : ${targetRole || 'Professional'}`);
  console.log(`💼 Total Experience : ${experienceLevel} (${totalYears} years detected)`);
  console.log(`-----------------------------------------------------------------`);
  console.log(`🛠️ DYNAMICALLY EXTRACTED SKILLS (${extractedSkillsArray.length}):`);
  console.log(extractedSkillsArray.map(s => `  • ${s}`).join('\n') || '  (None detected under Skills section)');
  console.log(`-----------------------------------------------------------------`);
  console.log(`💼 EXTRACTED WORK EXPERIENCES (${workExperiences.length}):`);
  workExperiences.forEach((w, idx) => {
    console.log(`  [${idx + 1}] Title: ${w.title || 'N/A'} | Dates: ${w.dates || 'N/A'}`);
    if (w.description) console.log(`      Details: ${w.description.slice(0, 100).replace(/\n/g, ' ')}...`);
  });
  console.log(`-----------------------------------------------------------------`);
  console.log(`🎓 EXTRACTED EDUCATION (${educationList.length}):`);
  educationList.forEach((e, idx) => {
    console.log(`  [${idx + 1}] Degree: ${e.degree || 'N/A'} | Year: ${e.year || 'N/A'}`);
  });
  console.log('=================================================================\n');

  return result;
}
