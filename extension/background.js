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
  if (msg && msg.type === 'TP_DOWNLOAD') {
    // content script 격리 월드에서 만든 blob URL 앵커 다운로드는 환경에 따라
    // 실패하므로, background의 chrome.downloads 경유로 확실히 저장한다.
    if (!msg.dataUrl || !msg.filename) { sendResponse({ ok: false }); return false; }
    chrome.downloads.download({ url: msg.dataUrl, filename: msg.filename, saveAs: false }, (id) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message || 'download failed' });
      } else {
        sendResponse({ ok: true, id });
      }
    });
    return true; // 비동기 응답
  }
  return false;
});
