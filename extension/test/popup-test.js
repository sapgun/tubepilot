// TubePilot popup.js 테스트 (jsdom)
// 검증: 5개 언어 렌더링, 언어 변경 즉시 반영 + 저장, 전체 사용 토글, 버전 표시
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const store = { tp_enabled: true };
const html = fs.readFileSync(path.join(__dirname, '..', 'popup.html'), 'utf8');
const dom = new JSDOM(html, {
  url: 'chrome-extension://fake/popup.html',
  pretendToBeVisual: true,
  runScripts: 'dangerously',
});
const { window } = dom;
const document = window.document;

let createdUrl = null;
window.__clipboardText = null;
Object.defineProperty(window.navigator, 'clipboard', {
  value: { writeText: (t) => { window.__clipboardText = t; return Promise.resolve(); } },
  configurable: true,
});
window.chrome = {
  storage: {
    local: {
      get: (keys) => Promise.resolve(
        Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(k => [k, store[k]]))),
      set: (obj) => { Object.assign(store, obj); return Promise.resolve(); },
    },
  },
  runtime: { getManifest: () => ({ version: '1.9.0' }) },
  i18n: { getUILanguage: () => 'ko-KR' },
  tabs: { create: (o) => { createdUrl = o.url; } },
};
window.open = () => {};

window.eval(fs.readFileSync(path.join(__dirname, '..', 'tp-i18n.js'), 'utf8'));
window.eval(fs.readFileSync(path.join(__dirname, '..', 'popup.js'), 'utf8'));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const results = [];
const ok = (name, cond, extra = '') => results.push([cond ? 'PASS' : 'FAIL', name, extra]);

(async () => {
  await sleep(150); // popup init (async IIFE)

  const tagline = () => document.querySelector('[data-i18n="p_tagline"]').textContent;
  const sel = document.getElementById('langsel');

  ok('팝업: 버전 표시', document.getElementById('ver').textContent === 'v1.9.0',
    document.getElementById('ver').textContent);
  ok('팝업: 언어 옵션 5개', sel.options.length === 5,
    [...sel.options].map(o => o.value).join(','));
  ok('팝업: 기본 언어 ko 렌더링', tagline().includes('파워팩'), tagline());

  // 언어 변경 → 즉시 반영 + 저장
  sel.value = 'en';
  sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(100);
  ok('팝업: en 전환 즉시 반영', tagline().includes('Power Pack') || !tagline().includes('파워팩'), tagline());
  ok('팝업: tp_lang 저장됨', store.tp_lang === 'en', String(store.tp_lang));
  ok('팝업: html lang 속성', document.documentElement.lang === 'en',
    document.documentElement.lang);

  sel.value = 'ja';
  sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(100);
  ok('팝업: ja 전환', document.querySelector('[data-i18n="p_enable_all"]').textContent.length > 0);

  // 전체 사용 토글
  const tgl = document.getElementById('enabled');
  ok('팝업: 토글 기본 on', tgl.checked === true);
  tgl.checked = false;
  tgl.dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(50);
  ok('팝업: 토글 off 저장', store.tp_enabled === false);

  // --- 후원 섹션 ---
  const dn = window.__tpDonate;
  ok('후원: 섹션 렌더링', !!document.querySelector('.tp-dev') &&
    document.querySelector('[data-i18n="dev_title"]').textContent.length > 2,
    document.querySelector('[data-i18n="dev_title"]').textContent);
  ok('후원: ETH 주소', dn && dn.eth === '0xe8F1B706223652E672ffF62cE1FEf9c7C98eFc68', dn && dn.eth);
  ok('후원: SOL 주소', dn && dn.sol === 'BzsE914REG8op1uonEv7rz2NxiS9k3Jcrivz84NdNd5H', dn && dn.sol);
  ok('후원: ETH 지갑 URL', dn && dn.ethWalletUrl() ===
    'https://metamask.app.link/send/0xe8F1B706223652E672ffF62cE1FEf9c7C98eFc68@1', dn && dn.ethWalletUrl());
  ok('후원: SOL 지갑 URL', dn && dn.solWalletUrl().startsWith('solana:BzsE914REG8op1uonEv7rz2NxiS9k3Jcrivz84NdNd5H?'),
    dn && dn.solWalletUrl());
  document.getElementById('walletEth').click();
  await sleep(20);
  ok('후원: 지갑 버튼 → 탭 열기', createdUrl === dn.ethWalletUrl(), createdUrl);
  document.getElementById('copyEth').click();
  await sleep(20);
  ok('후원: 복사 → 전체 주소', window.__clipboardText === dn.eth, window.__clipboardText);
  document.getElementById('copySol').click();
  await sleep(20);
  ok('후원: SOL 복사', window.__clipboardText === dn.sol, window.__clipboardText);

  // --- 스크린샷 저장 방식 ---
  const shotSel = document.getElementById('shotmodesel');
  ok('스크린샷 모드: select 존재', !!shotSel && shotSel.options.length === 3,
    shotSel ? shotSel.options.length : 'no sel');
  ok('스크린샷 모드: 기본 download', shotSel.value === 'download', shotSel.value);
  shotSel.value = 'clipboard';
  shotSel.dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(50);
  ok('스크린샷 모드: 저장됨', store.tp_cfg && store.tp_cfg.shotMode === 'clipboard',
    JSON.stringify(store.tp_cfg));

  // --- 단축키 설정 UI ---
  const TC = window.__tpCombo;
  ok('단축키 콤보 생성', TC.fromEvent({ altKey: true, key: 'k' }) === 'Alt+K' &&
    TC.fromEvent({ ctrlKey: true, shiftKey: true, key: 'F5' }) === 'Ctrl+Shift+F5',
    TC.fromEvent({ altKey: true, key: 'k' }));
  ok('단축키 콤보 검증', TC.valid('Alt+K') && !TC.valid('X') && TC.valid('F5'));
  const hkShot = document.getElementById('hkShot');
  ok('단축키 UI: 버튼 존재',
    !!hkShot && !!document.getElementById('hkComments') && !!document.getElementById('hkSave'));
  ok('단축키 UI: 기본값 표시', hkShot.textContent === 'Alt+S', hkShot.textContent);
  hkShot.click();
  await sleep(20);
  ok('단축키 UI: 입력 대기', hkShot.classList.contains('tp-capturing'));
  document.dispatchEvent(new window.KeyboardEvent('keydown',
    { key: 'k', altKey: true, bubbles: true, cancelable: true }));
  await sleep(50);
  ok('단축키 UI: Alt+K 저장',
    hkShot.textContent === 'Alt+K' && store.tp_cfg.hotkeys.shot === 'Alt+K',
    hkShot.textContent + ' / ' + JSON.stringify(store.tp_cfg.hotkeys));
  document.getElementById('hkComments').click();
  await sleep(20);
  document.dispatchEvent(new window.KeyboardEvent('keydown',
    { key: 'x', bubbles: true, cancelable: true }));
  await sleep(50);
  ok('단축키 UI: 단일 키 거부', document.getElementById('hkErr').textContent.length > 0,
    document.getElementById('hkErr').textContent);
  document.dispatchEvent(new window.KeyboardEvent('keydown',
    { key: 'Escape', bubbles: true, cancelable: true }));
  await sleep(30);
  ok('단축키 UI: Esc 취소',
    !document.getElementById('hkComments').classList.contains('tp-capturing') &&
    document.getElementById('hkComments').textContent === 'Alt+H');
  document.getElementById('hkReset').click();
  await sleep(50);
  ok('단축키 UI: 초기화',
    hkShot.textContent === 'Alt+S' && store.tp_cfg.hotkeys.shot === 'Alt+S',
    JSON.stringify(store.tp_cfg.hotkeys));

  // --- 결과 ---
  let fail = 0;
  for (const [st, name, extra] of results) {
    if (st === 'FAIL') { fail++; console.log('✗ FAIL -', name, extra ? '[' + extra + ']' : ''); }
    else console.log('✓ PASS -', name, extra ? '[' + extra + ']' : '');
  }
  console.log(fail ? `\n${fail} FAILURES` : '\nPOPUP ALL PASS');
  process.exit(fail ? 1 : 0);
})();
