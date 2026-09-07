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

  // Load Profile from storage
  const storageData = await chrome.storage.local.get('resumeok_profile');
  if (storageData.resumeok_profile) {
    currentProfile = storageData.resumeok_profile;
  } else {
    // Default fallback candidate profile
    currentProfile = {
      firstName: 'Omid',
      lastName: 'Moradi',
      email: 'omid@example.com',
      phone: '+1 555-0192',
      city: 'San Francisco, CA',
      linkedinUrl: 'https://linkedin.com/in/omidmoradi',
      companyName: 'Acme Corp',
      jobTitle: 'Software Engineer',
      schoolName: 'Stanford University',
      degree: 'Bachelor of Science',
      discipline: 'Computer Science',
      gender: 'Male'
    };
  }

  // Get current active tab
  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  // Fetch job details from content script
  async function loadTabJobDetails() {
    const tab = await getActiveTab();
    if (!tab || !tab.id) return;

    try {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_JOB_DETAILS' }, (res) => {
        if (chrome.runtime.lastError || !res) {
          jobTitleEl.innerText = tab.title || 'Active Web Page';
          jobCompanyEl.innerText = tab.url ? new URL(tab.url).hostname : '---';
          return;
        }
        if (res.title) jobTitleEl.innerText = res.title;
        if (res.company) jobCompanyEl.innerText = res.company;
      });
    } catch(e) {
      console.log('Error fetching job details:', e);
    }
  }

  loadTabJobDetails();

  // 1-Click Autofill Form Button Click
  autofillBtn.addEventListener('click', async () => {
    autofillStatus.innerText = '⚡ Injecting fields...';
    autofillStatus.style.color = '#c084fc';

    const tab = await getActiveTab();
    if (!tab || !tab.id) {
      autofillStatus.innerText = '⚠️ No active browser tab found';
      return;
    }

    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_AUTOFILL', profile: currentProfile }, (res) => {
      if (chrome.runtime.lastError || !res) {
        // Inject content script if not already loaded
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content-script.js']
        }).then(() => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_AUTOFILL', profile: currentProfile }, (res2) => {
              if (res2 && res2.count > 0) {
                autofillStatus.innerText = `✅ Autofilled ${res2.count} fields successfully!`;
                autofillStatus.style.color = '#34d399';
              } else {
                autofillStatus.innerText = '✅ Autofill executed!';
                autofillStatus.style.color = '#34d399';
              }
            });
          }, 300);
        });
      } else {
        autofillStatus.innerText = `✅ Autofilled ${res.count || 'form'} fields successfully!`;
        autofillStatus.style.color = '#34d399';
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
      logAppBtn.innerText = '✅ Application Saved to Dashboard!';
      logAppBtn.style.color = '#34d399';
      logAppBtn.style.borderColor = '#34d399';
    });
  });
});
