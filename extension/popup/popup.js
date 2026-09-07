// ResumeOK Chrome Extension Popup JS Logic

document.addEventListener('DOMContentLoaded', async () => {
  const autofillBtn = document.getElementById('popup-autofill-btn');
  const sidepanelBtn = document.getElementById('popup-sidepanel-btn');
  const profileName = document.getElementById('profile-name');
  const profileEmail = document.getElementById('profile-email');
  const profileTitle = document.getElementById('profile-title');

  let currentProfile = null;

  // Read stored profile
  const storage = await chrome.storage.local.get('resumeok_profile');
  if (storage.resumeok_profile) {
    currentProfile = storage.resumeok_profile;
    profileName.innerText = `${currentProfile.firstName || ''} ${currentProfile.lastName || ''}`.trim() || 'Omid Moradi';
    profileEmail.innerText = currentProfile.email || 'omid@example.com';
    profileTitle.innerText = currentProfile.jobTitle || 'Software Engineer';
  }

  // Handle 1-Click Autofill from Popup
  autofillBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    autofillBtn.innerText = '⚡ Filling Form...';

    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_AUTOFILL', profile: currentProfile }, (res) => {
      if (chrome.runtime.lastError || !res) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content-script.js']
        }).then(() => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_AUTOFILL', profile: currentProfile }, () => {
              autofillBtn.innerText = '✅ Form Autofilled!';
            });
          }, 300);
        });
      } else {
        autofillBtn.innerText = `✅ Autofilled ${res.count || ''} Fields!`;
      }
    });
  });

  // Open Side Panel
  sidepanelBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
    }
  });
});
