export interface JobScores {
  jobMatch: number;   // 10% – 98% (Professional suitability)
  resume: number;     // 0% – 98% (Strict current resume targeting & evidence)
  keywords: number;   // 10% – 60% (Weighted keyword coverage)
}

export interface JobMatchResult extends JobScores {
  // Legacy alias compatibility
  overallScore: number;    // Alias to jobMatch
  expLevelScore: number;   // Subfactor experience score
  skillsScore: number;     // Alias to keywords
  industryScore: number;   // Subfactor industry relevance
  matchedSkills: string[];
  missingSkills: string[];
}

export type KeywordCategory = "skill" | "tool" | "technology" | "role" | "industry" | "workflow";

interface JobKeyword {
  name: string;
  category: KeywordCategory;
  importance: "critical" | "high" | "medium" | "low";
  weight: number;
}

const KEYWORD_WEIGHTS = {
  critical: 5,
  high: 3,
  medium: 2,
  low: 1,
};

const SYNONYM_MAP: Record<string, string> = {
  'ui/ux': 'User Experience Design',
  'ui design': 'User Experience Design',
  'ux design': 'User Experience Design',
  'product design': 'Product Designer',
  'wireframing': 'Wireframes',
  'wireframe': 'Wireframes',
  'prototype': 'Prototyping',
  'prototyping': 'Prototyping',
  'react native': 'React Native',
  'react': 'React',
  'node': 'Node.js',
  'nodejs': 'Node.js',
  'ts': 'TypeScript',
  'js': 'JavaScript',
};

const SKILL_CATALOG: { name: string; category: KeywordCategory; defaultImportance: "critical" | "high" | "medium" | "low" }[] = [
  // Core Engineering & Tech
  { name: 'React', category: 'technology', defaultImportance: 'high' },
  { name: 'React Native', category: 'technology', defaultImportance: 'critical' },
  { name: 'JavaScript', category: 'technology', defaultImportance: 'high' },
  { name: 'TypeScript', category: 'technology', defaultImportance: 'high' },
  { name: 'Node.js', category: 'technology', defaultImportance: 'high' },
  { name: 'Python', category: 'technology', defaultImportance: 'high' },
  { name: 'Java', category: 'technology', defaultImportance: 'medium' },
  { name: 'C++', category: 'technology', defaultImportance: 'medium' },
  { name: 'SQL', category: 'technology', defaultImportance: 'medium' },
  { name: 'PostgreSQL', category: 'technology', defaultImportance: 'medium' },
  { name: 'MongoDB', category: 'technology', defaultImportance: 'medium' },
  { name: 'Docker', category: 'tool', defaultImportance: 'medium' },
  { name: 'Kubernetes', category: 'tool', defaultImportance: 'high' },
  { name: 'AWS', category: 'technology', defaultImportance: 'high' },
  { name: 'Git', category: 'tool', defaultImportance: 'low' },
  { name: 'System Design', category: 'workflow', defaultImportance: 'critical' },
  
  // UI/UX & Design
  { name: 'User Experience Design', category: 'skill', defaultImportance: 'critical' },
  { name: 'Product Designer', category: 'role', defaultImportance: 'critical' },
  { name: 'Design Systems', category: 'workflow', defaultImportance: 'critical' },
  { name: 'Figma', category: 'tool', defaultImportance: 'medium' },
  { name: 'Wireframes', category: 'workflow', defaultImportance: 'medium' },
  { name: 'Prototyping', category: 'workflow', defaultImportance: 'medium' },
  { name: 'User Research', category: 'workflow', defaultImportance: 'high' },
  { name: 'Usability Testing', category: 'workflow', defaultImportance: 'medium' },
  
  // Product & Agile
  { name: 'Product Management', category: 'role', defaultImportance: 'critical' },
  { name: 'Agile', category: 'workflow', defaultImportance: 'low' },
  { name: 'Scrum', category: 'workflow', defaultImportance: 'low' },
  { name: 'Jira', category: 'tool', defaultImportance: 'low' },
  { name: 'Roadmap', category: 'workflow', defaultImportance: 'medium' },
  
  // Soft & Domain Skills
  { name: 'Leadership', category: 'skill', defaultImportance: 'low' },
  { name: 'Team Collaboration', category: 'skill', defaultImportance: 'low' }
];

function normalizeKeyword(str: string): string {
  const clean = str.toLowerCase().trim();
  return SYNONYM_MAP[clean] || str.trim();
}

function matchesKeyword(userStr: string, requiredStr: string): boolean {
  const u = normalizeKeyword(userStr).toLowerCase();
  const r = normalizeKeyword(requiredStr).toLowerCase();
  if (u === r) return true;
  if (u.includes(r) || r.includes(u)) return true;

  const uTokens = u.split(/[\s/&-]+/);
  const rTokens = r.split(/[\s/&-]+/);
  const common = uTokens.filter(t => t.length > 2 && rTokens.includes(t));
  return common.length > 0 && common.some(t => !['design', 'development', 'systems', 'management'].includes(t));
}

const matchCache = new Map<string, JobMatchResult>();

export function calculateJobMatch(jobContent: string, jobTitle: string, userProfile: any): JobMatchResult {
  const cacheKey = `${jobContent.length}_${jobTitle}_${userProfile?.skills?.length || 0}_${userProfile?.experience || ''}`;
  if (matchCache.has(cacheKey)) {
    return matchCache.get(cacheKey)!;
  }

  const contentLower = (jobContent + ' ' + jobTitle).toLowerCase();
  const titleLower = (jobTitle || '').toLowerCase();

  // Extract candidate profile details
  const userSkills: string[] = Array.isArray(userProfile?.skills) ? userProfile.skills : [];
  const userInterests: string[] = Array.isArray(userProfile?.interests) ? userProfile.interests : [];
  const userSoftSkills: string[] = Array.isArray(userProfile?.softSkills) ? userProfile.softSkills : [];
  const userRoles: string[] = Array.isArray(userProfile?.roles) ? userProfile.roles : [];
  const extraRoles = [userProfile?.jobTitle, userProfile?.role, userProfile?.title].filter(Boolean) as string[];

  const allCandidateKeywords = [...userSkills, ...userInterests, ...userSoftSkills, ...userRoles, ...extraRoles]
    .map(s => s.trim())
    .filter(Boolean);
  const userExpStr = (userProfile?.experience || '').toLowerCase();

  const hasProfileData = Boolean(userExpStr || allCandidateKeywords.length > 0 || userProfile?.resumeFile || userProfile?.title || userProfile?.jobTitle || userProfile?.role);

  if (!userProfile || !hasProfileData) {
    return {
      jobMatch: 10,
      resume: 0,
      keywords: 10,
      overallScore: 10,
      expLevelScore: 0,
      skillsScore: 10,
      industryScore: 0,
      matchedSkills: [],
      missingSkills: [],
    };
  }

  // 1. EXTRACT & CLASSIFY KEYWORDS FROM JOB DESCRIPTION
  const requiredKeywords: JobKeyword[] = [];
  SKILL_CATALOG.forEach(item => {
    if (contentLower.includes(item.name.toLowerCase())) {
      let imp = item.defaultImportance;
      // Mark as critical if present in job title
      if (titleLower.includes(item.name.toLowerCase())) {
        imp = 'critical';
      }
      requiredKeywords.push({
        name: item.name,
        category: item.category,
        importance: imp,
        weight: KEYWORD_WEIGHTS[imp]
      });
    }
  });

  if (requiredKeywords.length === 0) {
    if (titleLower.includes('design') || titleLower.includes('ui') || titleLower.includes('ux')) {
      requiredKeywords.push(
        { name: 'User Experience Design', category: 'skill', importance: 'critical', weight: 5 },
        { name: 'Design Systems', category: 'workflow', importance: 'critical', weight: 5 },
        { name: 'Figma', category: 'tool', importance: 'medium', weight: 2 },
        { name: 'Wireframes', category: 'workflow', importance: 'medium', weight: 2 }
      );
    } else {
      requiredKeywords.push(
        { name: 'React', category: 'technology', importance: 'high', weight: 3 },
        { name: 'JavaScript', category: 'technology', importance: 'high', weight: 3 },
        { name: 'TypeScript', category: 'technology', importance: 'high', weight: 3 },
        { name: 'Team Collaboration', category: 'skill', importance: 'low', weight: 1 }
      );
    }
  }

  // 2. KEYWORDS SCORE (Weighted coverage, clamped 10% - 60%)
  let sumOfMatchedKeywordWeights = 0;
  let sumOfAllRequiredKeywordWeights = 0;
  const matchedSkillsSet = new Set<string>();
  const missingSkillsSet = new Set<string>();
  let numberOfCriticalMissingRequirements = 0;

  requiredKeywords.forEach(req => {
    sumOfAllRequiredKeywordWeights += req.weight;
    const isMatched = allCandidateKeywords.some(uSkill => matchesKeyword(uSkill, req.name));

    if (isMatched) {
      sumOfMatchedKeywordWeights += req.weight;
      matchedSkillsSet.add(req.name);
    } else {
      missingSkillsSet.add(req.name);
      if (req.importance === 'critical') {
        numberOfCriticalMissingRequirements++;
      }
    }
  });

  const rawKeywordsCoverage = sumOfAllRequiredKeywordWeights > 0
    ? (sumOfMatchedKeywordWeights / sumOfAllRequiredKeywordWeights) * 100
    : 30;

  // Clamped between 10% and 60% per developer spec
  const keywordsScore = Math.max(10, Math.min(60, Math.round(rawKeywordsCoverage)));

  // 3. EXPERIENCE SCORE (0 - 100%)
  let experienceScore = 65;
  const isSeniorJob = titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('principal') || titleLower.includes('sr') || contentLower.includes('5+ years') || contentLower.includes('5 years');
  const isMidJob = titleLower.includes('mid') || contentLower.includes('3+ years') || contentLower.includes('3-5 years');
  const isJuniorJob = titleLower.includes('junior') || titleLower.includes('intern') || titleLower.includes('associate') || contentLower.includes('1-2 years');

  if (userExpStr) {
    if (userExpStr.includes('5+')) {
      experienceScore = isSeniorJob ? 95 : (isMidJob ? 85 : 60);
    } else if (userExpStr.includes('3-5')) {
      experienceScore = isSeniorJob ? 70 : (isMidJob ? 95 : 75);
    } else if (userExpStr.includes('1-3')) {
      experienceScore = isSeniorJob ? 40 : (isJuniorJob ? 95 : 70);
    } else if (userExpStr.includes('0-1')) {
      experienceScore = isSeniorJob ? 20 : (isJuniorJob ? 95 : 50);
    }
  } else {
    experienceScore = isSeniorJob ? 50 : 75;
  }

  // 4. ROLE SCORE (0 - 100%, 60% weight in Job Match)
  const SENIORITY_WORDS = new Set(['senior', 'sr', 'junior', 'jr', 'lead', 'principal', 'staff', 'associate', 'intern', 'entry', 'mid', 'head', 'vp', 'director', 'manager', 'executive', 'chief', 'level', 'i', 'ii', 'iii', 'iv']);

  let roleScore = 40;
  const userRoleTitles = [...userRoles, userProfile?.jobTitle, userProfile?.role].filter(Boolean).map(r => r.toLowerCase());

  const getDomainTokens = (str: string) => str.split(/[\s/&-]+/).filter(w => w.length > 1 && !SENIORITY_WORDS.has(w));
  const jobTitleDomainTokens = getDomainTokens(titleLower);
  const userDomainTokens = userRoleTitles.flatMap(r => getDomainTokens(r));

  const DEV_KEYWORDS = ['developer', 'engineer', 'programmer', 'coder', 'frontend', 'backend', 'fullstack', 'software', 'web', 'mobile', 'ios', 'android', 'react', 'python', 'node', 'java', 'tech'];
  const DESIGN_KEYWORDS = ['designer', 'design', 'ui', 'ux', 'creative', 'illustrator', 'artist', 'animator', 'figma', 'visual'];

  const userIsDev = userDomainTokens.some(t => DEV_KEYWORDS.includes(t));
  const userIsDesign = userDomainTokens.some(t => DESIGN_KEYWORDS.includes(t));
  const jobIsDev = jobTitleDomainTokens.some(t => DEV_KEYWORDS.includes(t)) || titleLower.includes('developer') || titleLower.includes('engineer');
  const jobIsDesign = jobTitleDomainTokens.some(t => DESIGN_KEYWORDS.includes(t)) || (titleLower.includes('designer') && !titleLower.includes('design engineer'));

  if (userIsDev && jobIsDesign && !userIsDesign) {
    roleScore = 15;
  } else if (userIsDesign && jobIsDev && !userIsDev) {
    roleScore = 15;
  } else {
    const hasCoreTokenMatch = userDomainTokens.some(uToken =>
      jobTitleDomainTokens.some(jToken => uToken === jToken || (uToken.length > 3 && jToken.length > 3 && (uToken.includes(jToken) || jToken.includes(uToken))))
    );

    if (hasCoreTokenMatch) {
      roleScore = 95;
    } else if (userIsDev && jobIsDev) {
      roleScore = 85;
    } else if (userIsDesign && jobIsDesign) {
      roleScore = 85;
    } else {
      roleScore = 35;
    }
  }

  // 5. FORMULA 1: JOB MATCH SCORE (Clamped 10% - 98%)
  // jobMatchScore = keywordsScore * 0.30 + experienceScore * 0.10 + roleScore * 0.60;
  const rawJobMatch = (keywordsScore * 0.30) + (experienceScore * 0.10) + (roleScore * 0.60);
  const jobMatch = Math.max(10, Math.min(98, Math.round(rawJobMatch)));

  // 6. FORMULA 2: RESUME SCORE (Strict scoring, 0% - 98%)
  // resumeScore = requiredExperienceEvidence * 0.30 + requiredSkillsCoverage * 0.25 + industryRelevance * 0.20 + roleTitleAlignment * 0.15 + resumeContentQuality * 0.10;
  const requiredExperienceEvidence = (experienceScore * 0.40) + ((roleScore > 70 ? 90 : 50) * 0.60);
  const requiredSkillsCoverage = rawKeywordsCoverage; // 0 - 100 scale before keywords clamp
  const industryRelevance = (userIsDev && jobIsDev) || (userIsDesign && jobIsDesign) ? 90 : 40;
  const roleTitleAlignment = roleScore;
  const resumeContentQuality = userProfile?.resumeFile || userSkills.length > 5 ? 85 : 55;

  let rawResumeScore = (requiredExperienceEvidence * 0.30) +
                       (requiredSkillsCoverage * 0.25) +
                       (industryRelevance * 0.20) +
                       (roleTitleAlignment * 0.15) +
                       (resumeContentQuality * 0.10);

  // Apply Resume Penalties per spec
  if (numberOfCriticalMissingRequirements > 0) {
    rawResumeScore -= 10;
    const criticalMissingPenalty = numberOfCriticalMissingRequirements * 8;
    rawResumeScore -= criticalMissingPenalty;
  }

  // Clamped between 0% and 98% per spec
  const resumeScore = Math.max(0, Math.min(98, Math.round(rawResumeScore)));

  const matchedSkills = Array.from(matchedSkillsSet);
  const missingSkills = Array.from(missingSkillsSet).slice(0, 6);

  const result: JobMatchResult = {
    jobMatch,
    resume: resumeScore,
    keywords: keywordsScore,

    // Legacy compatibility aliases
    overallScore: jobMatch,
    expLevelScore: experienceScore,
    skillsScore: keywordsScore,
    industryScore: resumeScore,

    matchedSkills: matchedSkills.length > 0 ? matchedSkills : (userSkills.length > 0 ? userSkills : ['UI/UX Design', 'Design Systems', 'Figma']),
    missingSkills,
  };

  if (matchCache.size > 1000) {
    matchCache.clear();
  }
  matchCache.set(cacheKey, result);

  return result;
}
