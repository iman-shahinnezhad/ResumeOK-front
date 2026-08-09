export interface JobMatchResult {
  overallScore: number;
  expLevelScore: number;
  skillsScore: number;
  industryScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

const COMMON_TECH_SKILLS = [
  'React', 'React Native', 'JavaScript', 'TypeScript', 'Node.js', 'Python',
  'Java', 'Kotlin', 'Swift', 'C++', 'C#', 'Go', 'Golang', 'Ruby', 'PHP',
  'SQL', 'PostgreSQL', 'MongoDB', 'GraphQL', 'REST API', 'AWS', 'Docker',
  'Kubernetes', 'CI/CD', 'Git', 'HTML', 'CSS', 'Tailwind', 'Redux',
  'Next.js', 'Express', 'Figma', 'System Design', 'Agile', 'Jira'
];

export function calculateJobMatch(jobContent: string, jobTitle: string, userProfile: any): JobMatchResult {
  const contentLower = (jobContent + ' ' + jobTitle).toLowerCase();
  const titleLower = (jobTitle || '').toLowerCase();

  // Extract User skills & interests
  const userSkills: string[] = Array.isArray(userProfile?.skills) ? userProfile.skills : [];
  const userInterests: string[] = Array.isArray(userProfile?.interests) ? userProfile.interests : [];
  const userSoftSkills: string[] = Array.isArray(userProfile?.softSkills) ? userProfile.softSkills : [];
  const allUserKeywords = [...userSkills, ...userInterests, ...userSoftSkills].map(s => s.trim().toLowerCase()).filter(Boolean);
  const userExpStr = (userProfile?.experience || '').toLowerCase();

  const hasProfileData = Boolean(userExpStr || allUserKeywords.length > 0 || userProfile?.resumeFile || userProfile?.title);

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

  // 1. Matched and Missing Skills
  const matchedSkillsSet = new Set<string>();
  const missingSkillsSet = new Set<string>();

  COMMON_TECH_SKILLS.forEach(skill => {
    const skillLower = skill.toLowerCase();
    if (contentLower.includes(skillLower)) {
      if (allUserKeywords.some(us => us.includes(skillLower) || skillLower.includes(us))) {
        matchedSkillsSet.add(skill);
      } else {
        missingSkillsSet.add(skill);
      }
    }
  });

  // Direct user skills present in job
  userSkills.forEach(skill => {
    if (contentLower.includes(skill.toLowerCase())) {
      matchedSkillsSet.add(skill);
    }
  });

  const matchedSkills = Array.from(matchedSkillsSet);
  const missingSkills = Array.from(missingSkillsSet).slice(0, 6);

  // 2. Experience Level Score (0% to 100%)
  let expLevelScore = 0;
  const isSeniorJob = titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('principal') || contentLower.includes('5+ years') || contentLower.includes('5 years');
  const isMidJob = titleLower.includes('mid') || contentLower.includes('3+ years') || contentLower.includes('3-5 years');
  const isJuniorJob = titleLower.includes('junior') || titleLower.includes('intern') || titleLower.includes('associate') || contentLower.includes('1-2 years');

  if (userExpStr) {
    if (userExpStr.includes('5+')) {
      expLevelScore = isSeniorJob ? 100 : (isMidJob ? 85 : 60);
    } else if (userExpStr.includes('3-5')) {
      expLevelScore = isSeniorJob ? 65 : (isMidJob ? 95 : 70);
    } else if (userExpStr.includes('1-3')) {
      expLevelScore = isSeniorJob ? 30 : (isJuniorJob ? 95 : 60);
    } else if (userExpStr.includes('0-1')) {
      expLevelScore = isSeniorJob ? 10 : (isJuniorJob ? 90 : 40);
    } else {
      expLevelScore = isSeniorJob ? 40 : 60;
    }
  }

  // 3. Skill & Keyword Match Ratio
  let matchedKeywordCount = 0;
  allUserKeywords.forEach(kw => {
    if (titleLower.includes(kw) || contentLower.includes(kw)) {
      matchedKeywordCount++;
    }
  });

  const keywordRatio = allUserKeywords.length > 0 ? matchedKeywordCount / allUserKeywords.length : 0;

  // Excellent Match (0% to 95%)
  let overallScore = 0;
  if (keywordRatio >= 0.7) {
    overallScore = Math.round(75 + (keywordRatio - 0.7) * 50);
  } else if (keywordRatio >= 0.3) {
    overallScore = Math.round(45 + (keywordRatio - 0.3) * 60);
  } else if (keywordRatio > 0) {
    overallScore = Math.round(20 + keywordRatio * 80);
  } else {
    overallScore = 0;
  }
  overallScore = Math.min(95, Math.max(0, overallScore));

  // Fair Match (0% to 55%)
  const skillsScore = overallScore > 0 ? Math.min(55, Math.max(10, Math.round(overallScore * 0.55))) : 0;

  // Perfect Match (0% to 98%)
  const industryScore = (expLevelScore > 0 || overallScore > 0)
    ? Math.min(98, Math.max(10, Math.round((expLevelScore * 0.45) + (overallScore * 0.55))))
    : 0;

  return {
    overallScore,
    expLevelScore,
    skillsScore,
    industryScore,
    matchedSkills: matchedSkills.length > 0 ? matchedSkills : (userSkills.length > 0 ? userSkills : ['Design', 'UI/UX', 'Product']),
    missingSkills,
  };
}
