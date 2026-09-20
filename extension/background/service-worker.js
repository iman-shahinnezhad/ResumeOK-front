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
      if (message.type === 'SYNC_WEB_AUTH') {
        if (message.token && message.user) {
          await chrome.storage.local.set({
            resumeok_token: message.token,
            resumeok_user: message.user
          });
          console.log('[ServiceWorker] Synced user auth session from web app:', message.user.email || message.user.id);
        }
        sendResponse({ success: true });
      } else if (message.type === 'GET_AUTH_STATUS') {
        const data = await chrome.storage.local.get(['resumeok_token', 'resumeok_user']);
        const isLoggedIn = Boolean(data.resumeok_token && data.resumeok_user);
        sendResponse({
          isLoggedIn,
          token: data.resumeok_token || null,
          user: data.resumeok_user || null
        });
      } else if (message.type === 'LOGOUT') {
        await chrome.storage.local.remove(['resumeok_token', 'resumeok_user', 'resumeok_profile', 'resumeok_resumes']);
        sendResponse({ success: true });
      } else if (message.type === 'OPEN_SIDE_PANEL' || message.type === 'TOGGLE_DRAWER' || message.type === 'OPEN_NATIVE_SIDE_PANEL') {
        const tabId = sender.tab ? sender.tab.id : null;
        const windowId = sender.tab ? sender.tab.windowId : null;
        if (chrome.sidePanel && chrome.sidePanel.open) {
          if (tabId) {
            await chrome.sidePanel.open({ tabId: tabId }).catch(async () => {
              if (windowId) await chrome.sidePanel.open({ windowId: windowId }).catch(() => {});
            });
          } else if (windowId) {
            await chrome.sidePanel.open({ windowId: windowId }).catch(() => {});
          }
        }
        sendResponse({ success: true });
      } else if (message.type === 'SAVE_PROFILE_STORAGE') {
        await chrome.storage.local.set({ resumeok_profile: message.profile });
        
        // Sync to database if user token exists
        const data = await chrome.storage.local.get(['resumeok_token', 'resumeok_user']);
        if (data.resumeok_token && data.resumeok_user) {
          const userId = data.resumeok_user.id;
          const apiUrls = [
            'http://188.166.164.115:3030',
            'http://localhost:3000',
            'http://localhost:3030'
          ];
          for (const baseUrl of apiUrls) {
            try {
              const res = await fetch(`${baseUrl}/api/user/${userId}/profile`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${data.resumeok_token}`
                },
                body: JSON.stringify({ profile: message.profile })
              });
              if (res.ok) {
                console.log('[ServiceWorker] Synced profile changes to database.');
                break;
              }
            } catch(e) {}
          }
        }
        sendResponse({ success: true });
      } else if (message.type === 'GET_PROFILE_STORAGE') {
        const data = await chrome.storage.local.get('resumeok_profile');
        sendResponse({ profile: data.resumeok_profile || null });
      } else if (message.type === 'SAVE_JOB_TO_DB') {
        const data = await chrome.storage.local.get(['resumeok_token', 'resumeok_user']);
        if (data.resumeok_token && data.resumeok_user) {
          const userId = data.resumeok_user.id;
          const apiUrls = [
            'http://188.166.164.115:3030',
            'http://localhost:3000',
            'http://localhost:3030'
          ];
          let saved = false;
          for (const baseUrl of apiUrls) {
            try {
              const res = await fetch(`${baseUrl}/api/user-jobs/${userId}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${data.resumeok_token}`
                },
                body: JSON.stringify({
                  type: 'applied',
                  jobId: message.jobId || String(Date.now()),
                  jobData: message.jobData
                })
              });
              if (res.ok) {
                saved = true;
                console.log('[ServiceWorker] Saved job to database user_jobs collection:', message.jobData.title);
                break;
              }
            } catch(e) {}
          }
          sendResponse({ success: saved });
        } else {
          sendResponse({ success: false, error: 'User not logged in' });
        }
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

