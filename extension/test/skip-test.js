// Behavioral scenarios for 1.11: undo, channel/category rules and private skip ranges.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const scripts = ['tp-i18n.js', 'content.js'].map(file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
async function fixture(store = {}) {
  const dom = new JSDOM('<div id="movie_player"><video class="html5-main-video"></video><div class="ytp-progress-bar"></div></div><div id="below"></div><div id="channel-name"><a href="/channel/UC_TEST">Test channel</a></div>', { url: 'https://www.youtube.com/watch?v=VIDEO_A', runScripts: 'dangerously', pretendToBeVisual: true });
  const w = dom.window, doc = w.document, listeners = [];
  store.tp_lang = 'en';
  w.chrome = { storage: { local: {
    get: async keys => Object.fromEntries(keys.map(k => [k, store[k]])),
    set: async (obj, callback) => {
      const changes = Object.fromEntries(Object.entries(obj).map(([k, value]) => [k, { newValue: value }]));
      Object.assign(store, JSON.parse(JSON.stringify(obj)));
      listeners.forEach(fn => fn(changes, 'local'));
      if (typeof callback === 'function') callback();
    },
  }, onChanged: { addListener: fn => listeners.push(fn) } }, runtime: { getManifest: () => ({ version: '1.11.0' }) } };
  let fetchStatus = 200;
  w.fetch = async () => ({ status: fetchStatus, text: async () => JSON.stringify([{category:'sponsor', segment:[10,20]}, {category:'intro', segment:[0,5]}]) });
  const video = doc.querySelector('video');
  Object.defineProperty(video, 'duration', { value: 100, configurable: true }); video.currentTime = 50;
  scripts.forEach(script => w.eval(script)); await sleep(400);
  const update = async cfg => { await w.chrome.storage.local.set({ tp_cfg: { ...store.tp_cfg, ...cfg } }); await sleep(330); };
  const sponsor = () => [...doc.querySelectorAll('.ytpc-segment')].find(row => row.textContent.includes('Sponsor'));
  const mode = async (cat, value) => {
    const select = doc.querySelector(`[data-category="${cat}"]`); select.value = value; select.dispatchEvent(new w.Event('change')); await sleep(330);
  };
  const channel = async value => { const select = doc.querySelector('#ytpc-channel-rule'); select.value = value; select.dispatchEvent(new w.Event('change')); await sleep(330); };
  const add = (start, end) => {
    doc.querySelector('#ytpc-local-start').value = start; doc.querySelector('#ytpc-local-end').value = end;
    doc.querySelector('.ytpc-local-form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  };
  return { dom, w, doc, video, store, update, mode, channel, sponsor, add, setStatus: status => { fetchStatus = status; } };
}
if (require.main === module) (async () => {
  const f = await fixture({ tp_cfg: { sbSkip: true, cats: { sponsor: true }, panelCollapsed: false } });
  const { w, doc, video, store } = f;
  video.currentTime = 12; await sleep(350);
  assert.equal(video.currentTime, 20.05);
  assert.match(doc.querySelector('.ytpc-skiptoast').textContent, /8s/);
  doc.querySelector('.ytpc-skiptoast button').click(); await sleep(650);
  assert.equal(video.currentTime, 12, 'undo must not immediately auto-skip again');
  f.add('15', '25'); await sleep(350);
  video.currentTime = 16; await sleep(350);
  assert.equal(video.currentTime, 16, 'overlapping local/community range also stays after undo');
  video.currentTime = 50;
  await f.mode('sponsor', 'manual');
  video.currentTime = 13; await sleep(350); assert.equal(video.currentTime, 13);
  f.sponsor().querySelector('button').click(); assert.equal(video.currentTime, 20);
  doc.querySelector('.ytpc-skiptoast button').click(); assert.equal(video.currentTime, 13);
  video.currentTime = 50; f.sponsor().querySelector('button').click();
  doc.querySelector('.ytpc-skiptoast button').click(); assert.equal(video.currentTime, 50, 'manual jump undo restores original position outside the range');
  await f.mode('sponsor', 'mark');
  assert(f.sponsor().querySelector('button').disabled, 'mark-only category cannot be skipped by its button');
  assert.equal(doc.querySelectorAll('.ytpc-marker').length, 3, 'mark-only still visible');
  video.currentTime = 50;
  await f.mode('sponsor', 'auto');
  await f.channel('manual');
  assert.equal(store.tp_cfg.channelRules['/channel/UC_TEST'], 'manual');
  video.currentTime = 1; await sleep(350); assert.equal(video.currentTime, 1, 'channel manual overrides automatic intro');
  await f.channel('mark'); assert(f.sponsor().querySelector('button').disabled);
  await f.channel('inherit'); assert(!store.tp_cfg.channelRules['/channel/UC_TEST']);
  video.currentTime = 50;
  // Invalid ranges, duplicate prevention, current-time controls and per-video storage.
  for (const [start, end] of [['-1','8'],['abc','30'],['20','10'],['20','101'],['Infinity','50']]) f.add(start,end);
  assert.equal(store.tp_cfg.localSegments.VIDEO_A.length, 1);
  f.add('15','25'); assert.equal(store.tp_cfg.localSegments.VIDEO_A.length, 1);
  f.add('0:30','0:40'); assert.equal(store.tp_cfg.localSegments.VIDEO_A.length, 2);
  const current = doc.querySelector('.ytpc-local-form label button'); current.click();
  assert.equal(doc.querySelector('#ytpc-local-start').value, '50');
  doc.querySelector('#movie_player').classList.add('ad-showing');
  f.add('45','55'); assert.equal(store.tp_cfg.localSegments.VIDEO_A.length, 2);
  video.currentTime = 13; f.sponsor().querySelector('button').click(); assert.equal(video.currentTime, 13);
  doc.querySelector('#movie_player').classList.remove('ad-showing');
  await f.update({ sbSkip: false }); video.currentTime = 33; await sleep(350); assert.equal(video.currentTime, 33);
  await f.update({ sbSkip: true }); await sleep(350); assert.equal(video.currentTime, 40.05, 'private segment skips automatically');
  // SPA navigation clears undo and does not reuse another video's private ranges.
  video.currentTime = 50; w.history.pushState({}, '', '/watch?v=VIDEO_B'); await sleep(350);
  assert(!doc.querySelector('.ytpc-skiptoast'));
  assert.equal(doc.querySelectorAll('.ytpc-segment').length, 2);
  video.currentTime = 12; await sleep(350); assert.equal(video.currentTime, 20.05, 'undo exception reset on next video');
  // No community reports must not prevent private segments.
  video.currentTime = 50; f.setStatus(404); w.history.pushState({}, '', '/watch?v=VIDEO_A'); await sleep(350);
  assert.equal(doc.querySelectorAll('.ytpc-segment').length, 2);
  video.currentTime = 32; await sleep(350); assert.equal(video.currentTime, 40.05);
  // Settings survive reload and another channel gets the global behavior.
  video.currentTime = 50; await f.channel('manual');
  // New settings are included in the existing JSON backup and restored together.
  [...doc.querySelectorAll('#ytpc-panel button')].find(button => button.textContent === 'List').click();
  let backupJSON = '';
  const NativeBlob = w.Blob;
  w.Blob = function(parts, options) { backupJSON = parts.join(''); return new NativeBlob(parts, options); };
  w.URL.createObjectURL = () => 'blob:backup'; w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = () => {};
  doc.querySelector('#ytpc-lib-export').click();
  const backup = JSON.parse(backupJSON);
  assert.equal(backup.cfg.localSegments.VIDEO_A.length, 2);
  assert.equal(backup.cfg.channelRules['/channel/UC_TEST'], 'manual');
  assert.equal(backup.cfg.categoryModes.sponsor, 'auto');
  await f.update({ localSegments: {}, channelRules: {}, categoryModes: {} });
  w.confirm = () => true;
  const file = new w.File([backupJSON], 'backup.json', { type: 'application/json' });
  const input = doc.querySelector('#ytpc-lib-overlay input[type=file]');
  Object.defineProperty(input, 'files', { value: [file] }); input.dispatchEvent(new w.Event('change')); await sleep(350);
  assert.equal(store.tp_cfg.localSegments.VIDEO_A.length, 2);
  assert.equal(store.tp_cfg.channelRules['/channel/UC_TEST'], 'manual');
  doc.querySelector('#ytpc-lib-close').click();
  const snapshot = JSON.parse(JSON.stringify(store)); f.dom.window.close();
  const r = await fixture(snapshot);
  assert.equal(r.doc.querySelector('#ytpc-channel-rule').value, 'manual');
  assert.equal(r.doc.querySelectorAll('.ytpc-segment').length, 4);
  r.video.currentTime = 12; await sleep(350); assert.equal(r.video.currentTime, 12);
  r.doc.querySelector('#channel-name a').setAttribute('href', '/channel/UC_OTHER');
  await sleep(350); assert.equal(r.video.currentTime, 20.05);
  const local = [...r.doc.querySelectorAll('.ytpc-segment')].find(row => row.textContent.includes('My skip range'));
  local.querySelectorAll('button')[1].click();
  assert.equal(r.store.tp_cfg.localSegments.VIDEO_A.length, 1);
  r.dom.window.close();
  console.log('PASS: undo and overlapping ranges; category modes; channel rules; private range validation/ads/dedup/delete; SPA isolation; empty API; persistent reload.');
})().catch(error => { console.error(error); process.exit(1); });
module.exports = { fixture, sleep };
