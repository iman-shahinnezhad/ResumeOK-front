// ApplyDesk Shared Dynamic Job & Resume Matching Algorithm
// Provides 100% consistent, deterministic ATS matching across Web App, Dashboard, & Chrome Extension

export interface JobMatchCalculation {
  jobMatch: number;        // Overall match score, e.g. 78 (%)
  skillsScore: number;     // Skills match score, e.g. 74 (%)
  resumeScore: number;     // Resume & readiness score, e.g. 82 (%)
  resume: number;          // Alias to resumeScore
  keywords: number;        // Alias to skillsScore
  overallScore: number;    // Alias to jobMatch
  matchedSkills: string[];
  missingSkills: string[];
}

export function calculateJobMatch(job: any, profile: any, resumes: any[] = []): JobMatchCalculation {
  if (!job) job = {};
  if (!profile) profile = {};

  const curCompLower = String(job.companyName || job.company?.name || job.company || '').toLowerCase().trim();
  const curTitleLower = String(job.title?.name || job.title || '').toLowerCase().trim();

  // If candidate already tailored a resume for this job, return the tailored ATS score
  const tailoredResume = Array.isArray(resumes) ? resumes.find(r => 
    r.isTailored && (
      (r.jobId && job.id && String(r.jobId) === String(job.id)) ||
      (curCompLower && (r.companyName || r.name || '').toLowerCase().includes(curCompLower)) ||
      (curTitleLower && (r.jobTitle || r.name || '').toLowerCase().includes(curTitleLower))
    )
  ) : null;

  if (tailoredResume) {
    const finalScore = typeof tailoredResume.score === 'number' ? tailoredResume.score : 98;
    return {
      jobMatch: finalScore,
      skillsScore: 96,
      resumeScore: finalScore,
      resume: finalScore,
      keywords: 96,
      overallScore: finalScore,
      matchedSkills: Array.isArray(tailoredResume.matchedSkills) && tailoredResume.matchedSkills.length > 0
        ? tailoredResume.matchedSkills
        : ['Core Competencies', 'Domain Expertise', 'Team Leadership', 'Project Execution'],
      missingSkills: []
    };
  }

  const jobTitle = String(job.title?.name || job.title || '').trim();
  const jobDesc = String(job.content || job.description || job.snippet || '').trim();
  const jobCompany = String(job.companyName || job.company?.name || job.company || '').trim();
  const jobLocation = String(job.location?.name || job.location || '').trim();
  const fullJobText = `${jobTitle} ${jobCompany} ${jobLocation} ${jobDesc}`.toLowerCase();
  const titleLower = jobTitle.toLowerCase();

  // 1. EXTRACT CANDIDATE PROFILE INFORMATION
  let userSkills: string[] = [];
  if (Array.isArray(profile.skills)) {
    userSkills = profile.skills.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean);
  } else if (typeof profile.skills === 'string') {
    userSkills = profile.skills.split(/[,;\n]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  }

  const userTitle = String(profile.jobTitle || profile.targetRole || profile.role || profile.title || '').toLowerCase();
  const userSummary = String(profile.summary || profile.workSummary || profile.about || '').toLowerCase();
  
  let userExpText = '';
  if (Array.isArray(profile.workExperiences)) {
    userExpText = profile.workExperiences.map((e: any) => `${e.title || e.jobTitle || e.role || ''} ${e.company || ''} ${e.description || ''}`).join(' ').toLowerCase();
  } else if (typeof profile.experience === 'string') {
    userExpText = profile.experience.toLowerCase();
  }

  const candidateFullText = `${userTitle} ${userSummary} ${userExpText} ${userSkills.join(' ')}`.toLowerCase();

  const hasResume = (Array.isArray(resumes) && resumes.length > 0) || Boolean(profile.resumeFileName || profile.resumeFile || profile.resumeBase64);

  // 2. EXTRACT RELEVANT SKILLS & KEYWORDS FOR THIS JOB
  const DOMAIN_SKILLS = [
    // Sales, Account Executive, Business Development & CRM
    'account executive', 'enterprise sales', 'b2b sales', 'b2b', 'saas', 'crm', 'salesforce', 'hubspot',
    'sales pipeline', 'quota', 'negotiation', 'lead generation', 'cold calling', 'outbound', 'inbound',
    'business development', 'account management', 'client relationship', 'customer success', 'revenue growth',
    'solution selling', 'closing', 'prospecting', 'contract negotiation', 'strategic partnerships',
    // Product & Agile
    'product management', 'product roadmapping', 'user stories', 'agile', 'scrum', 'jira', 'confluence',
    'stakeholder management', 'a/b testing', 'data analysis', 'kpis', 'okrs', 'market research', 'feature prioritization',
    // Design & UX
    'figma', 'ui design', 'ux design', 'user research', 'wireframing', 'prototyping', 'design systems',
    'user testing', 'interaction design', 'sketch', 'adobe xd', 'information architecture', 'visual design',
    // Software Engineering & Tech
    'react', 'react native', 'javascript', 'typescript', 'next.js', 'node.js', 'python', 'java', 'c++', 'c#',
    'go', 'rust', 'sql', 'postgresql', 'mongodb', 'mysql', 'redis', 'graphql', 'rest api', 'aws', 'docker',
    'kubernetes', 'ci/cd', 'git', 'microservices', 'cloud computing', 'html', 'css', 'tailwind',
    // Finance, Operations & HR
    'financial modeling', 'budgeting', 'forecasting', 'accounting', 'excel', 'powerbi', 'tableau',
    'operations management', 'talent acquisition', 'recruiting', 'onboarding', 'project management'
  ];

  // Dynamically find skills required by this specific job
  const requiredSkills: string[] = [];
  DOMAIN_SKILLS.forEach(skill => {
    if (fullJobText.includes(skill)) {
      requiredSkills.push(skill);
    }
  });

  // Extract important nouns/keywords from job title itself
  const stopWords = new Set(['the', 'and', 'for', 'with', 'you', 'are', 'this', 'that', 'from', 'our', 'will', 'have', 'your', 'about', 'axon', 'finance']);
  const titleTokens = titleLower.replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  titleTokens.forEach(token => {
    if (!requiredSkills.includes(token) && token.length > 3) {
      requiredSkills.push(token);
    }
  });

  // Fallback skills if none extracted
  if (requiredSkills.length === 0) {
    if (titleLower.includes('design') || titleLower.includes('ui') || titleLower.includes('ux')) {
      requiredSkills.push('figma', 'ui design', 'ux design', 'design systems', 'wireframing');
    } else if (titleLower.includes('sales') || titleLower.includes('account') || titleLower.includes('business')) {
      requiredSkills.push('enterprise sales', 'b2b', 'crm', 'negotiation', 'lead generation');
    } else if (titleLower.includes('engineer') || titleLower.includes('developer') || titleLower.includes('software')) {
      requiredSkills.push('react', 'typescript', 'javascript', 'node.js', 'git');
    } else if (titleLower.includes('product')) {
      requiredSkills.push('product management', 'agile', 'jira', 'roadmapping', 'user stories');
    } else {
      requiredSkills.push('project management', 'communication', 'team collaboration', 'problem solving');
    }
  }

  // Match candidate skills against job requirements
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  requiredSkills.forEach(req => {
    const isMatched = userSkills.some(s => s.includes(req) || req.includes(s)) || candidateFullText.includes(req);
    if (isMatched) {
      matchedSkills.push(req);
    } else {
      missingSkills.push(req);
    }
  });

  // 3. TITLE & FUNCTION TRACK COMPATIBILITY (0 - 100)
  const SALES_TERMS = ['sales', 'account executive', 'business development', 'bdr', 'sdr', 'account manager', 'revenue', 'commercial', 'productivity'];
  const DESIGN_TERMS = ['designer', 'design', 'ui', 'ux', 'product designer', 'visual', 'creative'];
  const DEV_TERMS = ['engineer', 'developer', 'frontend', 'backend', 'fullstack', 'software', 'architect'];
  const PRODUCT_TERMS = ['product manager', 'product management', 'product owner', 'pm'];

  const isJobSales = SALES_TERMS.some(t => titleLower.includes(t));
  const isJobDesign = DESIGN_TERMS.some(t => titleLower.includes(t));
  const isJobDev = DEV_TERMS.some(t => titleLower.includes(t));
  const isJobProduct = PRODUCT_TERMS.some(t => titleLower.includes(t));

  const isUserSales = SALES_TERMS.some(t => userTitle.includes(t)) || userSkills.some(s => SALES_TERMS.some(t => s.includes(t)));
  const isUserDesign = DESIGN_TERMS.some(t => userTitle.includes(t)) || userSkills.some(s => DESIGN_TERMS.some(t => s.includes(t)));
  const isUserDev = DEV_TERMS.some(t => userTitle.includes(t)) || userSkills.some(s => DEV_TERMS.some(t => s.includes(t)));
  const isUserProduct = PRODUCT_TERMS.some(t => userTitle.includes(t)) || userSkills.some(s => PRODUCT_TERMS.some(t => s.includes(t)));

  let roleScore = 50; // Neutral default if not enough info

  if (isJobSales && isUserSales) roleScore = 92;
  else if (isJobDesign && isUserDesign) roleScore = 92;
  else if (isJobDev && isUserDev) roleScore = 92;
  else if (isJobProduct && isUserProduct) roleScore = 92;
  else if ((isJobSales && !isUserSales) || (isJobDesign && !isUserDesign) || (isJobDev && !isUserDev)) {
    // Cross-domain mismatch (e.g. Designer applying to Sales Account Executive)
    roleScore = 30;
  }

  // Check direct title keyword token overlap
  if (titleTokens.length > 0) {
    let tokenMatches = 0;
    titleTokens.forEach(tok => {
      if (candidateFullText.includes(tok)) tokenMatches++;
    });
    const tokenOverlapRatio = tokenMatches / titleTokens.length;
    roleScore = Math.round(roleScore * 0.7 + (tokenOverlapRatio * 100) * 0.3);
  }

  // 4. SKILLS SCORE (0 - 100)
  const totalReq = Math.max(1, requiredSkills.length);
  const skillsRatio = matchedSkills.length / totalReq;
  let skillsScore = Math.round(skillsRatio * 100);
  skillsScore = Math.max(25, Math.min(94, skillsScore));

  // 5. RESUME CONTENT & ATS QUALITY SCORE (0 - 100)
  // Calculates candidate resume's completeness, content depth, and professional structure
  let resumeQuality = 0;

  // Attached resume document (25 pts)
  if (hasResume) {
    resumeQuality += 25;
  }

  // Profile Identity & Contact info (20 pts)
  if (profile.firstName && profile.lastName) resumeQuality += 8;
  else if (profile.firstName || profile.name) resumeQuality += 5;
  if (profile.email) resumeQuality += 6;
  if (profile.phone) resumeQuality += 3;
  if (profile.city || profile.location) resumeQuality += 3;

  // Professional Summary (15 pts)
  if (userSummary.length > 120) resumeQuality += 15;
  else if (userSummary.length > 40) resumeQuality += 10;
  else if (userSummary.length > 0) resumeQuality += 5;

  // Work Experience Evidence (25 pts)
  const workExps = Array.isArray(profile.workExperiences) ? profile.workExperiences : [];
  if (workExps.length >= 2) resumeQuality += 20;
  else if (workExps.length === 1) resumeQuality += 14;
  else if (userExpText.length > 50) resumeQuality += 10;

  const hasDetailedDesc = workExps.some((e: any) => (e.description || e.workSummary || '').length > 40);
  if (hasDetailedDesc) resumeQuality += 5;

  // Skills & Technical Proficiencies (15 pts)
  if (userSkills.length >= 8) resumeQuality += 15;
  else if (userSkills.length >= 4) resumeQuality += 10;
  else if (userSkills.length >= 1) resumeQuality += 6;

  if (!hasResume) {
    resumeQuality = Math.min(30, resumeQuality);
  } else {
    resumeQuality = Math.max(35, Math.min(94, resumeQuality));
  }

  // If no job details provided, return candidate's standalone ATS resume quality score
  if (!jobTitle && !jobDesc) {
    return {
      jobMatch: resumeQuality,
      skillsScore: userSkills.length >= 5 ? 85 : (userSkills.length > 0 ? 60 : 30),
      resumeScore: resumeQuality,
      resume: resumeQuality,
      keywords: userSkills.length >= 5 ? 85 : (userSkills.length > 0 ? 60 : 30),
      overallScore: resumeQuality,
      matchedSkills: userSkills.slice(0, 8).map(s => s.charAt(0).toUpperCase() + s.slice(1)),
      missingSkills: ['Target Role Keywords', 'Quantifiable Metrics', 'ATS Formatting']
    };
  }

  // 6. OVERALL JOB MATCH (Industry standard weighted ATS formula)
  // 45% Skills Alignment + 35% Role Track Fit + 20% Resume Quality
  let rawJobMatch = Math.round((skillsScore * 0.45) + (roleScore * 0.35) + (resumeQuality * 0.20));
  const jobMatch = Math.max(25, Math.min(95, rawJobMatch));

  return {
    jobMatch,
    skillsScore,
    resumeScore: resumeQuality,
    resume: resumeQuality,
    keywords: skillsScore,
    overallScore: jobMatch,
    matchedSkills: matchedSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
    missingSkills: missingSkills.slice(0, 8).map(s => s.charAt(0).toUpperCase() + s.slice(1))
  };
}
