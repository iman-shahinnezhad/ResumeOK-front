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

function normalizeKeyword(str: any): string {
  if (typeof str !== 'string') return '';
  const clean = str.toLowerCase().trim();
  return SYNONYM_MAP[clean] || str.trim();
}

const GENERIC_EXCLUDE_TOKENS = [
  'product', 'design', 'development', 'systems', 'management', 'manager',
  'developer', 'designer', 'engineer', 'engineering', 'lead', 'senior',
  'junior', 'head', 'chief', 'associate', 'group', 'global', 'digital', 'tech'
];

function matchesKeyword(userStr: any, requiredStr: any): boolean {
  if (typeof userStr !== 'string' || typeof requiredStr !== 'string') return false;
  const u = normalizeKeyword(userStr).toLowerCase();
  const r = normalizeKeyword(requiredStr).toLowerCase();
  if (!u || !r) return false;
  if (u === r) return true;
  if (u.includes(r) || r.includes(u)) return true;

  const uTokens = u.split(/[\s/&-]+/);
  const rTokens = r.split(/[\s/&-]+/);
  const common = uTokens.filter(t => t.length > 2 && rTokens.includes(t));
  return common.length > 0 && common.some(t => !GENERIC_EXCLUDE_TOKENS.includes(t));
}

const matchCache = new Map<string, JobMatchResult>();

export function calculateJobMatch(jobContent: string = '', jobTitle: string = '', userProfile: any = {}): JobMatchResult {
  const fallbackResult: JobMatchResult = {
    jobMatch: 35,
    resume: 35,
    keywords: 35,
    overallScore: 35,
    expLevelScore: 50,
    skillsScore: 35,
    industryScore: 35,
    matchedSkills: [],
    missingSkills: [],
  };

  try {
    const safeContent = typeof jobContent === 'string' ? jobContent : '';
    const safeTitle = typeof jobTitle === 'string' ? jobTitle : '';
    const safeProfile = userProfile && typeof userProfile === 'object' ? userProfile : {};

    const cacheKey = `${safeContent.length}_${safeTitle}_${safeProfile?.skills?.length || 0}_${safeProfile?.experience || ''}`;
    if (matchCache.has(cacheKey)) {
      return matchCache.get(cacheKey)!;
    }

    const contentLower = (safeContent + ' ' + safeTitle).toLowerCase();
    const titleLower = safeTitle.toLowerCase();

    // Extract candidate profile details safely
    const extractStringArray = (arr: any): string[] => {
      if (!Array.isArray(arr)) return [];
      return arr.filter(item => typeof item === 'string' && item.trim().length > 0);
    };

    const userSkills: string[] = extractStringArray(safeProfile?.skills);
    const userInterests: string[] = extractStringArray(safeProfile?.interests);
    const userSoftSkills: string[] = extractStringArray(safeProfile?.softSkills);
    const userRoles: string[] = extractStringArray(safeProfile?.roles);

    const rawExtraRoles = [safeProfile?.jobTitle, safeProfile?.role, safeProfile?.title, safeProfile?.targetRole];
    const extraRoles: string[] = [];
    rawExtraRoles.forEach(r => {
      if (typeof r === 'string' && r.trim()) {
        extraRoles.push(r.trim());
      } else if (r && typeof r === 'object') {
        const strVal = r.title || r.name || r.role || r.label || r.value;
        if (typeof strVal === 'string' && strVal.trim()) {
          extraRoles.push(strVal.trim());
        }
      }
    });

    const allCandidateKeywords = [...userSkills, ...userInterests, ...userSoftSkills, ...userRoles, ...extraRoles];
    const userExpStr = typeof safeProfile?.experience === 'string' ? safeProfile.experience.toLowerCase() : '';

    const hasProfileData = Boolean(userExpStr || allCandidateKeywords.length > 0 || safeProfile?.resumeFile || safeProfile?.title || safeProfile?.jobTitle || safeProfile?.role);

    if (!userProfile || !hasProfileData) {
      return {
        jobMatch: 0,
        resume: 0,
        keywords: 0,
        overallScore: 0,
        expLevelScore: 0,
        skillsScore: 0,
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

    const matchedSkillsSet = new Set<string>();
    const missingSkillsSet = new Set<string>();
    let numberOfCriticalMissingRequirements = 0;

    requiredKeywords.forEach(req => {
      const isMatched = allCandidateKeywords.some(uSkill => matchesKeyword(uSkill, req.name));
      if (isMatched) {
        matchedSkillsSet.add(req.name);
      } else {
        missingSkillsSet.add(req.name);
        if (req.importance === 'critical') {
          numberOfCriticalMissingRequirements++;
        }
      }
    });

    const matchedSkills = Array.from(matchedSkillsSet);
    const missingSkills = Array.from(missingSkillsSet).slice(0, 8);

    const totalSkillsCount = matchedSkills.length + missingSkills.length;
    const rawKeywordsCoverage = totalSkillsCount > 0
      ? (matchedSkills.length / totalSkillsCount) * 100
      : 0;

    // Clamped between 0% and 98% based directly on matched skills ratio
    const keywordsScore = Math.max(0, Math.min(98, Math.round(rawKeywordsCoverage)));

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
    const SENIORITY_WORDS = new Set(['senior', 'sr', 'junior', 'jr', 'lead', 'principal', 'staff', 'associate', 'intern', 'entry', 'mid', 'level', 'i', 'ii', 'iii', 'iv', 'v']);
    const GENERIC_MODIFIER_TOKENS = new Set([
      ...Array.from(SENIORITY_WORDS),
      'product', 'technical', 'global', 'digital', 'group', 'team', 'head', 'vp',
      'director', 'executive', 'chief'
    ]);

    let roleScore = 40;
    const userRoleTitles = [...userRoles, ...extraRoles]
      .filter(r => typeof r === 'string')
      .map(r => r.toLowerCase());

    const getCoreTokens = (str: string) => {
      if (typeof str !== 'string') return [];
      return str.split(/[\s/&-]+/).filter(w => w.length > 1 && !GENERIC_MODIFIER_TOKENS.has(w));
    };

    const jobTitleCoreTokens = getCoreTokens(titleLower);
    const userCoreTokens = userRoleTitles.flatMap(r => getCoreTokens(r));

    const DEV_KEYWORDS = ['developer', 'engineer', 'programmer', 'coder', 'frontend', 'backend', 'fullstack', 'software', 'web', 'mobile', 'ios', 'android', 'react', 'python', 'node', 'java', 'tech'];
    const DESIGN_KEYWORDS = ['designer', 'design', 'ui', 'ux', 'creative', 'illustrator', 'artist', 'animator', 'figma', 'visual', 'interaction'];

    const checkIsProductMgmt = (t: string, tokens: string[]) => {
      if (typeof t !== 'string' || !Array.isArray(tokens)) return false;
      if (t.includes('product manager') || t.includes('product management') || t.includes('product owner') || t.includes('head of product') || t.includes('group pm')) {
        return true;
      }
      if (tokens.includes('manager') && tokens.includes('product') && !tokens.includes('design') && !tokens.includes('engineering')) {
        return true;
      }
      return false;
    };

    const checkIsDesign = (t: string, tokens: string[]) => {
      if (typeof t !== 'string' || !Array.isArray(tokens)) return false;
      if (t.includes('designer') || t.includes('ui/ux') || t.includes('ux design') || t.includes('ui design') || t.includes('product design')) {
        return true;
      }
      return tokens.some(tok => typeof tok === 'string' && DESIGN_KEYWORDS.includes(tok)) && !t.includes('design engineer');
    };

    const checkIsDev = (t: string, tokens: string[]) => {
      if (typeof t !== 'string' || !Array.isArray(tokens)) return false;
      if (t.includes('developer') || t.includes('engineer') || t.includes('software') || t.includes('frontend') || t.includes('backend') || t.includes('fullstack')) {
        if (!t.includes('product manager') && !t.includes('design engineer')) return true;
      }
      return tokens.some(tok => typeof tok === 'string' && DEV_KEYWORDS.includes(tok));
    };

    const allUserTokens = userRoleTitles.flatMap(r => typeof r === 'string' ? r.split(/[\s/&-]+/) : []);
    const allJobTokens = titleLower.split(/[\s/&-]+/);

    const userIsDev = userRoleTitles.some(r => checkIsDev(r, typeof r === 'string' ? r.split(/[\s/&-]+/) : []));
    const userIsDesign = userRoleTitles.some(r => checkIsDesign(r, typeof r === 'string' ? r.split(/[\s/&-]+/) : [])) || allUserTokens.some(t => typeof t === 'string' && DESIGN_KEYWORDS.includes(t));
    const userIsProductMgmt = userRoleTitles.some(r => checkIsProductMgmt(r, typeof r === 'string' ? r.split(/[\s/&-]+/) : []));

    const jobIsDev = checkIsDev(titleLower, allJobTokens);
    const jobIsDesign = checkIsDesign(titleLower, allJobTokens);
    const jobIsProductMgmt = checkIsProductMgmt(titleLower, allJobTokens);

    if (userIsDesign && !userIsProductMgmt && jobIsProductMgmt) {
      roleScore = 15;
    } else if (userIsProductMgmt && !userIsDesign && jobIsDesign) {
      roleScore = 15;
    } else if (userIsDesign && !userIsDev && jobIsDev) {
      roleScore = 15;
    } else if (userIsDev && !userIsDesign && jobIsDesign) {
      roleScore = 15;
    } else if (userIsDev && !userIsProductMgmt && jobIsProductMgmt) {
      roleScore = 20;
    } else if (userIsProductMgmt && !userIsDev && jobIsDev) {
      roleScore = 20;
    } else {
      const hasCoreTokenMatch = userCoreTokens.some(uToken =>
        jobTitleCoreTokens.some(jToken => uToken === jToken || (uToken.length > 3 && jToken.length > 3 && (uToken.includes(jToken) || jToken.includes(uToken))))
      );

      if (hasCoreTokenMatch) {
        roleScore = 95;
      } else if (userIsDev && jobIsDev) {
        roleScore = 85;
      } else if (userIsDesign && jobIsDesign) {
        roleScore = 85;
      } else if (userIsProductMgmt && jobIsProductMgmt) {
        roleScore = 85;
      } else {
        roleScore = 35;
      }
    }

    // 5. FORMULA 1: JOB MATCH SCORE (Clamped 0% - 98%)
    const rawJobMatch = (keywordsScore * 0.30) + (experienceScore * 0.10) + (roleScore * 0.60);
    const jobMatch = Math.max(0, Math.min(98, Math.round(rawJobMatch)));

    // 6. FORMULA 2: RESUME SCORE (Strict scoring, 0% - 98%)
    const requiredExperienceEvidence = (experienceScore * 0.40) + ((roleScore > 70 ? 90 : 50) * 0.60);
    const requiredSkillsCoverage = rawKeywordsCoverage;
    const industryRelevance = (userIsDev && jobIsDev) || (userIsDesign && jobIsDesign) ? 90 : 40;
    const roleTitleAlignment = roleScore;
    const resumeContentQuality = safeProfile?.resumeFile || userSkills.length > 5 ? 85 : 55;

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

    const result: JobMatchResult = {
      jobMatch,
      resume: resumeScore,
      keywords: keywordsScore,

      // Legacy compatibility aliases
      overallScore: jobMatch,
      expLevelScore: experienceScore,
      skillsScore: keywordsScore,
      industryScore: resumeScore,

      matchedSkills,
      missingSkills,
    };

    if (matchCache.size > 1000) {
      matchCache.clear();
    }
    matchCache.set(cacheKey, result);

    return result;
  } catch (err) {
    console.warn('Error in calculateJobMatch:', err);
    return fallbackResult;
  }
}
