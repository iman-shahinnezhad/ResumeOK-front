// ResumeOK Chrome Extension Popup JS Logic (Redirects automatically to Native Right Side Panel)

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (chrome.sidePanel && chrome.sidePanel.open && tab && tab.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
      window.close();
      return;
    }
  } catch (e) {}

  // Fallback if sidePanel.open is restricted
  chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
  window.close();
});
