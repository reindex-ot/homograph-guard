importScripts('detector.js');

const bypassedUrls = new Set();

chrome.webNavigation.onBeforeNavigate.addListener((details) => {

  if (details.frameId !== 0) return;

  const targetUrl = details.url;

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) return;

  if (bypassedUrls.has(targetUrl)) {
    bypassedUrls.delete(targetUrl);
    return;
  }

  try {
    const parsed = new URL(targetUrl);
    const check = detectHomograph(parsed.hostname);

    if (check.suspicious) {

      const warningUrl = chrome.runtime.getURL(
        `warning.html?url=${encodeURIComponent(targetUrl)}&reason=${encodeURIComponent(check.reason)}&details=${encodeURIComponent(check.details || '')}`
      );
      chrome.tabs.update(details.tabId, { url: warningUrl });
    }
  } catch (e) {

  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'bypassUrl' && message.url) {
    bypassedUrls.add(message.url);
    sendResponse({ success: true });
  }
});
