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
<div id="below"></div>
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
const changeListeners = [];
window.chrome = {
  storage: {
    local: {
      get: (keys) => Promise.resolve(
        Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(k => [k, store[k]]))),
      set: (obj, cb) => {
        const changes = {};
        for (const k of Object.keys(obj)) changes[k] = { oldValue: store[k], newValue: obj[k] };
        Object.assign(store, obj);
        if (typeof cb === 'function') cb();
        changeListeners.forEach(fn => { try { fn(changes, 'local'); } catch (e) {} });
        return Promise.resolve();
      },
    },
    onChanged: { addListener: (fn) => changeListeners.push(fn) },
  },
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
// 브라우저 언어를 한국어로 고정 (기본 로케일 ko 테스트)
Object.defineProperty(window.navigator, 'language', { value: 'ko-KR', configurable: true });
const i18nCode = fs.readFileSync(path.join(__dirname, '..', 'tp-i18n.js'), 'utf8');
window.eval(i18nCode);
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

  // --- 스킵 토스트 ---
  const toast = document.querySelector('#movie_player .ytpc-skiptoast');
  ok('스킵 토스트 표시됨', !!toast && toast.classList.contains('ytpc-show') &&
    toast.textContent.includes('스폰서'), toast && toast.textContent);

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

  // --- 투명도 슬라이더 ---
  const opRange = document.querySelector('#ytpc-opacity');
  ok('투명도 슬라이더 존재 (기본 100)', !!opRange && opRange.value === '100',
    opRange && opRange.value);
  opRange.value = '50';
  opRange.dispatchEvent(new window.Event('input', { bubbles: true }));
  ok('투명도 조절: 50% → opacity 0.5', panel.style.opacity === '0.5', panel.style.opacity);
  opRange.dispatchEvent(new window.Event('change', { bubbles: true }));
  ok('투명도 저장됨', store.tp_cfg && store.tp_cfg.opacity === 50,
    JSON.stringify(store.tp_cfg && store.tp_cfg.opacity));

  // --- 플레이어 아래(인라인) 모드 ---
  sel.value = 'below';
  sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(150);
  const belowEl = document.querySelector('#below');
  ok('below 모드: ytpc-inline 클래스', panel.classList.contains('ytpc-inline'));
  ok('below 모드: #below 앞으로 삽입', panel.nextElementSibling === belowEl);
  // 인라인 모드에서 드래그는 동작하지 않아야 함
  const beforeLeft = panel.style.left, beforeTop = panel.style.top;
  head.dispatchEvent(new window.MouseEvent('mousedown',
    { bubbles: true, clientX: 750, clientY: 510, button: 0 }));
  document.dispatchEvent(new window.MouseEvent('mousemove',
    { bubbles: true, clientX: 550, clientY: 400 }));
  document.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
  ok('below 모드: 드래그로 위치 안 바뀜',
    panel.style.left === beforeLeft && panel.style.top === beforeTop,
    panel.style.left + ',' + panel.style.top);
  // 모드 복귀
  sel.value = 'corner';
  sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(100);
  ok('corner 복귀: body로 돌아옴', panel.parentElement === document.body &&
    !panel.classList.contains('ytpc-inline'));

  // --- 백업/복원 ---
  const libBtn = [...panel.querySelectorAll('button')].find(b => b.textContent === '목록');
  libBtn.click();
  await sleep(100);
  const expBtn = document.querySelector('#ytpc-lib-export');
  const impBtn = document.querySelector('#ytpc-lib-import');
  const libOverlay = document.querySelector('#ytpc-lib-overlay');
  const fileInput = libOverlay && libOverlay.querySelector('input[type=file]');
  ok('백업/복원 버튼 + 파일 입력 존재', !!expBtn && !!impBtn && !!fileInput);

  // 내보내기
  let clickedDl = null;
  window.HTMLAnchorElement.prototype.click = function() {
    clickedDl = { download: this.download, href: this.getAttribute('href') };
  };
  window.URL.createObjectURL = () => 'blob:mock';
  window.URL.revokeObjectURL = () => {};
  let exportedJSON = '';
  const OrigBlob = window.Blob;
  window.Blob = function(parts) { exportedJSON = parts.join(''); return new OrigBlob(parts, { type: 'application/json' }); };
  window.Blob.prototype = OrigBlob.prototype;
  expBtn.click();
  await sleep(50);
  ok('백업 다운로드 파일명', !!clickedDl && clickedDl.download.startsWith('tubepilot-backup-') &&
    clickedDl.download.endsWith('.json'), clickedDl && clickedDl.download);
  const ed = JSON.parse(exportedJSON);
  ok('백업 JSON 구조 (app/cfg/library)', ed.app === 'TubePilot' && !!ed.cfg && !!ed.library, ed.app);
  window.Blob = OrigBlob;

  // 가져오기
  window.confirm = () => true;
  const backupData = {
    app: 'TubePilot', format: 1, exportedAt: '2026-09-27T00:00:00.000Z',
    cfg: Object.assign({}, ed.cfg, { opacity: 80 }),
    library: { vid123: { title: '테스트 영상', channel: '테스트 채널', tags: ['백업'], memo: '메모', savedAt: 123 } },
  };
  const bf = new window.File([JSON.stringify(backupData)], 'backup.json', { type: 'application/json' });
  Object.defineProperty(fileInput, 'files', { value: [bf], configurable: true });
  fileInput.dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(300);
  ok('복원: 설정 저장됨', store.tp_cfg && store.tp_cfg.opacity === 80,
    JSON.stringify(store.tp_cfg && store.tp_cfg.opacity));
  ok('복원: 라이브러리 저장됨',
    store.tp_library && store.tp_library.videos && store.tp_library.videos.vid123 &&
    store.tp_library.videos.vid123.title === '테스트 영상');
  ok('복원: 패널 UI에 반영됨 (투명도 80)', document.querySelector('#ytpc-opacity').value === '80',
    document.querySelector('#ytpc-opacity').value);
  ok('복원: 라이브러리 목록에 표시',
    document.querySelector('#ytpc-lib-list').textContent.includes('테스트 영상'));

  // 잘못된 파일 거부
  const badFile = new window.File(['not json'], 'bad.json', { type: 'application/json' });
  Object.defineProperty(fileInput, 'files', { value: [badFile], configurable: true });
  fileInput.dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(200);
  ok('복원: 잘못된 파일 거부됨 (기존 데이터 유지)',
    store.tp_library.videos.vid123 && store.tp_library.videos.vid123.title === '테스트 영상');

  // --- 댓글 숨기기 (몰입 모드) ---
  const cmtRow = [...panel.querySelectorAll('label.ytpc-row')].find(l => l.textContent.includes('댓글 숨기기'));
  ok('댓글 숨기기 체크박스 존재', !!cmtRow);
  const cmtBox = cmtRow.querySelector('input');
  ok('댓글 숨기기 기본값 off',
    cmtBox.checked === false && !document.documentElement.classList.contains('ytpc-nocomments'));
  cmtBox.checked = true;
  cmtBox.dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(50);
  ok('댓글 숨기기 on: 클래스 토글', document.documentElement.classList.contains('ytpc-nocomments'));
  ok('댓글 숨기기 스타일 주입됨', !!document.getElementById('ytpc-nocomments-style'));
  ok('댓글 숨기기 저장됨', store.tp_cfg.hideComments === true);
  cmtBox.checked = false;
  cmtBox.dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(50);
  ok('댓글 숨기기 off: 클래스 제거', !document.documentElement.classList.contains('ytpc-nocomments'));

  // --- 스크린샷 버튼 + 단축키 ---
  const shotBtn = [...panel.querySelectorAll('button')].find(b => b.textContent.includes('📷'));
  ok('스크린샷 버튼 존재', !!shotBtn, shotBtn && shotBtn.textContent);
  ok('단축키 힌트 표시', [...document.querySelectorAll('#ytpc-panel .ytpc-hint')]
    .some(el => el.textContent.includes('Alt+S')));
  // videoWidth 0(jsdom 기본) → 캡처 불가 안내
  shotBtn.click();
  await sleep(50);
  ok('스크린샷: 영상 없으면 안내 문구',
    document.querySelector('#ytpc-panel .ytpc-status').textContent.includes('캡처할 영상이 없어요'),
    document.querySelector('#ytpc-panel .ytpc-status').textContent);
  // Alt+S → background에 캡처 요청 (영상 크기 모킹)
  Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true });
  video.getBoundingClientRect = () => ({
    left: 100, top: 80, right: 900, bottom: 500, width: 800, height: 420, x: 100, y: 80,
    toJSON() { return {}; },
  });
  let capturedMsg = null;
  window.chrome.runtime.sendMessage = (msg, cb) => { capturedMsg = msg; cb({}); };
  document.dispatchEvent(new window.KeyboardEvent('keydown',
    { key: 's', altKey: true, bubbles: true }));
  await sleep(50);
  ok('Alt+S: TP_CAPTURE 메시지 전송', capturedMsg && capturedMsg.type === 'TP_CAPTURE',
    JSON.stringify(capturedMsg));
  // 캡처 스케일: 실제 이미지 해상도 기준 (dpr 가정 금지)
  const cs = window.__tpCaptureScale;
  ok('캡처 스케일 계산', typeof cs === 'function' &&
    cs(2560, 1280) === 2 && cs(1280, 1280) === 1 && cs(1920, 1280) === 1.5 &&
    cs(0, 1280) === 1,
    typeof cs === 'function' ? [cs(2560,1280), cs(1280,1280), cs(1920,1280)].join(',') : 'no fn');
  ok('스크린샷 실패 시 상태 문구',
    document.querySelector('#ytpc-panel .ytpc-status').textContent.includes('실패'),
    document.querySelector('#ytpc-panel .ytpc-status').textContent);
  // --- 스크린샷 저장 모드: 전체 경로 스텁 ---
  window.ClipboardItem = function (m) { this.mime = m; };
  let clipboardWrites = [];
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { write: (items) => { clipboardWrites.push(items); return Promise.resolve(); } },
    configurable: true,
  });
  window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage() {} });
  window.HTMLCanvasElement.prototype.toBlob = function (cb) {
    cb(new window.Blob(['fake'], { type: 'image/png' }));
  };
  window.Image = function () {
    const o = {};
    setTimeout(() => {
      o.naturalWidth = 1280; o.naturalHeight = 720;
      if (o.onload) o.onload();
    }, 5);
    return o;
  };
  window.URL.createObjectURL = () => 'blob:fake';
  window.URL.revokeObjectURL = () => {};
  const shotStatus = () => document.querySelector('#ytpc-panel .ytpc-status').textContent;
  const fireShot = () => {
    window.chrome.runtime.sendMessage = (msg, cb) => cb({ dataUrl: 'data:image/png;base64,AAA' });
    document.dispatchEvent(new window.KeyboardEvent('keydown',
      { key: 's', altKey: true, bubbles: true }));
  };
  // clipboard 모드
  await window.chrome.storage.local.set({ tp_cfg: { shotMode: 'clipboard' } });
  clipboardWrites = [];
  fireShot();
  await sleep(80);
  ok('스크린샷 clipboard 모드: 클립보드에 PNG 복사',
    clipboardWrites.length === 1 && clipboardWrites[0][0] instanceof window.ClipboardItem &&
    clipboardWrites[0][0].mime['image/png'],
    'writes=' + clipboardWrites.length);
  ok('스크린샷 clipboard 모드: 안내 문구', shotStatus().includes('클립보드'), shotStatus());
  // both 모드: 클립보드 + 다운로드 둘 다
  await window.chrome.storage.local.set({ tp_cfg: { shotMode: 'both' } });
  clipboardWrites = [];
  fireShot();
  await sleep(80);
  ok('스크린샷 both 모드: 클립보드+다운로드',
    clipboardWrites.length === 1 && !!document.querySelector('a[download]'),
    'writes=' + clipboardWrites.length);
  // download 모드 (기본): 앵커 다운로드만
  await window.chrome.storage.local.set({ tp_cfg: { shotMode: 'download' } });
  clipboardWrites = [];
  fireShot();
  await sleep(80);
  ok('스크린샷 download 모드: 다운로드만',
    clipboardWrites.length === 0 && !!document.querySelector('a[download]'),
    'writes=' + clipboardWrites.length);
  ok('스크린샷 download 모드: 안내 문구', shotStatus().includes('저장'), shotStatus());
  await window.chrome.storage.local.set({ tp_cfg: {} });
  // Alt+H → 댓글 숨기기 토글
  const cmtBox2 = [...document.querySelectorAll('#ytpc-panel label.ytpc-row')]
    .find(l => l.textContent.includes('댓글 숨기기')).querySelector('input');
  document.dispatchEvent(new window.KeyboardEvent('keydown',
    { key: 'h', altKey: true, bubbles: true }));
  await sleep(50);
  ok('Alt+H: 댓글 숨기기 토글 on',
    document.documentElement.classList.contains('ytpc-nocomments') && cmtBox2.checked === true);
  document.dispatchEvent(new window.KeyboardEvent('keydown',
    { key: 'h', altKey: true, bubbles: true }));
  await sleep(50);
  ok('Alt+H: 댓글 숨기기 토글 off',
    !document.documentElement.classList.contains('ytpc-nocomments') && cmtBox2.checked === false);
  // Alt+B → 저장 다이얼로그
  document.dispatchEvent(new window.KeyboardEvent('keydown',
    { key: 'b', altKey: true, bubbles: true }));
  await sleep(50);
  ok('Alt+B: 저장 다이얼로그 열림', !!document.querySelector('#ytpc-save-overlay'));
  // --- 단축키 파싱/매칭 유닛 ---
  const TH = window.__tpHotkey;
  const p1 = TH.parse('Alt+Shift+S');
  ok('단축키 파싱', p1.alt && p1.shift && !p1.ctrl && p1.key === 'S', JSON.stringify(p1));
  ok('단축키 매칭', TH.match({ altKey: true, key: 's' }, 'Alt+S') === true);
  ok('단축키 불일치(조합키 다름)', TH.match({ altKey: true, shiftKey: true, key: 's' }, 'Alt+S') === false);
  ok('단축키 불일치(키 다름)', TH.match({ altKey: true, key: 'h' }, 'Alt+S') === false);
  ok('단축키 매칭(Ctrl+Shift+K)', TH.match({ ctrlKey: true, shiftKey: true, key: 'k' }, 'Ctrl+Shift+K') === true);
  // --- 단축키 변경 → 새 키 동작 + 힌트 갱신 ---
  await window.chrome.storage.local.set({
    tp_cfg: { hotkeys: { shot: 'Alt+K', comments: 'Alt+H', save: 'Alt+B' } },
  });
  await sleep(80); // onChanged → 패널 리빌드
  const hintAfter = [...document.querySelectorAll('#ytpc-panel .ytpc-hint')]
    .find(el => el.textContent.includes('단축키'));
  ok('단축키 변경: 힌트 문구 갱신', !!hintAfter && hintAfter.textContent.includes('Alt+K'),
    hintAfter && hintAfter.textContent);
  let cap2 = null;
  window.chrome.runtime.sendMessage = (msg, cb) => { cap2 = msg; cb({}); };
  document.dispatchEvent(new window.KeyboardEvent('keydown',
    { key: 'k', altKey: true, bubbles: true }));
  await sleep(50);
  ok('단축키 변경: Alt+K 캡처 동작', cap2 && cap2.type === 'TP_CAPTURE', JSON.stringify(cap2));
  cap2 = null;
  document.dispatchEvent(new window.KeyboardEvent('keydown',
    { key: 's', altKey: true, bubbles: true }));
  await sleep(50);
  ok('단축키 변경: 기존 Alt+S 무시', cap2 === null, JSON.stringify(cap2));
  // 원복
  await window.chrome.storage.local.set({ tp_cfg: {} });
  await sleep(80);
  // --- 구간 북마크 ---
  const BM = window.__tpBm;
  ok('북마크 시간 파싱', BM.parse('1:30') === 90 && BM.parse('90') === 90 && BM.parse('1:02:03') === 3723,
    [BM.parse('1:30'), BM.parse('90'), BM.parse('1:02:03')].join(','));
  ok('북마크 시간 파싱 실패', BM.parse('abc') === null && BM.parse('') === null);
  ok('북마크 시간 포맷', BM.fmt(90) === '1:30' && BM.fmt(3723) === '62:03',
    BM.fmt(90) + ' / ' + BM.fmt(3723));
  // 다이얼로그 → 저장
  video.currentTime = 65;
  const bmBtn = [...document.querySelectorAll('#ytpc-panel button')]
    .find(b => b.textContent.includes('🔖'));
  ok('북마크 버튼 존재', !!bmBtn, bmBtn && bmBtn.textContent);
  bmBtn.click();
  await sleep(50);
  ok('북마크 다이얼로그 열림', !!document.querySelector('#ytpc-bm-overlay'));
  const bmStartEl = document.querySelector('#ytpc-bm-start');
  ok('북마크 시작점 기본값', bmStartEl && bmStartEl.value === '1:05', bmStartEl && bmStartEl.value);
  document.querySelector('#ytpc-bm-end').value = '2:00';
  document.querySelector('#ytpc-bm-memo').value = '하이라이트';
  document.querySelector('#ytpc-bm .ytpc-btn-ok').click();
  await sleep(50);
  const savedBms = store.tp_bookmarks || [];
  ok('북마크 저장', savedBms.length === 1 && savedBms[0].start === 65 && savedBms[0].end === 120 &&
    savedBms[0].memo === '하이라이트' && savedBms[0].videoId === 'TEST1234567',
    JSON.stringify(savedBms[0]));
  ok('북마크 저장 안내', document.querySelector('#ytpc-panel .ytpc-status').textContent.includes('북마크'),
    document.querySelector('#ytpc-panel .ytpc-status').textContent);
  // 유효성 검사
  bmBtn.click();
  await sleep(50);
  document.querySelector('#ytpc-bm-end').value = '0:30';
  document.querySelector('#ytpc-bm .ytpc-btn-ok').click();
  await sleep(30);
  ok('북마크 유효성 검사', document.querySelector('#ytpc-bm-err').textContent.length > 0,
    document.querySelector('#ytpc-bm-err').textContent);
  document.querySelector('#ytpc-bm .ytpc-btn-cancel').click();
  await sleep(30);
  ok('북마크 다이얼로그 닫힘', !document.querySelector('#ytpc-bm-overlay'));
  // 라이브러리 구간 탭
  const libBtn2 = [...document.querySelectorAll('#ytpc-panel button')]
    .find(b => b.textContent.includes('목록'));
  libBtn2.click();
  await sleep(50);
  const marksTab = document.querySelector('.ytpc-lib-tabs [data-tab="marks"]');
  ok('라이브러리 구간 탭 존재', !!marksTab);
  marksTab.click();
  await sleep(50);
  const bmRows = document.querySelectorAll('.ytpc-bmrow');
  ok('구간 목록 렌더링', bmRows.length === 1 &&
    bmRows[0].querySelector('.ytpc-bmrow-time').textContent.includes('1:05'),
    bmRows.length + ' / ' + (bmRows[0] && bmRows[0].querySelector('.ytpc-bmrow-time').textContent));
  ok('구간 메모 표시', bmRows[0].querySelector('.ytpc-bmrow-memo').textContent === '하이라이트');
  // 점프 → 종료점 예약 (jsdom 내비게이션 불가라 stopAt으로 검증)
  bmRows[0].querySelector('[data-act="jump"]').click();
  await sleep(30);
  ok('북마크 점프: 종료점 예약', BM.stopAt && BM.stopAt.end === 120 && BM.stopAt.videoId === 'TEST1234567',
    JSON.stringify(BM.stopAt));
  // 자동 일시정지: end를 넘기면 pause
  let pausedCalled = false;
  Object.defineProperty(video, 'paused', { value: false, configurable: true });
  video.pause = () => { pausedCalled = true; };
  video.currentTime = 130;
  await sleep(450); // tick 300ms 주기
  ok('북마크 구간 끝 자동 일시정지', pausedCalled && BM.stopAt === null,
    'paused=' + pausedCalled + ' stopAt=' + JSON.stringify(BM.stopAt));
  // 삭제
  libBtn2.click();
  await sleep(50);
  document.querySelector('.ytpc-lib-tabs [data-tab="marks"]').click();
  await sleep(50);
  window.confirm = () => true;
  document.querySelector('.ytpc-bmrow [data-act="del"]').click();
  await sleep(50);
  ok('북마크 삭제', (store.tp_bookmarks || []).length === 0 &&
    document.querySelectorAll('.ytpc-bmrow').length === 0,
    JSON.stringify(store.tp_bookmarks));
  document.querySelector('#ytpc-lib-close').click();
  await sleep(30);

  // --- 언어 전환 (팝업 언어 선택 → 패널 실시간 리빌드) ---
  const rowText = () => [...document.querySelectorAll('#ytpc-panel label.ytpc-row')]
    .map(l => l.textContent).join('|');
  ok('기본 언어 ko (브라우저 ko-KR)', rowText().includes('영상 광고 자동 스킵'), rowText().slice(0, 60));
  await window.chrome.storage.local.set({ tp_lang: 'en' });
  await sleep(100);
  ok('언어 전환 en: 패널 영어 리빌드', rowText().includes('Auto-skip video ads'), rowText().slice(0, 60));
  ok('언어 전환 en: 카테고리 영문',
    [...document.querySelectorAll('#ytpc-panel .ytpc-cats label')].some(l => l.textContent.includes('Sponsor')));
  await window.chrome.storage.local.set({ tp_lang: 'ja' });
  await sleep(100);
  ok('언어 전환 ja: 패널 일본어 리빌드', rowText().includes('動画広告を自動スキップ'));
  await window.chrome.storage.local.set({ tp_lang: 'ko' });
  await sleep(100);
  ok('언어 복귀 ko', rowText().includes('영상 광고 자동 스킵'));

  // --- 결과 ---
  let fail = 0;
  for (const [s, n, x] of results) {
    console.log((s === 'PASS' ? '✓' : '✗') + ' ' + s + ' - ' + n + (x ? ' [' + x + ']' : ''));
    if (s === 'FAIL') fail++;
  }
  console.log(fail === 0 ? '\nALL PASS' : '\n' + fail + ' FAILURES');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('TEST ERROR:', e); process.exit(2); });
