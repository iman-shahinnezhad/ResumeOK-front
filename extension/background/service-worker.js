// ApplyDesk Chrome Extension Background Service Worker

// Configure Chrome Native Side Panel behavior to open on action click
function configureSidePanel() {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.log('SidePanel behavior set error:', err);
    });
  }
}

// Set behavior immediately on worker load
configureSidePanel();

chrome.runtime.onInstalled.addListener(() => {
  configureSidePanel();
});

// Explicit action click fallback to guarantee side panel opens on right side
if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(async (tab) => {
    try {
      if (chrome.sidePanel && chrome.sidePanel.open) {
        if (tab && tab.id) {
          await chrome.sidePanel.open({ tabId: tab.id });
        } else if (tab && tab.windowId) {
          await chrome.sidePanel.open({ windowId: tab.windowId });
        }
      }
    } catch (err) {
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_DRAWER' });
      }
    }
  });
}

// Listener for messages from sidepanel or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'OPEN_SIDE_PANEL' || message.type === 'TOGGLE_DRAWER') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          if (chrome.sidePanel && chrome.sidePanel.open) {
            chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
              chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_DRAWER' });
            });
          } else {
            chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_DRAWER' });
          }
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
