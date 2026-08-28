// Universal Client-Side PDF Resume Parser Utility (Hybrid Text + Multimodal Vision Engine)
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
  softSkills?: string[];
  languages?: (string | { id?: string; name?: string; proficiency?: string })[];
  projects?: any[];
  workExperiences: WorkExperienceItem[];
  education: EducationItem[];
  rawText?: string;
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const METADATA_BLACKLIST = /^(react-pdf|pdfkit|latex|ghostscript|adobe|wkhtmltopdf|canvas|tcpdf|fpdf|itext|creator|producer|title|author|subject|keywords|template|stockholm|untitled|document|page|font|devicergb|devicecmyk|identity-h|cidfont|xobject)$/i;

const JOB_TITLE_KEYWORDS = /\b(associate|engineer|developer|manager|director|officer|specialist|consultant|analyst|assistant|lead|coordinator|architect|designer|intern|technician|supervisor|executive|representative|administrator|operator|worker|laborer)\b/i;

const DOMAIN_SKILLS = [
  'Picking', 'Packing', 'Warehouse Operations', 'Inventory Management', 'Logistics', 'Supply Chain',
  'Sanitation', 'Cleaning Equipment', 'Mathematics', 'Deep Sanitation Practices', 'Kaizen', '5S', 'Kanban',
  'Customer Service', 'Sales', 'Management', 'Strategy', 'Communication', 'Problem Solving', 'Leadership',
  'React', 'React Native', 'TypeScript', 'JavaScript', 'Node.js', 'Express', 'Python', 'Java', 'C++',
  'SQL', 'MongoDB', 'PostgreSQL', 'Docker', 'AWS', 'Git', 'Figma', 'UI/UX', 'HTML', 'CSS', 'Redux'
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

function extractAllTextFromPdfBytes(base64Input: string): string {
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
    if (streamBytes.length > 10) {
      try {
        const decompressed = pako.inflate(streamBytes);
        const decompressedText = new TextDecoder('utf-8', { fatal: false }).decode(decompressed);

        // A. Extract parenthesized text strings (Jason) or (Amazon Associate)
        const parenRegex = /\(([^()]{1,200})\)/g;
        let match;
        while ((match = parenRegex.exec(decompressedText)) !== null) {
          const text = match[1].replace(/\\([()])/g, '$1').trim();
          if (text.length >= 1 && !text.startsWith('/') && !text.startsWith('%') && !METADATA_BLACKLIST.test(text)) {
            textParts.push(text);
          }
        }

        // B. Extract readable ASCII words from decompressed stream
        const asciiWords = decompressedText.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b|\b[A-Za-z]{2,25}\b/g);
        if (asciiWords) {
          const printableLine = asciiWords.filter(w => !METADATA_BLACKLIST.test(w)).join(' ');
          if (printableLine.length > 5) textParts.push(printableLine);
        }
      } catch (inflateErr) {}
    }

    index = streamEnd + 9;
  }

  // 2. Extract literal strings from ASCII trailer metadata (emails / URLs / contacts)
  let asciiFull = '';
  for (let i = 0; i < bytes.length; i++) {
    const code = bytes[i];
    if ((code >= 32 && code <= 126) || code === 10 || code === 13) {
      asciiFull += String.fromCharCode(code);
    }
  }

  const rawEmails = asciiFull.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
  if (rawEmails) textParts.push(...rawEmails);

  const rawPhones = asciiFull.match(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g);
  if (rawPhones) textParts.push(...rawPhones);

  // Filter out any leftover stream commands, numbers-only IDs, or empty items
  const cleanLines = textParts
    .map(t => t.trim())
    .filter(t => {
      if (t.length < 1) return false;
      if (/^\d{5,15}$/.test(t)) return false;
      if (METADATA_BLACKLIST.test(t)) return false;
      return true;
    });

  return Array.from(new Set(cleanLines)).join('\n');
}

/**
 * Step 2: Extraction Quality Detection Engine
 */
export function isReliablePdfText(text: string): { isReliable: boolean; readableRatio: number; garbageRatio: number; reason: string } {
  if (!text || text.trim().length < 30) {
    return { isReliable: false, readableRatio: 0, garbageRatio: 1.0, reason: 'Text length too short (< 30 chars)' };
  }

  const totalChars = text.length;
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const readableWords = words.filter(w => /^[a-zA-Z]{2,25}$/.test(w));
  const readableRatio = words.length > 0 ? readableWords.length / words.length : 0;

  const garbageMatches = text.match(/[\{\}\[\]\~\/\\^\|\*%`\x00-\x08\x0B-\x1F\x7F-\x9F]/g) || [];
  const garbageRatio = garbageMatches.length / Math.max(totalChars, 1);

  const numericIdMatches = text.match(/\b0000\d{4,8}\b/g) || [];
  const numericIdRatio = numericIdMatches.length / Math.max(words.length, 1);

  const keywordMatches = text.match(/\b(experience|education|skills|profile|employment|history|university|college|associate|manager|developer|engineer|january|february|march|april|may|june|july|august|september|october|november|december|phone|email|location|united|states)\b/gi) || [];
  const keywordScore = keywordMatches.length;

  const corruptedGlyphs = text.match(/\b[A-Z]\s+[a-z]{3,4}\s+\\\s+e\s+R\*/g) || [];

  let isReliable = true;
  let reason = 'GOOD quality text';

  if (garbageRatio > 0.15) {
    isReliable = false;
    reason = `High garbage symbol ratio (${(garbageRatio * 100).toFixed(1)}%)`;
  } else if (readableRatio < 0.35) {
    isReliable = false;
    reason = `Low readable word ratio (${(readableRatio * 100).toFixed(1)}%)`;
  } else if (numericIdRatio > 0.08) {
    isReliable = false;
    reason = `Excessive numeric ID strings (${numericIdMatches.length} IDs detected)`;
  } else if (keywordScore < 2) {
    isReliable = false;
    reason = `Low natural language resume keyword score (${keywordScore} keywords)`;
  } else if (corruptedGlyphs.length > 0) {
    isReliable = false;
    reason = `Corrupted PDF glyph stream detected (${corruptedGlyphs.length} glyph artifacts)`;
  }

  return { isReliable, readableRatio, garbageRatio, reason };
}

/**
 * Step 7: Output Validation & Hallucination Repair
 */
export function validateAndRepairParsedProfile(parsed: ParsedProfile): ParsedProfile {
  const repaired: ParsedProfile = { ...parsed };

  // 1. Email Validation
  if (repaired.email) {
    const match = repaired.email.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    repaired.email = match ? match[1].toLowerCase() : undefined;
  }

  // 2. Portfolio URL Validation - Reject emails converted to URLs or template links
  if (repaired.portfolioUrl) {
    const p = repaired.portfolioUrl.toLowerCase();
    if (p.includes('@') || p.includes('email.com') || p.includes('resume.io') || p.includes('stockholm') || p.includes('template') || p.includes('linkedin.com')) {
      repaired.portfolioUrl = undefined;
    }
  }

  // 3. LinkedIn URL Validation - Reject generic linkedin.com without candidate username
  if (repaired.linkedinUrl) {
    const l = repaired.linkedinUrl.toLowerCase();
    if (!l.includes('linkedin.com/in/') || l.endsWith('linkedin.com/') || l.endsWith('linkedin.com')) {
      repaired.linkedinUrl = undefined;
    }
  }

  // 4. Phone Validation & Fallback Extraction
  if (repaired.phone) {
    const ph = String(repaired.phone).trim();
    if (/^0+$/.test(ph) || /^0000/.test(ph) || ph.length < 7 || ph.length > 20) {
      repaired.phone = undefined;
    }
  }

  if (!repaired.phone && repaired.rawText) {
    const phoneMatch = repaired.rawText.match(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/) ||
                       repaired.rawText.match(/\b\d{10}\b/);
    if (phoneMatch) {
      repaired.phone = phoneMatch[0].trim();
    }
  }

  // 5. Full Name Validation - Reject metadata or job titles as name
  if (repaired.fullName) {
    const f = repaired.fullName.trim();
    if (METADATA_BLACKLIST.test(f) || JOB_TITLE_KEYWORDS.test(f) || f.length < 3 || /^\d+$/.test(f) || f.includes('GI X G Y')) {
      repaired.fullName = undefined;
      repaired.firstName = undefined;
      repaired.lastName = undefined;
    } else {
      const parts = f.split(/\s+/);
      repaired.firstName = parts[0];
      repaired.lastName = parts.slice(1).join(' ');
    }
  }

  // 6. Deduplicate Skills
  if (Array.isArray(repaired.skills)) {
    const uniqueSkills = new Set<string>();
    for (const skill of repaired.skills) {
      if (typeof skill === 'string' && skill.trim().length > 1) {
        uniqueSkills.add(skill.trim());
      }
    }
    repaired.skills = Array.from(uniqueSkills);
  } else {
    repaired.skills = [];
  }

  if (!Array.isArray(repaired.workExperiences)) repaired.workExperiences = [];
  if (!Array.isArray(repaired.education)) repaired.education = [];

  return repaired;
}

export async function parsePdfResumeText(rawInput: string, fileName = 'resume.pdf'): Promise<ParsedProfile> {
  console.log(`\n===============================================================`);
  console.log(`📄 🚀 [PDF PARSER DEEP SEARCH] Starting extraction for: ${fileName}`);
  console.log(`===============================================================`);
  console.log(`[PDF PARSER LOG 1] Raw Input Base64 Length: ${rawInput ? rawInput.length : 0}`);

  const cleanText = extractAllTextFromPdfBytes(rawInput);
  const cleanBase64 = rawInput.replace(/^data:application\/pdf;base64,/, '');

  console.log(`[PDF PARSER LOG 2] Clean Text Extracted Length: ${cleanText.length} characters`);
  console.log(`[PDF PARSER LOG 3] Extracted Text Snippet:\n"${cleanText.substring(0, 300).replace(/\n/g, ' ')}..."`);

  // Step 2 & 3: Extraction Quality Detection & Logging
  const quality = isReliablePdfText(cleanText);
  console.log(`[PDF PARSER LOG 4] Quality Metrics:`, JSON.stringify(quality));
  console.log(`[PDF PARSER LOG 5] Gemini API Key configured: ${!!GEMINI_API_KEY}`);

  const jsonSchemaPrompt = `
{
  "fullName": "Full Candidate Name",
  "firstName": "First Name",
  "lastName": "Last Name",
  "email": "candidate@example.com",
  "phone": "Phone Number",
  "location": "City, State or Country",
  "linkedinUrl": null,
  "portfolioUrl": null,
  "targetRole": "Candidate Title or Primary Role",
  "experienceYears": 5,
  "experienceLevel": "Entry-level | 1-3 years | 3+ years | 5+ years | 7+ years",
  "skills": ["Skill 1", "Skill 2"],
  "softSkills": ["Communication", "Problem Solving"],
  "languages": ["English", "Spanish"],
  "projects": [
    {
      "name": "Project Title",
      "role": "Role",
      "description": "Summary of project",
      "technologies": ["Tech 1"],
      "link": "https://..."
    }
  ],
  "workExperiences": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "Location",
      "dates": "Date Range",
      "description": "Responsibilities and accomplishments"
    }
  ],
  "education": [
    {
      "degree": "Degree / Certificate Name",
      "school": "Institution Name",
      "location": "Location",
      "year": "Dates / Graduation Year"
    }
  ]
}
`.trim();

  // Strategy 1: VISION Multimodal PDF Parsing
  if (GEMINI_API_KEY) {
    console.log(`[PDF PARSER LOG 6] Invoking Gemini Multimodal PDF Vision Parser...`);
    try {
      const visionPromptText = `
You are an expert AI Resume Vision Parser. Visually inspect all pages of this candidate's resume PDF document and extract all structured profile details into JSON matching this exact schema:

${jsonSchemaPrompt}

CRITICAL VISION PARSING RULES:
1. READ THE RESUME VISUALLY: Read visible headings, candidate name, contact details, experiences, and skills directly from page layout.
2. IGNORE TEMPLATE BRANDING & METADATA: Ignore template names (e.g. Stockholm), decorative text, builder branding (e.g. "Build this template", "Resume Templates"), page numbers, or background icons.
3. DO NOT INVENT OR GUESS DATA: Only extract information actually visible in the resume document. If a field is missing, set it to null or empty array [].
4. EMAILS ARE NOT URLS: Never convert an email like email@email.com into https://email.com. Keep email in "email" field, and set portfolioUrl to null unless a real candidate website/portfolio URL is visible.
5. NO GENERIC TEMPLATE LINKS: Ignore generic links like https://www.linkedin.com/ unless it is the candidate's personal profile link.
6. NO CONFUSING FIELD CATEGORIES: Do NOT treat "Place of birth" as current candidate location. Do NOT treat "Driving license" as phone number. Do NOT treat hobbies as skills.
7. MULTI-PAGE RESUMES: Treat all pages as one continuous candidate resume. Keep separate work experience items and education items intact.
8. OUTPUT FORMAT: Return ONLY valid JSON matching the schema without markdown formatting.
`.trim();

      const visionPayload = {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: cleanBase64
                }
              },
              {
                text: visionPromptText
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      };

      const modelNames = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];
      let visionRes: Response | null = null;

      for (const model of modelNames) {
        try {
          console.log(`[PDF PARSER LOG 7] Trying Gemini Vision Endpoint for model: ${model}`);
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(visionPayload)
            }
          );
          if (res.ok) {
            console.log(`[PDF PARSER LOG 8] Gemini Vision Endpoint HTTP SUCCESS 200 for model ${model}!`);
            visionRes = res;
            break;
          } else {
            const errBody = await res.text();
            console.log(`[PDF PARSER LOG 8-ERROR] Gemini Vision model ${model} HTTP ${res.status}:`, errBody);
          }
        } catch (mErr: any) {
          console.log(`[PDF PARSER LOG 8-EXC] Fetch exception for ${model}:`, mErr?.message || mErr);
        }
      }

      if (visionRes && visionRes.ok) {
        const resData = await visionRes.json();
        const candidateText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("===== RAW GEMINI VISION RESPONSE =====");
        console.log(candidateText || JSON.stringify(resData, null, 2));
        console.log("===== END GEMINI VISION RESPONSE =====");

        if (candidateText) {
          const cleanJsonStr = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
          const aiParsed = JSON.parse(cleanJsonStr);
          const validated = validateAndRepairParsedProfile(aiParsed);
          console.log('✨ 🤖 [GEMINI VISION SUCCESS] Successfully extracted candidate profile via Gemini Vision!');
          return validated;
        }
      }
    } catch (visionErr: any) {
      console.log('[PDF PARSER LOG ERROR] Vision request error:', visionErr?.message || visionErr);
    }
  }

  // Strategy 2: TEXT Gemini AI Parsing (if text extraction is GOOD)
  if (quality.isReliable && cleanText.trim().length > 10 && GEMINI_API_KEY) {
    try {
      const textPromptText = `
You are an expert AI Resume Parser. Analyze the following raw text extracted from a candidate's resume PDF and extract all structured profile details into JSON matching this exact schema:

${jsonSchemaPrompt}

CRITICAL INSTRUCTIONS:
- Extract real values directly from text (e.g. Jason Miller, Amazon Associate, 3868683442, email@email.com, Los Angeles, CA).
- Ignore PDF metadata, template names, or system tags.
- Return ONLY valid JSON without markdown formatting.

RESUME TEXT:
${cleanText}
`.trim();

      console.log("===== TEXT SENT TO GEMINI =====");
      console.log(textPromptText);
      console.log("===== END GEMINI INPUT =====");

      const modelNames = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];
      let aiResponse: Response | null = null;

      for (const model of modelNames) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: textPromptText }] }],
                generationConfig: {
                  temperature: 0.1,
                  responseMimeType: "application/json"
                }
              })
            }
          );
          if (res.ok) {
            aiResponse = res;
            break;
          }
        } catch (mErr) {}
      }

      if (aiResponse && aiResponse.ok) {
        const resData = await aiResponse.json();
        const candidateText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;

        console.log("===== RAW GEMINI RESPONSE =====");
        console.log(candidateText || JSON.stringify(resData, null, 2));
        console.log("===== END GEMINI RESPONSE =====");

        if (candidateText) {
          const cleanJsonStr = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
          const aiParsed = JSON.parse(cleanJsonStr);
          const validated = validateAndRepairParsedProfile(aiParsed);
          console.log('✨ 🤖 [DIRECT GEMINI AI SUCCESS] Successfully extracted candidate profile via Gemini AI!');
          return validated;
        }
      }
    } catch (directAiErr: any) {
      console.log('Direct Gemini AI request error, falling back to rule parser:', directAiErr?.message || directAiErr);
    }
  }

  // Strategy 3: Rule Parser Fallback Engine
  const lines = cleanText.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);

  let email: string | undefined = undefined;
  const emailMatch = cleanText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) email = emailMatch[1].toLowerCase();

  let phone: string | undefined = undefined;
  const phoneMatch = cleanText.match(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);
  if (phoneMatch) phone = phoneMatch[0].trim();

  let linkedinUrl: string | undefined = undefined;
  const linkedinMatch = cleanText.match(/(linkedin\.com\/in\/[a-zA-Z0-9_-]+)/i);
  if (linkedinMatch) linkedinUrl = `https://${linkedinMatch[1]}`;

  let portfolioUrl: string | undefined = undefined;
  const siteMatch = cleanText.match(/(https?:\/\/)?([a-zA-Z0-9_-]+\.(?:io|me|dev|com|app))/i);
  if (siteMatch && !siteMatch[2].includes('linkedin') && !siteMatch[2].includes('google')) {
    portfolioUrl = siteMatch[0].startsWith('http') ? siteMatch[0] : `https://${siteMatch[2]}`;
  }

  let location: string | undefined = undefined;
  const locMatch = cleanText.match(/\b([A-Za-z\s]+,\s*[A-Z]{2}(?:\s+\d{5})?)\b/i) ||
                    cleanText.match(/\b([A-Z][a-zA-Z\s]+,\s*(?:Turkey|France|UAE|Dubai|United States|USA|UK|Canada|Germany|Iran|Spain|Italy|Remote))\b/i);
  if (locMatch) location = locMatch[1].trim();

  let fullName: string | undefined = undefined;
  let targetRole: string | undefined = undefined;

  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i];
    if (METADATA_BLACKLIST.test(line)) continue;

    if (!line.includes('@') && !line.includes('http') && !line.includes('www') && !/\d/.test(line) && !line.startsWith('%') && !line.startsWith('/')) {
      if (!/resume|curriculum|vitae|page|profile|work|experience|skills|education|contact|details|employment|history|links|hobbies|languages|courses|identity/i.test(line)) {
        if (JOB_TITLE_KEYWORDS.test(line)) {
          if (!targetRole) targetRole = line.trim();
        } else if (!fullName && (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(line) || /^[A-Za-z\s.'-]{3,35}$/.test(line))) {
          fullName = line.trim();
        }
      }
    }
  }

  if ((!fullName || METADATA_BLACKLIST.test(fullName) || JOB_TITLE_KEYWORDS.test(fullName)) && email) {
    const handle = email.split('@')[0];
    const namePart = handle.replace(/[^a-zA-Z]/g, ' ').trim();
    if (namePart.length >= 3 && !JOB_TITLE_KEYWORDS.test(namePart)) {
      const parts = namePart.split(/\s+/).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
      fullName = parts.join(' ');
    }
  }

  const firstName = fullName ? fullName.split(' ')[0] : undefined;
  const lastName = fullName ? fullName.split(' ').slice(1).join(' ') : undefined;

  const foundSkills = new Set<string>();
  for (const skill of DOMAIN_SKILLS) {
    const esc = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9])${esc}(?:$|[^a-zA-Z0-9])`, 'i');
    if (regex.test(cleanText)) {
      foundSkills.add(skill);
    }
  }

  const workExperiences: WorkExperienceItem[] = [];
  const expMatch = cleanText.match(/(?:employment\s+history|work\s+experience|experience)([\s\S]*?)(?:education|skills|certifications|courses|achievements|$)/i);
  if (expMatch) {
    const expLines = expMatch[1].split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);
    let currentItem: WorkExperienceItem | null = null;
    for (const eline of expLines) {
      if (eline.length >= 5 && eline.length <= 70 && !eline.startsWith('•') && !eline.startsWith('-')) {
        if (currentItem && currentItem.title) workExperiences.push(currentItem);
        currentItem = {
          title: eline,
          company: eline.includes('at ') ? eline.split('at ')[1] : '',
          dates: '',
          description: ''
        };
      } else if (currentItem) {
        currentItem.description += (currentItem.description ? ' ' : '') + eline;
      }
    }
    if (currentItem && currentItem.title) workExperiences.push(currentItem);
  }

  const educationList: EducationItem[] = [];
  const eduMatch = cleanText.match(/(?:education|academic)([\s\S]*?)(?:courses|skills|achievements|employment|$)/i);
  if (eduMatch) {
    const eduLines = eduMatch[1].split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);
    for (const edline of eduLines) {
      if (edline.length >= 5 && (edline.includes('Degree') || edline.includes('College') || edline.includes('University') || edline.includes('Associate') || edline.includes('Bachelor') || edline.includes('Master'))) {
        educationList.push({
          degree: edline,
          school: edline.includes(',') ? edline.split(',')[1]?.trim() : '',
          year: ''
        });
      }
    }
  }

  const rawParsed: ParsedProfile = {
    fullName,
    firstName,
    lastName,
    email,
    phone,
    location,
    linkedinUrl,
    portfolioUrl,
    targetRole,
    skills: Array.from(foundSkills),
    workExperiences,
    education: educationList
  };

  return validateAndRepairParsedProfile(rawParsed);
}
