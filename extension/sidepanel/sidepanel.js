// ApplyDesk Native Chrome Side Panel Logic (Pixel-Perfect Matching Mockups)

document.addEventListener('DOMContentLoaded', async () => {
  const addJobBtn = document.getElementById('add-job-action');
  const addJobMsg = document.getElementById('add-job-msg');
  const mainContent = document.getElementById('sidepanel-main-content');
  const tokenCountEl = document.getElementById('token-count');
  const resumeScoreVal = document.getElementById('resume-score-val');
  const resumeFileNameVal = document.getElementById('resume-filename-val');

  let currentProfile = null;

  // Read candidate profile from local storage or database API
  async function loadProfile() {
    try {
      const storageData = await chrome.storage.local.get('resumeok_profile');
      if (storageData && storageData.resumeok_profile) {
        currentProfile = storageData.resumeok_profile;
      }
    } catch(e) {}

    if (!currentProfile || (!currentProfile.firstName && !currentProfile.resumeFile && !currentProfile.skills)) {
      const apiUrls = [
        'https://applydesk.io/api/user/default_user/profile',
        'http://188.166.164.115:3030/api/user/default_user/profile',
        'http://localhost:3000/api/user/default_user/profile'
      ];
      for (const url of apiUrls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const dbData = await res.json();
            if (dbData && dbData.profile) {
              currentProfile = dbData.profile;
              break;
            }
          }
        } catch(e) {}
      }
    }

    if (!currentProfile) currentProfile = {};

    // Populate resume filename if available
    const filename = currentProfile.resumeFileName || (currentProfile.firstName ? `${currentProfile.firstName}_25jun.PDF` : 'OmidMoradi_25jun.PDF');
    if (resumeFileNameVal) resumeFileNameVal.innerText = filename;
  }

  await loadProfile();

  // Helper: Get Active Tab
  async function getActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab;
    } catch(e) { return null; }
  }

  // Real Job & Resume Match Scoring Calculation Algorithm
  function calculateRealJobMatch(job, profile) {
    const jobText = `${job.title || ''} ${job.description || ''} ${job.industry || ''}`.toLowerCase();
    
    let userSkills = [];
    if (typeof profile.skills === 'string') {
      userSkills = profile.skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    } else if (Array.isArray(profile.skills)) {
      userSkills = profile.skills.map(s => String(s).trim().toLowerCase()).filter(Boolean);
    }

    const userTitle = (profile.jobTitle || '').toLowerCase();
    const userSummary = (profile.workSummary || '').toLowerCase();
    const userFullText = `${userTitle} ${userSummary} ${userSkills.join(' ')}`.toLowerCase();

    const commonKeywords = [
      'react', 'react native', 'javascript', 'typescript', 'node.js', 'node', 'express',
      'python', 'java', 'c++', 'sql', 'postgresql', 'mongodb', 'docker', 'kubernetes',
      'aws', 'git', 'html', 'css', 'tailwind', 'ui/ux', 'design', 'figma', 'agile',
      'scrum', 'testing', 'cypress', 'jest', 'graphql', 'rest', 'api', 'frontend', 'backend', 'fullstack', 'web developer'
    ];

    const jobKeywords = commonKeywords.filter(k => jobText.includes(k));

    let matchedSkillsCount = 0;
    jobKeywords.forEach(k => {
      if (userFullText.includes(k)) matchedSkillsCount++;
    });

    const totalJobKeywords = Math.max(1, jobKeywords.length);
    const skillsRatio = matchedSkillsCount / totalJobKeywords;
    const skillsScore = Math.min(98, Math.max(30, Math.round(skillsRatio * 100)));

    const titleWords = (job.title || '').toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let titleMatches = 0;
    titleWords.forEach(w => {
      if (userFullText.includes(w)) titleMatches++;
    });
    const titleScore = titleWords.length > 0 ? Math.round((titleMatches / titleWords.length) * 100) : 60;

    let rawResume = 30;
    if (profile.resumeFileName || profile.resumeFile || profile.resumeBase64) rawResume += 25;
    if (userSkills.length > 3) rawResume += 20;
    if (profile.firstName && profile.email && profile.phone) rawResume += 15;
    if (profile.workSummary && profile.workSummary.length > 20) rawResume += 10;
    const resumeScore = Math.min(98, Math.max(20, rawResume));

    const jobMatch = Math.min(98, Math.max(25, Math.round(skillsScore * 0.40 + titleScore * 0.40 + resumeScore * 0.20)));

    return { jobMatch, skillsScore, resumeScore };
  }

  // Handle "+Add this job to Applydesk" button click
  if (addJobBtn) {
    addJobBtn.addEventListener('click', async () => {
      await loadProfile();

      // Check if candidate resume exists
      const hasResume = currentProfile.resumeFileName || currentProfile.resumeFile || currentProfile.resumeBase64 || (currentProfile.skills && currentProfile.skills.length > 3) || currentProfile.firstName;
      if (!hasResume) {
        if (addJobMsg) addJobMsg.innerHTML = '<span style="color:#ef4444;font-weight:700;">⚠️ Please upload or enter your candidate resume in Applydesk first.</span>';
        window.open('https://applydesk.io/#/profile', '_blank');
        return;
      }

      // STEP 1: Show Loading Screen 1 (Scanning Job... - Image 1)
      mainContent.innerHTML = `
        <div class="loading-screen">
          <div class="spinner-ring"></div>
          <div class="loading-title">Scanning Job...</div>
        </div>
      `;

      const tab = await getActiveTab();
      let jobInfo = { title: 'Junior web developer - storyteller', company: 'Computer Software', location: 'Kota' };

      if (tab && tab.id) {
        try {
          const res = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, { type: 'GET_JOB_DETAILS' }, (r) => {
              if (chrome.runtime.lastError || !r) resolve(null);
              else resolve(r);
            });
          });
          if (res && res.title) jobInfo = res;
        } catch(e) {}
      }

      await new Promise(r => setTimeout(r, 1300));

      // STEP 2: Show Loading Screen 2 (Score Matching... - Image 2)
      mainContent.innerHTML = `
        <div class="loading-screen">
          <div class="spinner-ring"></div>
          <div class="loading-title">Score Matching...</div>
        </div>
      `;

      const matchResult = calculateRealJobMatch(jobInfo, currentProfile);

      // Scan form fields status via content script
      let scanResult = { percentage: 0 };
      if (tab && tab.id) {
        try {
          const res = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, { type: 'GET_FORM_FIELDS_STATUS', profile: currentProfile }, (r) => {
              if (chrome.runtime.lastError || !r) resolve(null);
              else resolve(r);
            });
          });
          if (res) scanResult = res;
        } catch(e) {}
      }

      await new Promise(r => setTimeout(r, 1300));

      // STEP 3: Show Image 3 Scanned Job & Real Match Results View
      const resumeFileName = currentProfile.resumeFileName || (currentProfile.firstName ? `${currentProfile.firstName}_25jun.PDF` : 'OmidMoradi_25jun.PDF');

      mainContent.innerHTML = `
        <!-- Card 1: Scanned Job & Real Match Details (Image 3) -->
        <div class="card-white">
          <div style="font-size:17px;font-weight:800;color:#0f172a;line-height:1.3;margin-bottom:4px;">${jobInfo.title}</div>
          <div style="font-size:13px;font-weight:500;color:#64748b;margin-bottom:12px;">${jobInfo.location ? jobInfo.location + ' • ' : ''}${jobInfo.industry || jobInfo.company}</div>
          <div style="border-bottom: 1px solid #f1f5f9; margin-bottom: 14px;"></div>
          
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:16px;font-weight:800;color:#0f172a;">Job Match</span>
            <span style="font-size:17px;font-weight:800;color:#0f172a;">${matchResult.jobMatch}/100</span>
          </div>

          <!-- 3 Metric Pills -->
          <div class="metric-pills-grid">
            <div class="pill-box pill-box-green">
              <div class="pill-score-val">${matchResult.jobMatch}%</div>
              <div class="pill-score-lbl">JOB MATCH</div>
            </div>
            <div class="pill-box pill-box-gray">
              <div class="pill-score-val">${matchResult.skillsScore}%</div>
              <div class="pill-score-lbl">SKILLS</div>
            </div>
            <div class="pill-box pill-box-gray">
              <div class="pill-score-val">${matchResult.resumeScore}%</div>
              <div class="pill-score-lbl">RESUME</div>
            </div>
          </div>

          <button id="results-autofill-btn" class="btn-black-pill">
            Autofill Form
          </button>
          <div id="results-autofill-msg" style="font-size:12px;color:#10b981;text-align:center;margin-top:6px;font-weight:700;"></div>
        </div>

        <!-- Card 2: Resume Score -->
        <div class="card-white">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div style="font-size:16px;font-weight:800;color:#0f172a;">Resume Score</div>
            <div style="font-size:16px;font-weight:700;color:#0f172a;">${matchResult.resumeScore}/100</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
            <span style="font-size:20px;">📁</span>
            <span style="font-size:13px;font-weight:600;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${resumeFileName}</span>
          </div>
          <button id="fix-resume-btn-2" class="btn-outline-pill">
            <span style="color:#eab308;">⚡</span> Fix resume issues
          </button>
        </div>

        <!-- Card 3: Your Coverletter -->
        <div class="card-white">
          <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:12px;">Your Coverletter</div>
          <button id="generate-cl-btn" class="btn-outline-pill" style="margin-top:0;">
            <span style="color:#eab308;">⚡</span> Generate cover letter
          </button>
        </div>

        <!-- Card 4: Edit Your information -->
        <a href="https://applydesk.io/#/profile" target="_blank" class="edit-info-row" style="text-decoration:none;">
          <div class="edit-info-text">Edit Your information</div>
          <div style="font-size:15px;font-weight:700;color:#64748b;">❯</div>
        </a>

        <!-- Card 5: Fields Progress -->
        <div class="edit-info-row" style="cursor:default;">
          <div class="edit-info-text">Fields</div>
          <div style="font-size:15px;font-weight:800;color:#0f172a;">${scanResult.percentage || 0}%</div>
        </div>
      `;

      // Event listener for Autofill Form button in Results view
      const autofillBtn = document.getElementById('results-autofill-btn');
      const autofillMsg = document.getElementById('results-autofill-msg');
      if (autofillBtn) {
        autofillBtn.addEventListener('click', async () => {
          const tab = await getActiveTab();
          if (tab && tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_AUTOFILL', profile: currentProfile }, (res) => {
              if (autofillMsg) autofillMsg.innerText = `✅ Autofilled ${res?.count || 'form'} fields!`;
            });
          }
        });
      }
    });
  }
});
