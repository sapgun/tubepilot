// TubePilot popup — tp-i18n.js가 먼저 로드됨
function applyPopupI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = T(el.getAttribute('data-i18n'));
    if (v) el.textContent = v;
  });
  document.documentElement.lang = TP_LANG;
}

(async function init() {
  document.getElementById('ver').textContent = 'v' + chrome.runtime.getManifest().version;

  const s = await chrome.storage.local.get(['tp_enabled', 'tp_lang']);
  const uiLang = (chrome.i18n && chrome.i18n.getUILanguage)
    ? chrome.i18n.getUILanguage() : navigator.language;
  tpSetLang(tpPickLang(s.tp_lang, uiLang));

  const sel = document.getElementById('langsel');
  sel.value = TP_LANG;
  applyPopupI18n();

  const tgl = document.getElementById('enabled');
  tgl.checked = s.tp_enabled !== false;
  tgl.addEventListener('change', () => {
    chrome.storage.local.set({ tp_enabled: tgl.checked });
  });

  // 언어 변경 → 저장 + 팝업 즉시 반영 (유튜브 패널은 storage 리스너로 실시간 리빌드)
  sel.addEventListener('change', async () => {
    tpSetLang(sel.value);
    try { await chrome.storage.local.set({ tp_lang: sel.value }); } catch (e) {}
    applyPopupI18n();
  });

  document.getElementById('openYt').addEventListener('click', () => {
    window.open('https://www.youtube.com/', '_blank');
  });
  document.getElementById('openGh').addEventListener('click', () => {
    window.open('https://github.com/sapgun/tubepilot', '_blank');
  });
})();
