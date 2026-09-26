// ApplyDesk Chrome Extension Background Service Worker

// Listener for messages from popup, sidepanel, or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'SYNC_WEB_AUTH') {
        if (message.token) {
          const userObj = message.user ? (typeof message.user === 'string' ? JSON.parse(message.user) : message.user) : { token: message.token };
          await chrome.storage.local.set({
            resumeok_token: message.token,
            resumeok_user: userObj
          });
          console.log('[ServiceWorker] Synced user auth session from web app:', userObj.email || userObj.id || message.token);

          // Fetch full user details if missing
          if (!userObj.id || !userObj.email) {
            try {
              const res = await fetch('https://api.applydesk.io/api/auth/me', {
                headers: { 'Authorization': `Bearer ${message.token}` }
              });
              if (res.ok) {
                const data = await res.json();
                if (data && data.user) {
                  await chrome.storage.local.set({ resumeok_user: data.user });
                }
              }
            } catch(e) {}
          }
        }
        sendResponse({ success: true });
      } else if (message.type === 'GET_AUTH_STATUS') {
        const data = await chrome.storage.local.get(['resumeok_token', 'resumeok_user']);
        const isLoggedIn = Boolean(data.resumeok_token);
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
            'https://api.applydesk.io',
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
        if (data.resumeok_user && data.resumeok_token) {
          const userId = data.resumeok_user.id;
          const apiUrls = [
            'https://api.applydesk.io',
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
      } else if (message.type === 'OPEN_SIDE_PANEL') {
        if (sender.tab && sender.tab.id) {
          chrome.tabs.sendMessage(sender.tab.id, { type: 'TOGGLE_FLOATING_PANEL' }, () => {
            if (chrome.runtime.lastError) {}
          });
        }
        sendResponse({ success: true, method: 'drawer' });
      }
    } catch (err) {
      console.error('Service worker message error:', err);
      sendResponse({ error: String(err) });
    }
  })();
  return true;
});

// Action Click -> Toggle Tab-Specific In-Page Sliding Overlay Drawer
if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(async (tab) => {
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_FLOATING_PANEL' }, () => {
        if (chrome.runtime.lastError) {
          // If content script was not injected on this tab, inject dynamically
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/content-script.js']
          }, () => {
            if (!chrome.runtime.lastError) {
              setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_FLOATING_PANEL' });
              }, 150);
            }
          });
        }
      });
    }
  });
}

// Automatically sync web auth session whenever user visits or refreshes ApplyDesk web app
try {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab && tab.url) {
      const isApplyDesk = tab.url.includes('applydesk') || tab.url.includes('188.166.164.115') || tab.url.includes('localhost') || tab.url.includes('127.0.0.1');
      if (isApplyDesk) {
        chrome.tabs.sendMessage(tabId, { type: 'CHECK_WEB_AUTH' }, () => {
          if (chrome.runtime.lastError) { /* ignore */ }
        });
      }
    }
  });
} catch(e) {}


