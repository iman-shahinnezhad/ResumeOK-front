// ResumeOK Chrome Extension Background Service Worker

// Open side panel when requested or on action click behavior
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

// Listener for messages from popup, sidepanel, or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'OPEN_SIDE_PANEL') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          await chrome.sidePanel.open({ tabId: tab.id });
          sendResponse({ success: true });
        }
      } else if (message.type === 'SAVE_PROFILE_STORAGE') {
        await chrome.storage.local.set({ resumeok_profile: message.profile });
        sendResponse({ success: true });
      } else if (message.type === 'GET_PROFILE_STORAGE') {
        const data = await chrome.storage.local.get('resumeok_profile');
        sendResponse({ profile: data.resumeok_profile || null });
      } else if (message.type === 'LOG_APPLIED_JOB') {
        const data = await chrome.storage.local.get('resumeok_applications');
        const list = data.resumeok_applications || [];
        list.unshift({
          ...message.job,
          timestamp: new Date().toISOString()
        });
        await chrome.storage.local.set({ resumeok_applications: list });
        sendResponse({ success: true });
      } else if (message.type === 'FORM_DETECTED') {
        if (sender.tab && sender.tab.id) {
          await chrome.action.setBadgeText({ tabId: sender.tab.id, text: 'FIT' });
          await chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: '#000000' });
        }
        sendResponse({ success: true });
      }
    } catch (err) {
      console.error('Service worker message error:', err);
      sendResponse({ error: String(err) });
    }
  })();
  return true; // Keep response channel open
});
