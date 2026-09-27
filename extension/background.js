// TubePilot background service worker (MV3)
// content script에서는 chrome.tabs를 쓸 수 없으므로 탭 캡처를 여기서 대행
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'TP_CAPTURE') {
    const winId = sender.tab && sender.tab.windowId;
    chrome.tabs.captureVisibleTab(winId, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message || 'capture failed' });
      } else {
        sendResponse({ dataUrl });
      }
    });
    return true; // 비동기 응답
  }
  return false;
});
