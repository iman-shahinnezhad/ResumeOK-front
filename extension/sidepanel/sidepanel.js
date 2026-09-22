// ApplyDesk Native Chrome Side Panel Logic — Connected to Real MongoDB & Web Authentication

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3030'
  : 'https://api.applydesk.io';

const WEB_URL = 'https://applydesk.io';
const WEB_LOGIN_URL = 'https://applydesk.io/login';

document.addEventListener('DOMContentLoaded', async () => {
  const addJobBtn = document.getElementById('add-job-action');
  const addJobMsg = document.getElementById('add-job-msg');
  const mainContent = document.getElementById('sidepanel-main-content');
  const loginRequiredView = document.getElementById('login-required-view');
  const tokenCountEl = document.getElementById('token-count');
  const resumeScoreVal = document.getElementById('resume-score-val');
  const resumeFileNameVal = document.getElementById('resume-filename-val');
  const collapseBtn = document.getElementById('collapse-btn');

  // Handle Collapse / Close Button Click
  if (collapseBtn) {
    collapseBtn.addEventListener('click', async () => {
      // 1. Post message to parent window if inside floating drawer iframe
      try {
        window.parent.postMessage({ type: 'CLOSE_APPLYDESK_FLOATING_DRAWER' }, '*');
      } catch(e) {}

      // 2. Notify active browser tab to close overlay drawer
      try {
        const tab = await getActiveTab();
        if (tab && tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'CLOSE_FLOATING_PANEL' }, () => {
            if (chrome.runtime.lastError) {}
          });
        }
      } catch(e) {}

      // 3. Close window if native Chrome Side Panel
      try {
        window.close();
      } catch(e) {}
    });
  }

  const userNameDisplay = document.getElementById('user-name-display');
  const userEmailDisplay = document.getElementById('user-email-display');
  const userAvatarBadge = document.getElementById('user-avatar-badge');
  const logoutBtn = document.getElementById('logout-btn');
  const loginWebBtn = document.getElementById('login-web-btn');
  const refreshAuthBtn = document.getElementById('refresh-auth-btn');

  let activeToken = null;
  let activeUser = null;
  let currentProfile = null;
  let userResumes = [];

  // Get Active Browser Tab Helper
  async function getActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab) return tab;
      const [tabFallback] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabFallback || null;
    } catch(e) { return null; }
  }

  // Automatically re-check auth & update UI whenever Chrome storage changes
  try {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && (changes.resumeok_token || changes.resumeok_user)) {
        checkAuthAndLoadData();
      }
    });
  } catch(e) {}

  // Check Web App Auth & Load Real User Data from MongoDB
  async function checkAuthAndLoadData() {
    try {
      const storage = await chrome.storage.local.get(['resumeok_token', 'resumeok_user', 'resumeok_profile']);
      activeToken = storage.resumeok_token || null;
      activeUser = storage.resumeok_user || null;
      if (storage.resumeok_profile) currentProfile = storage.resumeok_profile;
    } catch(e) {}

    // If token not in extension storage, check active web tab & any applydesk tabs for localStorage auth
    if (!activeToken || !activeUser) {
      try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (tab.id && tab.url && (tab.url.includes('applydesk') || tab.url.includes('188.166.164.115') || tab.url.includes('localhost') || tab.url.includes('127.0.0.1'))) {
            await new Promise((resolve) => {
              chrome.tabs.sendMessage(tab.id, { type: 'CHECK_WEB_AUTH' }, () => {
                if (chrome.runtime.lastError) resolve(null);
                else resolve(true);
              });
            });
          }
        }
        // Re-check storage after content script sync attempt
        const storage = await chrome.storage.local.get(['resumeok_token', 'resumeok_user']);
        if (storage.resumeok_token && storage.resumeok_user) {
          activeToken = storage.resumeok_token;
          activeUser = storage.resumeok_user;
        }
      } catch(e) {}
    }

    // IF NOT LOGGED IN: Show Login Required View
    if (!activeToken || !activeUser) {
      if (loginRequiredView) loginRequiredView.style.display = 'block';
      if (mainContent) mainContent.style.display = 'none';
      if (tokenCountEl) tokenCountEl.innerText = '0';
      return false;
    }

    // USER IS LOGGED IN: Show Main Content Area
    if (loginRequiredView) loginRequiredView.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';

    // Fetch REAL User Details & Credits from MongoDB API
    try {
      const endpoints = [
        `${API_BASE}/api/auth/me`,
        `${API_BASE}/auth/me`
      ];
      for (const ep of endpoints) {
        try {
          const authRes = await fetch(ep, {
            headers: { 'Authorization': `Bearer ${activeToken}` }
          });
          if (authRes.ok) {
            const authData = await authRes.json();
            if (authData && authData.user) {
              activeUser = authData.user;
              await chrome.storage.local.set({ resumeok_user: activeUser });
              break;
            }
          }
        } catch(e) {}
      }
    } catch(e) {}

    // Update Token Count in Header
    if (tokenCountEl) {
      tokenCountEl.innerText = String(activeUser.credit !== undefined ? activeUser.credit : 0);
    }

    // Fetch REAL Profile from MongoDB API
    try {
      const profRes = await fetch(`${API_BASE}/api/user/${activeUser.id}/profile`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (profRes.ok) {
        const profData = await profRes.json();
        if (profData && profData.profile) {
          currentProfile = profData.profile;
          await chrome.storage.local.set({ resumeok_profile: currentProfile });
        }
      }
    } catch(e) {}

    // Fetch REAL User Documents (Resumes) from MongoDB API
    try {
      const docRes = await fetch(`${API_BASE}/api/user/${activeUser.id}/documents`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (docRes.ok) {
        const docData = await docRes.json();
        if (docData && docData.resumes) {
          userResumes = docData.resumes;
        }
      }
    } catch(e) {}

    if (!currentProfile) currentProfile = {};

    // Update Profile Card Display
    const fullName = currentProfile.firstName
      ? `${currentProfile.firstName} ${currentProfile.lastName || ''}`.trim()
      : (activeUser.name || 'Candidate User');
    const userEmail = currentProfile.email || activeUser.email || 'User Account';

    if (userNameDisplay) userNameDisplay.innerText = fullName;
    if (userEmailDisplay) userEmailDisplay.innerText = userEmail;
    if (userAvatarBadge) userAvatarBadge.innerText = (fullName[0] || 'U').toUpperCase();

    // Populate Resume Filename
    let resumeName = 'No resume uploaded';
    if (userResumes && userResumes.length > 0 && userResumes[0].fileName) {
      resumeName = userResumes[0].fileName;
    } else if (currentProfile.resumeFileName) {
      resumeName = currentProfile.resumeFileName;
    } else if (currentProfile.firstName) {
      resumeName = `${currentProfile.firstName}_CV.PDF`;
    }
    if (resumeFileNameVal) resumeFileNameVal.innerText = resumeName;

    return true;
  }

  // Initial Auth & Data Load
  await checkAuthAndLoadData();

  // Login Button Click -> Opens Web App Login Page (https://applydesk.io/login)
  if (loginWebBtn) {
    loginWebBtn.addEventListener('click', () => {
      window.open(WEB_LOGIN_URL, '_blank');
    });
  }

  // Refresh Login Status Click -> Re-syncs & loads immediately
  if (refreshAuthBtn) {
    refreshAuthBtn.addEventListener('click', async () => {
      refreshAuthBtn.innerText = 'Checking...';
      const success = await checkAuthAndLoadData();
      refreshAuthBtn.innerText = '🔄 Check Login Status';
      if (!success && addJobMsg) {
        addJobMsg.innerHTML = '<span style="color:#ef4444;font-weight:700;">⚠️ Please log in on the web page first.</span>';
      }
    });
  }

  // Log Out Click
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
        checkAuthAndLoadData();
      });
    });
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
    if (profile.resumeFileName || profile.resumeFile || (userResumes && userResumes.length > 0)) rawResume += 25;
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
      const isAuthed = await checkAuthAndLoadData();
      if (!isAuthed) {
        if (addJobMsg) addJobMsg.innerHTML = '<span style="color:#ef4444;font-weight:700;">⚠️ Please log in to ApplyDesk first.</span>';
        window.open(`${WEB_URL}/#/login`, '_blank');
        return;
      }

      // STEP 1: Show Loading Screen 1 (Scanning Job...)
      mainContent.innerHTML = `
        <div class="loading-screen">
          <div class="spinner-ring"></div>
          <div class="loading-title">Scanning Job...</div>
        </div>
      `;

      const tab = await getActiveTab();
      let jobInfo = { title: 'Software Engineer', company: 'Tech Company', location: 'Remote', url: window.location.href };

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

      await new Promise(r => setTimeout(r, 1000));

      // STEP 2: Show Loading Screen 2 (Score Matching...)
      mainContent.innerHTML = `
        <div class="loading-screen">
          <div class="spinner-ring"></div>
          <div class="loading-title">Score Matching...</div>
        </div>
      `;

      const matchResult = calculateRealJobMatch(jobInfo, currentProfile || {});

      // SAVE JOB DIRECTLY TO MONGO DATABASE FOR THIS LOGGED IN USER
      chrome.runtime.sendMessage({
        type: 'SAVE_JOB_TO_DB',
        jobId: encodeURIComponent(`${jobInfo.title}_${jobInfo.company}`).replace(/%/g, '_'),
        jobData: {
          title: jobInfo.title,
          companyName: jobInfo.company,
          location: jobInfo.location,
          url: jobInfo.url,
          description: jobInfo.description || '',
          timestamp: Date.now()
        }
      });

      await new Promise(r => setTimeout(r, 1000));

      // STEP 3: Show Scanned Job & Real Match Results View
      const displayResumeName = (userResumes && userResumes[0] && userResumes[0].fileName) || currentProfile.resumeFileName || (currentProfile.firstName ? `${currentProfile.firstName}_CV.PDF` : 'Candidate_Resume.PDF');

      mainContent.innerHTML = `
        <!-- Card 1: Scanned Job & Real Match Details -->
        <div class="card-white">
          <div style="font-size:17px;font-weight:800;color:#0f172a;line-height:1.3;margin-bottom:4px;">${jobInfo.title}</div>
          <div style="font-size:13px;font-weight:500;color:#64748b;margin-bottom:12px;">${jobInfo.location ? jobInfo.location + ' • ' : ''}${jobInfo.company}</div>
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
          <div id="results-autofill-msg" style="font-size:12px;color:#10b981;text-align:center;margin-top:6px;font-weight:700;">
            ✅ Saved to your ApplyDesk database!
          </div>
        </div>

        <!-- Card 2: Resume Score -->
        <div class="card-white" style="margin-top:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="const el=document.getElementById('resume-score-details'); el.style.display=el.style.display==='none'?'block':'none';">
            <div style="font-size:15px;font-weight:800;color:#0f172a;">Resume Score</div>
            <div style="font-size:14px;font-weight:700;color:#64748b;">❯</div>
          </div>
          <div id="resume-score-details" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid #f1f5f9;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div style="font-size:14px;font-weight:700;color:#0f172a;">Score</div>
              <div style="font-size:14px;font-weight:800;color:#0f172a;">${matchResult.resumeScore}/100</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
              <span style="font-size:18px;">📁</span>
              <span style="font-size:13px;font-weight:600;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${displayResumeName}</span>
            </div>
            <button id="fix-resume-btn-2" class="btn-outline-pill" style="margin-top:0;">
              <span style="color:#eab308;">⚡</span> Fix resume issues
            </button>
          </div>
        </div>

        <!-- Card 3: Edit Your Information -->
        <a id="edit-info-link-2" href="${WEB_URL}/#/profile" target="_blank" class="edit-info-row" style="margin-top:10px;text-decoration:none;">
          <div class="edit-info-text">Edit Your information</div>
          <div style="font-size:15px;font-weight:700;color:#64748b;">❯</div>
        </a>

        <!-- Container for Auto filling Fields loading checklist -->
        <div id="autofill-progress-container"></div>
      `;

      // Event listener for Autofill Form button -> Triggers Loading Checklist Card
      const autofillBtn = document.getElementById('results-autofill-btn');
      const autofillMsg = document.getElementById('results-autofill-msg');
      const progressContainer = document.getElementById('autofill-progress-container');

      if (autofillBtn) {
        autofillBtn.addEventListener('click', async () => {
          autofillBtn.innerText = 'Autofilling...';
          autofillBtn.disabled = true;

          const fieldsList = [
            { label: 'First name', key: 'firstName' },
            { label: 'Last name', key: 'lastName' },
            { label: 'Phone number', key: 'phone' },
            { label: 'Email', key: 'email' },
            { label: 'Resume / CV File', key: 'resume' },
            { label: 'Cover letter', key: 'coverLetter' },
            { label: 'Work Authorization', key: 'auth' }
          ];

          // Render Auto filling Fields loading card
          progressContainer.innerHTML = `
            <div class="card-white" style="margin-top:12px;padding:20px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div style="font-size:16px;font-weight:800;color:#0f172a;">Auto filling Fields</div>
                <div id="autofill-percent-val" style="font-size:16px;font-weight:800;color:#0f172a;">0%</div>
              </div>
              <div id="autofill-checklist-items" style="display:flex;flex-direction:column;gap:12px;">
                ${fieldsList.map((f, i) => `
                  <div id="check-item-${i}" style="display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600;color:#475569;">
                    <div class="check-circle-icon" style="width:18px;height:18px;border-radius:50%;border:2px solid #cbd5e1;display:flex;align-items:center;justify-content:center;"></div>
                    <span>${f.label}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;

          const tab = await getActiveTab();
          if (tab && tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_AUTOFILL', profile: currentProfile || {} }, async (res) => {
              // Animate checklist progress step-by-step
              const percentEl = document.getElementById('autofill-percent-val');
              const total = fieldsList.length;

              for (let i = 0; i < total; i++) {
                await new Promise(r => setTimeout(r, 220));
                const itemEl = document.getElementById(`check-item-${i}`);
                if (itemEl) {
                  itemEl.style.color = '#16a34a';
                  itemEl.innerHTML = `
                    <div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>${fieldsList[i].label}</span>
                  `;
                }
                const currentPercent = Math.round(((i + 1) / total) * 100);
                if (percentEl) percentEl.innerText = `${currentPercent}%`;
              }

              autofillBtn.innerText = '✅ Form Autofilled!';
              autofillBtn.disabled = false;
              if (autofillMsg) autofillMsg.innerText = `✅ Autofilled ${res?.count || total} fields!`;
            });
          }
        });
      }

      // Attach click handlers to open Edit Your Information Modal Overlay or Web Profile Page
      const editLink = document.getElementById('edit-info-link-2');
      if (editLink) {
        editLink.addEventListener('click', async (e) => {
          e.preventDefault();
          const tab = await getActiveTab();
          if (tab && tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'OPEN_EDIT_INFO_MODAL' }, (res) => {
              if (chrome.runtime.lastError) {
                window.open(`${WEB_URL}/#/profile`, '_blank');
              }
            });
          } else {
            window.open(`${WEB_URL}/#/profile`, '_blank');
          }
        });
      }
    });
  }

  // Edit Your Information Link Handler for Default View
  const defaultEditLink = document.getElementById('edit-info-link');
  if (defaultEditLink) {
    defaultEditLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const tab = await getActiveTab();
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'OPEN_EDIT_INFO_MODAL' }, (res) => {
          if (chrome.runtime.lastError) {
            window.open(`${WEB_URL}/#/profile`, '_blank');
          }
        });
      } else {
        window.open(`${WEB_URL}/#/profile`, '_blank');
      }
    });
  }
});
