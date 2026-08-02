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

  // User skills
  const userSkills: string[] = Array.isArray(userProfile?.skills) ? userProfile.skills : [];
  const userSoftSkills: string[] = Array.isArray(userProfile?.softSkills) ? userProfile.softSkills : [];
  const allUserSkills = [...userSkills, ...userSoftSkills].map(s => s.trim().toLowerCase());

  // Matched and Missing skills
  const matchedSkillsSet = new Set<string>();
  const missingSkillsSet = new Set<string>();

  COMMON_TECH_SKILLS.forEach(skill => {
    const skillLower = skill.toLowerCase();
    if (contentLower.includes(skillLower)) {
      if (allUserSkills.some(us => us.includes(skillLower) || skillLower.includes(us))) {
        matchedSkillsSet.add(skill);
      } else {
        missingSkillsSet.add(skill);
      }
    }
  });

  // Also check direct user skills present in job
  userSkills.forEach(skill => {
    if (contentLower.includes(skill.toLowerCase())) {
      matchedSkillsSet.add(skill);
    }
  });

  const matchedSkills = Array.from(matchedSkillsSet);
  const missingSkills = Array.from(missingSkillsSet).slice(0, 6);

  // Score calculation logic
  const totalKeywords = matchedSkills.length + missingSkills.length;
  let skillsScore = 75;
  if (totalKeywords > 0) {
    skillsScore = Math.min(98, Math.max(45, Math.round((matchedSkills.length / totalKeywords) * 100)));
  }

  // Exp level score
  let expLevelScore = 90;
  if (contentLower.includes('senior') || contentLower.includes('lead') || contentLower.includes('principal')) {
    const expCount = userProfile?.experiences?.length || 0;
    expLevelScore = expCount >= 2 ? 95 : 65;
  } else if (contentLower.includes('entry') || contentLower.includes('junior')) {
    expLevelScore = 100;
  }

  // Industry exp score
  let industryScore = 80;
  if (userSkills.length > 3) industryScore += 10;
  if (userProfile?.summaries?.length > 0) industryScore += 5;

  // Overall score
  const overallScore = Math.min(99, Math.round((skillsScore * 0.5) + (expLevelScore * 0.3) + (industryScore * 0.2)));

  return {
    overallScore,
    expLevelScore,
    skillsScore,
    industryScore,
    matchedSkills: matchedSkills.length > 0 ? matchedSkills : (userSkills.length > 0 ? userSkills : ['JavaScript', 'React', 'Git']),
    missingSkills,
  };
}
