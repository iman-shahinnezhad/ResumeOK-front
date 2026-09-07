// ResumeOK Chrome Extension Popup JS Logic

document.addEventListener('DOMContentLoaded', async () => {
  const autofillBtn = document.getElementById('popup-autofill-btn');
  const sidepanelBtn = document.getElementById('popup-sidepanel-btn');
  const profileName = document.getElementById('profile-name');
  const profileEmail = document.getElementById('profile-email');
  const profileTitle = document.getElementById('profile-title');

  let currentProfile = null;

  // Read stored profile with safe error handling
  try {
    const storage = await chrome.storage.local.get('resumeok_profile');
    if (storage && storage.resumeok_profile) {
      currentProfile = storage.resumeok_profile;
      profileName.innerText = `${currentProfile.firstName || ''} ${currentProfile.lastName || ''}`.trim() || 'User Profile';
      profileEmail.innerText = currentProfile.email || '';
      profileTitle.innerText = currentProfile.jobTitle || '';
    }
  } catch(e) {}

  // Handle 1-Click Autofill from Popup
  autofillBtn.addEventListener('click', async () => {
    let tab = null;
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = tabs[0];
    } catch(e) {}

    if (!tab || !tab.id || !tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
      autofillBtn.innerText = '⚠️ Open a Web Page First';
      return;
    }

    autofillBtn.innerText = '⚡ Filling Form...';

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
              autofillBtn.innerText = '✅ Form Autofilled!';
            });
          }, 300);
        }).catch(() => {
          autofillBtn.innerText = '⚠️ Page Not Scriptable';
        });
      } else {
        autofillBtn.innerText = `✅ Autofilled ${res.count || ''} Fields!`;
      }
    });
  });

  // Open Side Panel
  sidepanelBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
      }
    } catch(e) {}
  });
});
