export interface JobMatchResult {
  overallScore: number;
  expLevelScore: number;
  skillsScore: number;
  industryScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

const SKILL_KEYWORDS = [
  // Tech / Engineering (Frontend, Backend, Mobile, Cloud, DevOps, Data Science, AI)
  'react', 'react native', 'javascript', 'typescript', 'node.js', 'python',
  'java', 'kotlin', 'swift', 'c++', 'c#', 'go', 'golang', 'ruby', 'php',
  'sql', 'postgresql', 'mongodb', 'graphql', 'rest api', 'aws', 'docker',
  'kubernetes', 'ci/cd', 'git', 'html', 'css', 'tailwind', 'redux',
  'next.js', 'express', 'system design', 'agile', 'jira', 'scrum', 'devops',
  'cloud', 'azure', 'gcp', 'mysql', 'redis', 'elasticsearch', 'rust', 'flutter',
  'vue', 'angular', 'webpack', 'babel', 'django', 'flask', 'spring boot',
  'laravel', 'testing', 'cypress', 'jest', 'selenium', 'ci/cd pipelines',
  'terraform', 'ansible', 'serverless', 'microservices', 'linux', 'unix',
  'data science', 'machine learning', 'deep learning', 'artificial intelligence',
  'nlp', 'data analysis', 'pandas', 'numpy', 'scikit-learn', 'tensorflow',
  'pytorch', 'data visualization', 'tableau', 'power bi', 'looker', 'cybersecurity',
  'security', 'penetration testing', 'cryptography',
  
  // UI/UX / Design / Creative
  'ui/ux', 'ui design', 'ux design', 'product design', 'interaction design',
  'wireframing', 'prototyping', 'user research', 'information architecture',
  'design systems', 'mobile design', 'web design', 'user flows', 'mockups',
  'usability testing', 'visual design', 'adobe xd', 'sketch', 'photoshop',
  'illustrator', 'b2b products', 'saas', 'graphics', 'typography', 'figma',
  'motion design', 'motion graphics', 'after effects', 'indesign', 'premiere pro',
  'video editing', 'branding', 'brand identity', 'copywriting', 'content creation',
  'creative direction', 'art direction', '3d modeling', 'blender', 'cinema 4d',
  
  // Product / Project Management / Scrum
  'product management', 'project management', 'agile methodologies', 'scrum master',
  'product owner', 'roadmap', 'sprint planning', 'backlog grooming', 'user stories',
  'business analysis', 'requirements gathering', 'confluence', 'trello', 'asana',
  'slack', 'cross-functional collaboration', 'stakeholder management', 'change management',
  'budgeting', 'risk management',
  
  // Marketing / Growth / Writing
  'seo', 'sem', 'digital marketing', 'growth marketing', 'growth hacking',
  'content marketing', 'social media', 'email marketing', 'content writing',
  'technical writing', 'google analytics', 'google ads', 'hubspot', 'mailchimp',
  'lead generation', 'performance marketing', 'conversion rate optimization', 'cro',
  'brand marketing', 'public relations', 'social media management', 'influencer marketing',
  'affiliate marketing', 'market research', 'competitive analysis',
  
  // Sales / Business / Customer Success
  'customer support', 'customer success', 'account management', 'inside sales',
  'business development', 'sales development', 'sdr', 'bdr', 'crm', 'salesforce',
  'zendesk', 'intercom', 'cold outreach', 'negotiation', 'lead qualification',
  'customer relationship management', 'upselling', 'client onboarding', 'retention',
  
  // Finance / HR / Operations / Admin
  'recruiting', 'talent acquisition', 'technical recruiting', 'human resources',
  'hr generalist', 'payroll', 'bookkeeping', 'accounting', 'quickbooks', 'excel',
  'data entry', 'virtual assistant', 'administrative support', 'scheduling',
  'email management', 'onboarding', 'training & development', 'employee engagement',
  
  // Common general professional soft skills
  'leadership', 'team collaboration', 'communication', 'problem solving'
];

function matchesSkill(userSkill: string, jobSkill: string): boolean {
  const u = userSkill.toLowerCase().trim();
  const j = jobSkill.toLowerCase().trim();
  if (u === j) return true;
  
  // Direct substring match
  if (u.includes(j) || j.includes(u)) return true;
  
  // Token match
  const uTokens = u.split(/[\s/&-]+/);
  const jTokens = j.split(/[\s/&-]+/);
  
  const common = uTokens.filter(t => t.length > 1 && jTokens.includes(t));
  if (common.length > 0) {
    const genericWords = ['design', 'development', 'systems', 'management', 'software', 'engineering', 'products', 'services'];
    const significantCommon = common.filter(t => !genericWords.includes(t));
    if (significantCommon.length > 0) return true;
    
    if (uTokens.length > 1 && jTokens.length > 1 && common.length >= Math.min(uTokens.length, jTokens.length)) {
      return true;
    }
  }
  return false;
}

const matchCache = new Map<string, JobMatchResult>();

export function calculateJobMatch(jobContent: string, jobTitle: string, userProfile: any): JobMatchResult {
  const cacheKey = `${jobContent.length}_${jobTitle}_${userProfile?.skills?.length || 0}_${userProfile?.experience || ''}`;
  if (matchCache.has(cacheKey)) {
    return matchCache.get(cacheKey)!;
  }

  const contentLower = (jobContent + ' ' + jobTitle).toLowerCase();
  const titleLower = (jobTitle || '').toLowerCase();

  // Extract User skills & interests
  const userSkills: string[] = Array.isArray(userProfile?.skills) ? userProfile.skills : [];
  const userInterests: string[] = Array.isArray(userProfile?.interests) ? userProfile.interests : [];
  const userSoftSkills: string[] = Array.isArray(userProfile?.softSkills) ? userProfile.softSkills : [];
  const userRoles: string[] = Array.isArray(userProfile?.roles) ? userProfile.roles : [];
  const extraRoles = [userProfile?.jobTitle, userProfile?.role, userProfile?.title].filter(Boolean) as string[];

  const allUserKeywords = [...userSkills, ...userInterests, ...userSoftSkills, ...userRoles, ...extraRoles]
    .map(s => s.trim())
    .filter(Boolean);
  const userExpStr = (userProfile?.experience || '').toLowerCase();

  const hasProfileData = Boolean(userExpStr || allUserKeywords.length > 0 || userProfile?.resumeFile || userProfile?.title || userProfile?.jobTitle || userProfile?.role);

  // If user has not filled out profile or uploaded resume, return 0% for all scores
  if (!userProfile || !hasProfileData) {
    return {
      overallScore: 0,
      expLevelScore: 0,
      skillsScore: 0,
      industryScore: 0,
      matchedSkills: [],
      missingSkills: [],
    };
  }

  // 1. Scan Job for Required Skills
  const jobRequiredSkills: string[] = [];
  SKILL_KEYWORDS.forEach(skill => {
    if (contentLower.includes(skill)) {
      // Format nicely for display
      const formattedName = skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      jobRequiredSkills.push(formattedName);
    }
  });

  // Fallback if no predefined skill keywords match the job description
  if (jobRequiredSkills.length === 0) {
    if (titleLower.includes('design') || titleLower.includes('ui') || titleLower.includes('ux') || titleLower.includes('creative')) {
      jobRequiredSkills.push('UI/UX Design', 'Design Systems', 'Figma', 'Prototyping', 'User Research');
    } else {
      jobRequiredSkills.push('React', 'JavaScript', 'TypeScript', 'Agile', 'Team Collaboration');
    }
  }

  // 2. Compute Matched vs Missing Skills
  const matchedSkillsSet = new Set<string>();
  const missingSkillsSet = new Set<string>();

  jobRequiredSkills.forEach(jobSkill => {
    const isMatched = allUserKeywords.some(userSkill => matchesSkill(userSkill, jobSkill));
    if (isMatched) {
      matchedSkillsSet.add(jobSkill);
    } else {
      missingSkillsSet.add(jobSkill);
    }
  });

  // Also include user skills that are mentioned in the job but might not have been caught in SKILL_KEYWORDS
  userSkills.forEach(userSkill => {
    if (contentLower.includes(userSkill.toLowerCase())) {
      matchedSkillsSet.add(userSkill);
    }
  });

  const matchedSkills = Array.from(matchedSkillsSet);
  const missingSkills = Array.from(missingSkillsSet).slice(0, 6);

  // 3. Experience Level Score (0% to 100%)
  let expLevelScore = 65; // default mid range
  const isSeniorJob = titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('principal') || titleLower.includes('sr') || contentLower.includes('5+ years') || contentLower.includes('5 years');
  const isMidJob = titleLower.includes('mid') || contentLower.includes('3+ years') || contentLower.includes('3-5 years');
  const isJuniorJob = titleLower.includes('junior') || titleLower.includes('intern') || titleLower.includes('associate') || contentLower.includes('1-2 years');

  if (userExpStr) {
    if (userExpStr.includes('5+')) {
      expLevelScore = isSeniorJob ? 95 : (isMidJob ? 85 : 60);
    } else if (userExpStr.includes('3-5')) {
      expLevelScore = isSeniorJob ? 70 : (isMidJob ? 95 : 75);
    } else if (userExpStr.includes('1-3')) {
      expLevelScore = isSeniorJob ? 40 : (isJuniorJob ? 95 : 70);
    } else if (userExpStr.includes('0-1')) {
      expLevelScore = isSeniorJob ? 20 : (isJuniorJob ? 95 : 50);
    }
  } else {
    expLevelScore = isSeniorJob ? 50 : 75;
  }

  // 4. Skills Match Score (0% to 100%)
  const skillsRatio = jobRequiredSkills.length > 0 ? matchedSkills.length / jobRequiredSkills.length : 0.7;
  const skillsScore = Math.round(skillsRatio * 100);

  // 5. Role Match Score (0% to 100%)
  let roleMatchScore = 50;
  const userRoleTitles = [...userRoles, userProfile?.jobTitle, userProfile?.role].filter(Boolean).map(r => r.toLowerCase());
  const wordsInJobTitle = titleLower.split(/[\s/&-]+/);

  const matchesTitleWord = userRoleTitles.some(uRole => 
    wordsInJobTitle.some(jWord => jWord.length > 2 && (uRole.includes(jWord) || jWord.includes(uRole)))
  );

  if (matchesTitleWord) {
    roleMatchScore = 95;
  } else if (titleLower.includes('designer') && userRoleTitles.some(r => r.includes('design'))) {
    roleMatchScore = 90;
  } else if (titleLower.includes('developer') && userRoleTitles.some(r => r.includes('developer') || r.includes('engineer'))) {
    roleMatchScore = 90;
  }

  // 6. Overall Match Score Calculation
  const overallScore = Math.min(98, Math.max(10, Math.round(
    (skillsScore * 0.50) + (expLevelScore * 0.30) + (roleMatchScore * 0.20)
  )));

  // 7. Industry / Job Match Score
  const industryScore = Math.min(98, Math.max(10, Math.round(
    (overallScore * 0.8) + (roleMatchScore * 0.2)
  )));

  const result: JobMatchResult = {
    overallScore,
    expLevelScore,
    skillsScore,
    industryScore,
    matchedSkills: matchedSkills.length > 0 ? matchedSkills : (userSkills.length > 0 ? userSkills : ['UI/UX Design', 'Design Systems', 'Figma']),
    missingSkills,
  };

  if (matchCache.size > 1000) {
    matchCache.clear();
  }
  matchCache.set(cacheKey, result);

  return result;
}
