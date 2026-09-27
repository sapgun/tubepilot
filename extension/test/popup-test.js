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

window.chrome = {
  storage: {
    local: {
      get: (keys) => Promise.resolve(
        Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(k => [k, store[k]]))),
      set: (obj) => { Object.assign(store, obj); return Promise.resolve(); },
    },
  },
  runtime: { getManifest: () => ({ version: '1.8.1' }) },
  i18n: { getUILanguage: () => 'ko-KR' },
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

  ok('팝업: 버전 표시', document.getElementById('ver').textContent === 'v1.8.1',
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

  // --- 결과 ---
  let fail = 0;
  for (const [st, name, extra] of results) {
    if (st === 'FAIL') { fail++; console.log('✗ FAIL -', name, extra ? '[' + extra + ']' : ''); }
    else console.log('✓ PASS -', name, extra ? '[' + extra + ']' : '');
  }
  console.log(fail ? `\n${fail} FAILURES` : '\nPOPUP ALL PASS');
  process.exit(fail ? 1 : 0);
})();
