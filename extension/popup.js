const verEl = document.getElementById('ver');
verEl.textContent = 'v' + chrome.runtime.getManifest().version;

const tgl = document.getElementById('enabled');
chrome.storage.local.get(['tp_enabled']).then((s) => {
  tgl.checked = s.tp_enabled !== false;
});
tgl.addEventListener('change', () => {
  chrome.storage.local.set({ tp_enabled: tgl.checked });
});

document.getElementById('openYt').addEventListener('click', () => {
  window.open('https://www.youtube.com/', '_blank');
});
document.getElementById('openGh').addEventListener('click', () => {
  window.open('https://github.com/sapgun/tubepilot', '_blank');
});
