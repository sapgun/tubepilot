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

  const s = await chrome.storage.local.get(['tp_enabled', 'tp_lang', 'tp_cfg']);
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

  // 스크린샷 저장 방식
  const shotSel = document.getElementById('shotmodesel');
  shotSel.value = (s.tp_cfg && s.tp_cfg.shotMode) || 'download';
  shotSel.addEventListener('change', async () => {
    try {
      const cur = await chrome.storage.local.get(['tp_cfg']);
      const cfg = Object.assign({}, cur.tp_cfg, { shotMode: shotSel.value });
      await chrome.storage.local.set({ tp_cfg: cfg });
    } catch (e) {}
  });

  /* ---------- 단축키 설정 ---------- */
  const TP_DEFAULT_HOTKEYS = { shot: 'Alt+S', comments: 'Alt+H', save: 'Alt+B' };
  let curHotkeys = Object.assign({}, TP_DEFAULT_HOTKEYS, (s.tp_cfg && s.tp_cfg.hotkeys) || {});
  const hkBtns = {
    shot: document.getElementById('hkShot'),
    comments: document.getElementById('hkComments'),
    save: document.getElementById('hkSave'),
  };
  const hkErr = document.getElementById('hkErr');
  let capturing = null;
  function renderHotkeys() {
    for (const k of Object.keys(hkBtns)) {
      hkBtns[k].textContent = curHotkeys[k] || TP_DEFAULT_HOTKEYS[k];
      hkBtns[k].classList.remove('tp-capturing');
    }
  }
  function tpComboFromEvent(e) {
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Meta');
    let k = e.key || '';
    if (k === ' ') k = 'Space';
    else if (/^f\d{1,2}$/i.test(k)) k = k.toUpperCase();
    else if (k.length === 1) k = k.toUpperCase();
    else return null;
    if (['CONTROL', 'ALT', 'SHIFT', 'META'].includes(k.toUpperCase())) return null;
    parts.push(k);
    return parts.join('+');
  }
  // 조합키 1개 이상 필수 (단, F1~F12는 단독 허용)
  function tpValidCombo(combo) {
    const parts = combo.split('+');
    if (/^F\d{1,2}$/.test(parts[parts.length - 1]) && parts.length === 1) return true;
    return parts.length >= 2;
  }
  if (typeof window !== 'undefined') {
    window.__tpCombo = { fromEvent: tpComboFromEvent, valid: tpValidCombo };
  }
  renderHotkeys();
  for (const k of Object.keys(hkBtns)) {
    hkBtns[k].addEventListener('click', () => {
      renderHotkeys();
      capturing = k;
      hkBtns[k].textContent = T('hk_press');
      hkBtns[k].classList.add('tp-capturing');
      hkErr.textContent = '';
    });
  }
  document.getElementById('hkReset').addEventListener('click', async () => {
    curHotkeys = Object.assign({}, TP_DEFAULT_HOTKEYS);
    capturing = null;
    renderHotkeys();
    hkErr.textContent = '';
    try {
      const cur = await chrome.storage.local.get(['tp_cfg']);
      await chrome.storage.local.set({ tp_cfg: Object.assign({}, cur.tp_cfg, { hotkeys: curHotkeys }) });
    } catch (e) {}
  });
  document.addEventListener('keydown', async (e) => {
    if (!capturing) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') { capturing = null; renderHotkeys(); return; }
    const combo = tpComboFromEvent(e);
    if (!combo || !tpValidCombo(combo)) {
      hkErr.textContent = T('hk_invalid');
      return; // 계속 입력 대기
    }
    curHotkeys[capturing] = combo;
    capturing = null;
    renderHotkeys();
    hkErr.textContent = '';
    try {
      const cur = await chrome.storage.local.get(['tp_cfg']);
      await chrome.storage.local.set({ tp_cfg: Object.assign({}, cur.tp_cfg, { hotkeys: curHotkeys }) });
    } catch (e) {}
  }, true);

  document.getElementById('openYt').addEventListener('click', () => {
    window.open('https://www.youtube.com/', '_blank');
  });
  document.getElementById('openGh').addEventListener('click', () => {
    window.open('https://github.com/sapgun/tubepilot', '_blank');
  });

  /* ---------- 개발자 · 후원 ---------- */
  const TP_ETH = '0xe8F1B706223652E672ffF62cE1FEf9c7C98eFc68';
  const TP_SOL = 'BzsE914REG8op1uonEv7rz2NxiS9k3Jcrivz84NdNd5H';
  const tpTrunc = (a) => a.length > 14 ? a.slice(0, 6) + '…' + a.slice(-4) : a;
  // ETH: MetaMask 유니버설 링크 (앱이면 전송 화면으로, 없으면 안내 페이지)
  const tpEthWalletUrl = () => 'https://metamask.app.link/send/' + TP_ETH + '@1';
  // SOL: Solana Pay 표준 URI (Phantom/Solflare 모바일이 처리)
  const tpSolWalletUrl = () => 'solana:' + TP_SOL +
    '?label=TubePilot&message=' + encodeURIComponent('Support TubePilot');
  if (typeof window !== 'undefined') {
    window.__tpDonate = { eth: TP_ETH, sol: TP_SOL, ethWalletUrl: tpEthWalletUrl, solWalletUrl: tpSolWalletUrl };
  }
  document.getElementById('ethAddr').textContent = tpTrunc(TP_ETH);
  document.getElementById('solAddr').textContent = tpTrunc(TP_SOL);

  document.getElementById('openX').addEventListener('click', () => {
    window.open('https://x.com/0xSAPGUN', '_blank');
  });
  document.getElementById('openMail').addEventListener('click', () => {
    window.open('mailto:sapgun@trenchclub.dev', '_blank');
  });
  document.getElementById('openKofi').addEventListener('click', () => {
    window.open('https://ko-fi.com/sapgun', '_blank');
  });

  function tpCopyFallback(text, done) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove(); done();
    } catch (e) {}
  }
  function tpCopy(text, btn) {
    const done = () => {
      const orig = btn.getAttribute('data-i18n') ? T(btn.getAttribute('data-i18n')) : btn.textContent;
      btn.textContent = T('copied');
      setTimeout(() => { btn.textContent = orig; }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => tpCopyFallback(text, done));
    } else tpCopyFallback(text, done);
  }
  document.getElementById('copyEth').addEventListener('click', (e) => tpCopy(TP_ETH, e.target));
  document.getElementById('copySol').addEventListener('click', (e) => tpCopy(TP_SOL, e.target));

  function tpOpenWallet(url) {
    try {
      if (chrome.tabs && chrome.tabs.create) chrome.tabs.create({ url });
      else window.open(url, '_blank');
    } catch (e) { window.open(url, '_blank'); }
  }
  document.getElementById('walletEth').addEventListener('click', () => tpOpenWallet(tpEthWalletUrl()));
  document.getElementById('walletSol').addEventListener('click', () => tpOpenWallet(tpSolWalletUrl()));
})();
