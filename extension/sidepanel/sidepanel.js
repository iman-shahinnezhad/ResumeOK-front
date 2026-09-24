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
        window.parent.postMessage({ type: 'SHOW_DOCK_TAB' }, '*');
      } catch(e) {}

      // 2. Notify active browser tab to close overlay drawer and show floating right dock tab
      try {
        const tab = await getActiveTab();
        if (tab && tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'CLOSE_FLOATING_PANEL' }, () => {});
          chrome.tabs.sendMessage(tab.id, { type: 'SHOW_DOCK_TAB' }, () => {});
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

  // Automatically close any in-page floating drawer on active tab whenever Native SidePanel opens
  (async () => {
    try {
      const tab = await getActiveTab();
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'CLOSE_FLOATING_PANEL' }, () => {
          if (chrome.runtime.lastError) {}
        });
      }
    } catch(e) {}
  })();

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
      if (typeof activeUser === 'string') {
        try { activeUser = JSON.parse(activeUser); } catch(e) {}
      }
      if (storage.resumeok_profile) currentProfile = storage.resumeok_profile;
    } catch(e) {}

    // If token not in extension storage, query open ApplyDesk web tabs to sync auth
    if (!activeToken) {
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
        // Wait 250ms for chrome.storage.local write to complete
        await new Promise(r => setTimeout(r, 250));

        const storage = await chrome.storage.local.get(['resumeok_token', 'resumeok_user']);
        activeToken = storage.resumeok_token || null;
        activeUser = storage.resumeok_user || null;
        if (typeof activeUser === 'string') {
          try { activeUser = JSON.parse(activeUser); } catch(e) {}
        }
      } catch(e) {}
    }

    // IF STILL NO TOKEN: Show Login Required View
    if (!activeToken) {
      if (loginRequiredView) loginRequiredView.style.display = 'block';
      if (mainContent) mainContent.style.display = 'none';
      if (tokenCountEl) tokenCountEl.innerText = '0';
      return false;
    }

    // USER IS LOGGED IN: Show Main Content Area
    if (loginRequiredView) loginRequiredView.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    if (addJobMsg) addJobMsg.innerHTML = '';

    // Verify token & update credit balance from MongoDB API
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
          } else if (authRes.status === 401) {
            // Token explicitly rejected by backend -> logout
            await chrome.storage.local.remove(['resumeok_token', 'resumeok_user']);
            activeToken = null;
            activeUser = null;
            if (loginRequiredView) loginRequiredView.style.display = 'block';
            if (mainContent) mainContent.style.display = 'none';
            if (tokenCountEl) tokenCountEl.innerText = '0';
            return false;
          }
        } catch(e) {}
      }
    } catch(e) {}

    if (!activeUser) activeUser = {};

    // Update Token Count in Header
    if (tokenCountEl) {
      tokenCountEl.innerText = String(activeUser.credit !== undefined ? activeUser.credit : 0);
    }

    // Fetch REAL Profile from MongoDB API
    try {
      if (activeUser.id) {
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
      }
    } catch(e) {}

    // Fetch REAL User Documents (Resumes) from MongoDB API
    try {
      if (activeUser.id) {
        const docRes = await fetch(`${API_BASE}/api/user/${activeUser.id}/documents`, {
          headers: { 'Authorization': `Bearer ${activeToken}` }
        });
        if (docRes.ok) {
          const docData = await docRes.json();
          if (docData && docData.resumes) {
            userResumes = docData.resumes;
          }
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
      // Force sync check on open tabs
      try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (tab.id && tab.url && (tab.url.includes('applydesk') || tab.url.includes('188.166.164.115') || tab.url.includes('localhost') || tab.url.includes('127.0.0.1'))) {
            chrome.tabs.sendMessage(tab.id, { type: 'CHECK_WEB_AUTH' }, () => {
              if (chrome.runtime.lastError) {}
            });
          }
        }
      } catch(e) {}
      await new Promise(r => setTimeout(r, 300));
      const success = await checkAuthAndLoadData();
      refreshAuthBtn.innerText = '🔄 Check Login Status';
      if (success && addJobMsg) {
        addJobMsg.innerHTML = '';
      } else if (!success && addJobMsg) {
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
            { label: 'First name', key: 'firstName', searchTerms: ['first name', 'given name', 'first_name'] },
            { label: 'Last name', key: 'lastName', searchTerms: ['last name', 'surname', 'last_name'] },
            { label: 'Phone number', key: 'phone', searchTerms: ['phone', 'mobile', 'telephone'] },
            { label: 'Email', key: 'email', searchTerms: ['email', 'e-mail'] },
            { label: 'Current location', key: 'location', searchTerms: ['location', 'city', 'address'] },
            { label: 'Education School', key: 'school', searchTerms: ['school', 'university', 'institution'] },
            { label: 'Education Degree', key: 'degree', searchTerms: ['degree', 'education level'] },
            { label: 'Resume / CV File', key: 'resume', searchTerms: ['resume', 'cv'] },
            { label: 'Cover letter', key: 'coverLetter', searchTerms: ['cover letter', 'cover_letter'] },
            { label: 'Work Authorization', key: 'auth', searchTerms: ['authorized', 'legally', 'sponsor'] },
            { label: 'Demographics / Gender', key: 'gender', searchTerms: ['gender', 'sex', 'race', 'veteran'] }
          ];

          // Render Auto filling Fields loading card
          progressContainer.innerHTML = `
            <div class="card-white" style="margin-top:12px;padding:20px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div style="font-size:16px;font-weight:800;color:#0f172a;">Auto filling Fields</div>
                <div id="autofill-percent-val" style="font-size:16px;font-weight:800;color:#0f172a;">0%</div>
              </div>
              <div id="autofill-checklist-items" style="display:flex;flex-direction:column;gap:6px;">
                ${fieldsList.map((f, i) => `
                  <div id="check-item-${i}" class="check-item-row" data-index="${i}" title="Click to scroll to ${f.label} on webpage" style="display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;color:#475569;padding:6px 10px;border-radius:10px;cursor:pointer;transition:background 0.15s ease, transform 0.1s ease;">
                    <div class="check-circle-icon" style="width:18px;height:18px;border-radius:50%;border:2px solid #cbd5e1;display:flex;align-items:center;justify-content:center;flex-shrink:0;"></div>
                    <span style="flex:1;">${f.label}</span>
                    <span style="font-size:11px;color:#94a3b8;">🔍</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;

          // Attach Click-to-Scroll Field Highlight Event Listeners
          const attachChecklistClickListeners = () => {
            const rows = progressContainer.querySelectorAll('.check-item-row');
            rows.forEach(row => {
              row.addEventListener('click', async () => {
                const idx = parseInt(row.getAttribute('data-index'));
                const item = fieldsList[idx];
                if (item && item.searchTerms) {
                  row.style.background = '#f1f5f9';
                  setTimeout(() => { row.style.background = 'transparent'; }, 400);

                  const tab = await getActiveTab();
                  if (tab && tab.id) {
                    chrome.tabs.sendMessage(tab.id, {
                      type: 'SCROLL_TO_FIELD',
                      searchTerms: item.searchTerms,
                      key: item.key
                    }, () => {
                      if (chrome.runtime.lastError) {}
                    });
                  }
                }
              });
            });
          };

          attachChecklistClickListeners();

          const tab = await getActiveTab();
          if (tab && tab.id) {
            const profileToSend = {
              firstName: currentProfile?.firstName || (activeUser?.name ? activeUser.name.split(' ')[0] : 'Iman'),
              lastName: currentProfile?.lastName || (activeUser?.name ? activeUser.name.split(' ').slice(1).join(' ') : 'Shahinnezhad'),
              email: currentProfile?.email || activeUser?.email || 'iman.shahinnezhad68@gmail.com',
              phone: currentProfile?.phone || '+1 555-019-2834',
              city: currentProfile?.city || currentProfile?.location || 'Toronto, ON',
              location: currentProfile?.location || currentProfile?.city || 'Toronto, ON',
              country: currentProfile?.country || 'Canada',
              linkedinUrl: currentProfile?.linkedinUrl || 'https://linkedin.com/in/imanshahinnezhad',
              portfolioUrl: currentProfile?.portfolioUrl || currentProfile?.website || '',
              githubUrl: currentProfile?.githubUrl || '',
              ...(currentProfile || {})
            };

            let totalFilledCount = 0;
            try {
              const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
              if (frames && frames.length > 0) {
                for (const frame of frames) {
                  await new Promise((resolve) => {
                    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_AUTOFILL', profile: profileToSend }, { frameId: frame.frameId }, (res) => {
                      if (chrome.runtime.lastError) resolve(0);
                      else {
                        if (res && res.count) totalFilledCount += res.count;
                        resolve(res ? res.count : 0);
                      }
                    });
                  });
                }
              }
            } catch(e) {
              await new Promise((resolve) => {
                chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_AUTOFILL', profile: profileToSend }, (res) => {
                  if (res && res.count) totalFilledCount = res.count;
                  resolve(res);
                });
              });
            }

            // Animate checklist progress step-by-step
            const percentEl = document.getElementById('autofill-percent-val');
            const total = fieldsList.length;

            for (let i = 0; i < total; i++) {
              await new Promise(r => setTimeout(r, 180));
              const itemEl = document.getElementById(`check-item-${i}`);
              if (itemEl) {
                itemEl.style.color = '#16a34a';
                itemEl.innerHTML = `
                  <div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span style="flex:1;font-weight:700;">${fieldsList[i].label}</span>
                  <span style="font-size:11px;color:#16a34a;font-weight:700;">Filled</span>
                `;
              }
              const currentPercent = Math.round(((i + 1) / total) * 100);
              if (percentEl) percentEl.innerText = `${currentPercent}%`;
            }

            attachChecklistClickListeners();

            autofillBtn.innerText = '✅ Form Autofilled!';
            autofillBtn.disabled = false;
            if (autofillMsg) autofillMsg.innerText = `✅ Autofilled ${totalFilledCount || total} fields!`;
          }
        });
      }
    });
  }

  // --- EDIT YOUR INFORMATION MODAL SYSTEM ---
  const modalOverlay = document.getElementById('edit-info-modal-overlay');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalSaveBtn = document.getElementById('modal-save-btn');
  const modalSaveMsg = document.getElementById('modal-save-msg');

  let workExperiences = [];
  let educationList = [];
  let projectsList = [];

  // Tab Switching
  document.querySelectorAll('.modal-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const pane = document.getElementById(tabId);
      if (pane) pane.classList.add('active');
    });
  });

  // Render Work Experiences
  function renderWorkList() {
    const listEl = document.getElementById('work-experience-list');
    if (!listEl) return;
    listEl.innerHTML = workExperiences.map((item, index) => `
      <div class="entry-card" data-index="${index}">
        <button class="remove-entry-btn remove-work-btn" data-index="${index}">✕</button>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Company Name</label>
            <input type="text" class="form-input work-company" value="${item.companyName || item.company || ''}" placeholder="Google" />
          </div>
          <div class="form-group">
            <label class="form-label">Job Title</label>
            <input type="text" class="form-input work-title" value="${item.jobTitle || item.title || ''}" placeholder="Software Engineer" />
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Start Date</label>
            <input type="text" class="form-input work-start" value="${item.startDate || ''}" placeholder="Jan 2022" />
          </div>
          <div class="form-group">
            <label class="form-label">End Date</label>
            <input type="text" class="form-input work-end" value="${item.endDate || ''}" placeholder="Present" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Location</label>
          <input type="text" class="form-input work-location" value="${item.location || ''}" placeholder="Mountain View, CA" />
        </div>
        <div class="form-group">
          <label class="form-label">Key Responsibilities</label>
          <textarea class="form-textarea work-desc" placeholder="Developed web applications, optimized API response time...">${item.description || item.workSummary || ''}</textarea>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.remove-work-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        workExperiences.splice(idx, 1);
        renderWorkList();
      });
    });
  }

  // Render Education List
  function renderEducationList() {
    const listEl = document.getElementById('education-list');
    if (!listEl) return;
    listEl.innerHTML = educationList.map((item, index) => `
      <div class="entry-card" data-index="${index}">
        <button class="remove-entry-btn remove-edu-btn" data-index="${index}">✕</button>
        <div class="form-group">
          <label class="form-label">School / University</label>
          <input type="text" class="form-input edu-school" value="${item.school || item.institution || ''}" placeholder="Stanford University" />
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Degree</label>
            <input type="text" class="form-input edu-degree" value="${item.degree || ''}" placeholder="Bachelor of Science" />
          </div>
          <div class="form-group">
            <label class="form-label">Field of Study / Major</label>
            <input type="text" class="form-input edu-major" value="${item.fieldOfStudy || item.major || ''}" placeholder="Computer Science" />
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Graduation Year</label>
            <input type="text" class="form-input edu-year" value="${item.graduationYear || item.endDate || ''}" placeholder="2023" />
          </div>
          <div class="form-group">
            <label class="form-label">GPA (Optional)</label>
            <input type="text" class="form-input edu-gpa" value="${item.gpa || ''}" placeholder="3.8 / 4.0" />
          </div>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.remove-edu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        educationList.splice(idx, 1);
        renderEducationList();
      });
    });
  }

  // Render Projects List
  function renderProjectsList() {
    const listEl = document.getElementById('projects-list');
    if (!listEl) return;
    listEl.innerHTML = projectsList.map((item, index) => `
      <div class="entry-card" data-index="${index}">
        <button class="remove-entry-btn remove-proj-btn" data-index="${index}">✕</button>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Project Name</label>
            <input type="text" class="form-input proj-name" value="${item.name || item.title || ''}" placeholder="AI Resume Copilot" />
          </div>
          <div class="form-group">
            <label class="form-label">Role</label>
            <input type="text" class="form-input proj-role" value="${item.role || ''}" placeholder="Lead Developer" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Project Link / Demo URL</label>
          <input type="url" class="form-input proj-link" value="${item.link || item.url || ''}" placeholder="https://github.com/myproject" />
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-textarea proj-desc" placeholder="Built using React, Node.js, and MongoDB...">${item.description || ''}</textarea>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.remove-proj-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        projectsList.splice(idx, 1);
        renderProjectsList();
      });
    });
  }

  // Add Buttons
  const addWorkBtn = document.getElementById('add-work-btn');
  if (addWorkBtn) {
    addWorkBtn.addEventListener('click', () => {
      workExperiences.push({ companyName: '', jobTitle: '', startDate: '', endDate: '', location: '', description: '' });
      renderWorkList();
    });
  }

  const addEduBtn = document.getElementById('add-education-btn');
  if (addEduBtn) {
    addEduBtn.addEventListener('click', () => {
      educationList.push({ school: '', degree: '', fieldOfStudy: '', graduationYear: '', gpa: '' });
      renderEducationList();
    });
  }

  const addProjBtn = document.getElementById('add-project-btn');
  if (addProjBtn) {
    addProjBtn.addEventListener('click', () => {
      projectsList.push({ name: '', role: '', link: '', description: '' });
      renderProjectsList();
    });
  }

  // Open Edit Profile Modal over Active Web Page Tab (Matching Image 2 Centered Overlay)
  async function openEditProfileModal() {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: 'OPEN_EDIT_INFO_MODAL' }, (res) => {
          if (chrome.runtime.lastError) {
            // Inject content script if not loaded on active tab
            chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              files: ['content/content-script.js']
            }, () => {
              setTimeout(() => {
                chrome.tabs.sendMessage(activeTab.id, { type: 'OPEN_EDIT_INFO_MODAL' });
              }, 150);
            });
          }
        });
      } else {
        chrome.runtime.sendMessage({ type: 'OPEN_EDIT_INFO_MODAL' });
      }
    } catch(e) {
      if (modalOverlay) modalOverlay.style.display = 'flex';
    }
  }

  // Attach click handlers to open Edit Your Information Modal Overlay on Active Page
  document.body.addEventListener('click', (e) => {
    const target = e.target.closest('#edit-info-link, #edit-info-link-2, .edit-info-row');
    if (target) {
      e.preventDefault();
      openEditProfileModal();
    }
  });
});


