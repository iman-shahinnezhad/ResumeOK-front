// ApplyDesk Chrome Extension Background Service Worker

// Listener for messages from popup, sidepanel, or content script
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
// Action Click -> Toggle Floating Overlay Drawer on Active Tab
if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(async (tab) => {
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_FLOATING_PANEL' }, () => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/content-script.js']
          }).then(() => {
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_FLOATING_PANEL' });
            }, 150);
          }).catch(() => {});
        }
      });
    }
  });
}

