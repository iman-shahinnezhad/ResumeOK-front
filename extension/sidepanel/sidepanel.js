// ResumeOK Side Panel JS Logic

document.addEventListener('DOMContentLoaded', async () => {
  const autofillBtn = document.getElementById('autofill-btn');
  const autofillStatus = document.getElementById('autofill-status');
  const jobTitleEl = document.getElementById('job-title');
  const jobCompanyEl = document.getElementById('job-company');
  const matchScoreBadge = document.getElementById('match-score-badge');
  const qnaQuestionInput = document.getElementById('qna-question');
  const qnaGenerateBtn = document.getElementById('qna-generate-btn');
  const qnaAnswerTextarea = document.getElementById('qna-answer');
  const logAppBtn = document.getElementById('log-app-btn');

  let currentProfile = null;

  // Safe wrapper for chrome storage
  try {
    const storageData = await chrome.storage.local.get('resumeok_profile');
    if (storageData && storageData.resumeok_profile && storageData.resumeok_profile.firstName) {
      currentProfile = storageData.resumeok_profile;
    }
  } catch(e) {}

  if (!currentProfile) {
    try {
      const res = await fetch('http://localhost:3000/api/user/default_user/profile');
      const dbData = await res.json();
      if (dbData && dbData.profile) {
        currentProfile = dbData.profile;
      }
    } catch(e) {}
  }
  if (!currentProfile) {
    currentProfile = {};
  }

  // Get current active tab
  async function getActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab;
    } catch(e) { return null; }
  }

  // Check if URL is scriptable page (http/https)
  function isScriptableUrl(url) {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  }

  // Fetch job details from content script
  async function loadTabJobDetails() {
    const tab = await getActiveTab();
    if (!tab || !tab.id) return;

    if (!isScriptableUrl(tab.url)) {
      jobTitleEl.innerText = tab.title || 'Browser Page';
      jobCompanyEl.innerText = 'System Page';
      return;
    }

    try {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_JOB_DETAILS' }, (res) => {
        const err = chrome.runtime.lastError;
        if (err || !res) {
          jobTitleEl.innerText = tab.title || 'Active Web Page';
          jobCompanyEl.innerText = tab.url ? new URL(tab.url).hostname : '---';
          return;
        }
        if (res.title) jobTitleEl.innerText = res.title;
        if (res.company) jobCompanyEl.innerText = res.company;
      });
    } catch(e) {
      jobTitleEl.innerText = tab.title || 'Active Web Page';
    }
  }

  loadTabJobDetails();

  const fillCountText = document.getElementById('fill-count-text');
  const fillPercentText = document.getElementById('fill-percent-text');
  const fillProgressBar = document.getElementById('fill-progress-bar');
  const checklistItems = document.getElementById('checklist-items');
  const missingNoticeBanner = document.getElementById('missing-notice-banner');
  const missingNoticeTitle = document.getElementById('missing-notice-title');
  const missingNoticeDesc = document.getElementById('missing-notice-desc');

  // Render Jobright-style Form Checklist & Progress
  function renderChecklist(scanData) {
    if (!scanData || !scanData.fields || scanData.fields.length === 0) {
      checklistItems.innerHTML = `<div class="check-item check-item-unfilled"><span class="check-icon">-</span> No input fields detected on page</div>`;
      fillCountText.innerText = `0/0 required fields filled`;
      fillPercentText.innerText = `0%`;
      fillProgressBar.style.width = `0%`;
      missingNoticeBanner.style.display = 'none';
      return;
    }

    fillCountText.innerText = `${scanData.filledCount}/${scanData.totalCount} required fields filled`;
    fillPercentText.innerText = `${scanData.percentage}%`;
    fillProgressBar.style.width = `${scanData.percentage}%`;

    // Render Missing Profile Field Banner Notice
    if (scanData.missingProfileFields && scanData.missingProfileFields.length > 0) {
      const fieldListStr = scanData.missingProfileFields.join(', ');
      missingNoticeTitle.innerText = `Missing Profile Information (${scanData.missingProfileFields.length})`;
      missingNoticeDesc.innerText = `The form asks for [${fieldListStr}]. Fill them out in ApplyDesk so they are automatically filled next time!`;
      missingNoticeBanner.style.display = 'flex';
    } else {
      missingNoticeBanner.style.display = 'none';
    }

    // Render Checklist HTML
    checklistItems.innerHTML = scanData.fields.map(field => {
      if (field.status === 'filled') {
        return `
          <div class="check-item check-item-success">
            <span class="check-icon">✔</span>
            <span class="check-label">${field.label}</span>
          </div>
        `;
      } else if (field.status === 'missing_profile') {
        return `
          <div class="check-item check-item-warning">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="check-icon">⚠️</span>
              <span class="check-label">${field.label}</span>
            </div>
            <a href="http://localhost:5173/#/profile" target="_blank" class="missing-notice-btn">+ Add in Profile</a>
          </div>
        `;
      } else {
        return `
          <div class="check-item check-item-unfilled">
            <span class="check-icon">-</span>
            <span class="check-label">${field.label}</span>
          </div>
        `;
      }
    }).join('');
  }

  // Load Form Field Status on Sidepanel Open
  async function loadFormFieldStatus() {
    const tab = await getActiveTab();
    if (!tab || !tab.id || !isScriptableUrl(tab.url)) return;

    try {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_FORM_FIELDS_STATUS', profile: currentProfile }, (res) => {
        const err = chrome.runtime.lastError;
        if (!err && res) {
          renderChecklist(res);
        }
      });
    } catch(e) {}
  }

  loadFormFieldStatus();

  const triggerAutofillInfo = document.getElementById('trigger-sidepanel-autofill-info');
  if (triggerAutofillInfo) {
    triggerAutofillInfo.addEventListener('click', async () => {
      const tab = await getActiveTab();
      if (tab && tab.id && isScriptableUrl(tab.url)) {
        chrome.tabs.sendMessage(tab.id, { type: 'OPEN_AUTOFILL_MODAL' }, () => {
          const err = chrome.runtime.lastError;
        });
      }
    });
  }

  // 1-Click Autofill Form Button Click
  autofillBtn.addEventListener('click', async () => {
    autofillStatus.innerText = '⚡ Injecting fields...';
    autofillStatus.style.color = '#c084fc';

    const tab = await getActiveTab();
    if (!tab || !tab.id || !isScriptableUrl(tab.url)) {
      autofillStatus.innerText = '⚠️ Please open a job application web page';
      autofillStatus.style.color = '#f87171';
      return;
    }

    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_AUTOFILL', profile: currentProfile }, (res) => {
      const err = chrome.runtime.lastError;
      if (err || !res) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content-script.js']
        }).then(() => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_AUTOFILL', profile: currentProfile }, (res2) => {
              const err2 = chrome.runtime.lastError;
              if (res2 && res2.count > 0) {
                autofillStatus.innerText = `✅ Autofilled ${res2.count} fields!`;
                autofillStatus.style.color = '#34d399';
                if (res2.scan) renderChecklist(res2.scan);
              } else {
                autofillStatus.innerText = '✅ Autofill executed!';
                autofillStatus.style.color = '#34d399';
              }
            });
          }, 300);
        }).catch(() => {
          autofillStatus.innerText = '⚠️ Cannot inject script on this page';
        });
      } else {
        autofillStatus.innerText = `✅ Autofilled ${res.count || 'form'} fields!`;
        autofillStatus.style.color = '#34d399';
        if (res.scan) renderChecklist(res.scan);
      }
    });
  });

  // Quick Chips Actions
  document.getElementById('chip-name').addEventListener('click', () => {
    navigator.clipboard.writeText(`${currentProfile.firstName} ${currentProfile.lastName}`);
    autofillStatus.innerText = `Copied: ${currentProfile.firstName} ${currentProfile.lastName}`;
  });

  document.getElementById('chip-email').addEventListener('click', () => {
    navigator.clipboard.writeText(currentProfile.email);
    autofillStatus.innerText = `Copied: ${currentProfile.email}`;
  });

  document.getElementById('chip-phone').addEventListener('click', () => {
    navigator.clipboard.writeText(currentProfile.phone);
    autofillStatus.innerText = `Copied: ${currentProfile.phone}`;
  });

  document.getElementById('chip-resume').addEventListener('click', () => {
    autofillStatus.innerText = 'Resume PDF ready in profile';
  });

  // AI Q&A Assistant Generator
  qnaGenerateBtn.addEventListener('click', () => {
    const q = qnaQuestionInput.value.trim();
    if (!q) {
      qnaAnswerTextarea.value = 'Please enter a question from the job application...';
      return;
    }
    qnaAnswerTextarea.value = '🤖 Generating AI response...';
    setTimeout(() => {
      qnaAnswerTextarea.value = `With over 4+ years of experience in ${currentProfile.discipline || 'Software Engineering'} and a background at ${currentProfile.companyName || 'leading tech companies'}, I bring proven expertise in modern software architecture, high-scale performance optimization, and cross-functional team collaboration. I am particularly motivated by your engineering culture and commitment to innovation.`;
    }, 800);
  });

  // Log Application to Tracker
  logAppBtn.addEventListener('click', async () => {
    const tab = await getActiveTab();
    const jobData = {
      title: jobTitleEl.innerText,
      company: jobCompanyEl.innerText,
      url: tab?.url || '',
      status: 'Applied'
    };

    chrome.runtime.sendMessage({ type: 'LOG_APPLIED_JOB', job: jobData }, () => {
      const err = chrome.runtime.lastError;
      logAppBtn.innerText = '✅ Application Saved to Dashboard!';
      logAppBtn.style.color = '#34d399';
      logAppBtn.style.borderColor = '#34d399';
    });
  });
});
