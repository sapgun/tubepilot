// TubePilot content.js 기능 테스트 (jsdom)
// 검증: 패널 생성, SponsorBlock 파싱/마킹/자동스킵/클릭이동, 패널 드래그, 플레이어 하단 도킹
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const html = `<!DOCTYPE html><html><head><title>Test Video - YouTube</title></head><body>
<div id="movie_player" class="html5-video-player">
  <div class="html5-video-container"><video class="html5-main-video"></video></div>
  <div class="ytp-chrome-bottom"><div class="ytp-progress-bar-container"><div class="ytp-progress-bar"></div></div></div>
</div>
</body></html>`;

const dom = new JSDOM(html, {
  url: 'https://www.youtube.com/watch?v=TEST1234567',
  pretendToBeVisual: true,
  runScripts: 'dangerously', // window.eval로 content.js를 실제 창 컨텍스트에서 실행
});
const { window } = dom;
const document = window.document;

// ---- chrome.storage stub (메모리) ----
const store = {};
window.chrome = {
  storage: { local: {
    get: (keys) => Promise.resolve(
      Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(k => [k, store[k]]))),
    set: (obj) => { Object.assign(store, obj); return Promise.resolve(); },
  } },
  runtime: { getManifest: () => ({ version: '1.3.0' }) },
};

// ---- fetch stub: 실제 SponsorBlock API 응답 형태 (segment 단수!) ----
const canned = [
  { category: 'sponsor', segment: [10, 20] },
  { category: 'intro', segment: [0, 5] },
];
let fetchCalls = 0;
window.fetch = (url) => {
  fetchCalls++;
  if (String(url).includes('skipSegments')) {
    return Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify(canned)) });
  }
  return Promise.reject(new Error('unexpected fetch: ' + url));
};

// ---- 픽스처 ----
const player = document.getElementById('movie_player');
player.getBoundingClientRect = () => ({
  left: 100, top: 80, right: 900, bottom: 500, width: 800, height: 420, x: 100, y: 80,
  toJSON() { return {}; },
});
const video = document.querySelector('video');
Object.defineProperty(video, 'duration', { value: 100, configurable: true });
video.currentTime = 50; // 어떤 스폰서 구간 밖에서 시작 (초기 자동스킵이 상태 문구를 덮지 않게)

// ---- content.js 실행 (jsdom 창 컨텍스트 — 실제 컨텐트 스크립트와 동일 환경) ----
const code = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
window.eval(code);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const results = [];
const ok = (name, cond, extra = '') => results.push([cond ? 'PASS' : 'FAIL', name, extra]);

(async () => {
  await sleep(600); // boot + fetch + 마커 그리기

  const panel = document.querySelector('#ytpc-panel');
  ok('패널 생성', !!panel);
  ok('API 호출됨', fetchCalls >= 1, fetchCalls + '회');

  // --- 마킹 ---
  const markers = document.querySelectorAll('.ytpc-marker');
  ok('마커 2개 그려짐 (sponsor+intro)', markers.length === 2, markers.length + '개');
  const bar = document.querySelector('#movie_player .ytp-progress-bar');
  ok('진행 바 position:relative 보장', bar && bar.style.position === 'relative');
  if (markers.length === 2) {
    // start 기준 정렬: intro[0,5]가 먼저
    const mIntro = markers[0], mSpon = markers[1];
    ok('intro 마커 left 0%', mIntro.style.left === '0%', mIntro.style.left);
    ok('intro 마커 width 5%', mIntro.style.width === '5%', mIntro.style.width);
    ok('sponsor 마커 left 10%', mSpon.style.left === '10%', mSpon.style.left);
    ok('sponsor 마커 width 10%', mSpon.style.width === '10%', mSpon.style.width);
    const bg = mSpon.style.background;
    ok('sponsor 마커 색상', bg === 'rgb(0, 212, 0)' || bg === '#00d400', bg);
    ok('마커 클릭 가능 (pointer)', window.getComputedStyle(mSpon).pointerEvents !== 'none' ||
       mSpon.style.pointerEvents !== 'none');
    ok('마커 툴팁에 이동 안내', (mSpon.title || '').includes('클릭하면 이동'), mSpon.title);
  }
  const status = document.querySelector('.ytpc-status');
  ok('상태: 스킵 구간 2개 로드됨', status && status.textContent.includes('2개'),
    status && status.textContent);

  // --- 자동 스킵 ---
  video.currentTime = 12; // sponsor 구간 안
  await sleep(600);       // tick(300ms) 2회
  ok('자동 스킵: 구간 끝으로 이동', Math.abs(video.currentTime - 20.05) < 0.01,
    'currentTime=' + video.currentTime);

  // --- 마커 클릭 이동 ---
  const mSpon2 = document.querySelectorAll('.ytpc-marker')[1];
  video.currentTime = 50;
  mSpon2.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  ok('마커 클릭: 구간 시작으로 이동', Math.abs(video.currentTime - 10.1) < 0.01,
    'currentTime=' + video.currentTime);

  // --- 패널 드래그 ---
  const head = panel.querySelector('.ytpc-head');
  panel.getBoundingClientRect = () => ({
    left: 700, top: 500, right: 912, bottom: 700, width: 212, height: 200, x: 700, y: 500,
    toJSON() { return {}; },
  });
  head.dispatchEvent(new window.MouseEvent('mousedown',
    { bubbles: true, clientX: 750, clientY: 510, button: 0 }));
  document.dispatchEvent(new window.MouseEvent('mousemove',
    { bubbles: true, clientX: 650, clientY: 450 }));
  document.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
  ok('드래그: left/top 변경', panel.style.left === '600px' && panel.style.top === '440px',
    panel.style.left + ',' + panel.style.top);
  ok('드래그: panelPos 저장됨',
    !!(store.tp_cfg && store.tp_cfg.panelPos &&
       store.tp_cfg.panelPos.left === '600px' && store.tp_cfg.panelPos.top === '440px'),
    JSON.stringify(store.tp_cfg && store.tp_cfg.panelPos));

  // --- 클릭(드래그 아님)은 접기/펼치기 ---
  const wasHidden = panel.classList.contains('ytpc-hidden');
  head.dispatchEvent(new window.MouseEvent('mousedown',
    { bubbles: true, clientX: 750, clientY: 510, button: 0 }));
  document.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
  ok('클릭: 접기/펼치기 토글', panel.classList.contains('ytpc-hidden') !== wasHidden);

  // --- 플레이어 하단 도킹 ---
  const sel = document.querySelector('#ytpc-posmode');
  ok('위치 선택 UI 존재 (기본값 우측 하단)', !!sel && sel.value === 'corner',
    sel && sel.value);
  sel.value = 'player';
  sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(100);
  ok('플레이어 하단 도킹: left=112px', panel.style.left === '112px', panel.style.left);
  ok('플레이어 하단 도킹: top=436px', panel.style.top === '436px', panel.style.top);

  // --- 결과 ---
  let fail = 0;
  for (const [s, n, x] of results) {
    console.log((s === 'PASS' ? '✓' : '✗') + ' ' + s + ' - ' + n + (x ? ' [' + x + ']' : ''));
    if (s === 'FAIL') fail++;
  }
  console.log(fail === 0 ? '\nALL PASS' : '\n' + fail + ' FAILURES');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('TEST ERROR:', e); process.exit(2); });
