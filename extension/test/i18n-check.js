// TubePilot i18n 정합성 검사 (node 단독 실행)
// - 5개 언어가 동일한 키 집합을 가지는지
// - 빈 문자열이 없는지
// - {placeholder}가 모든 언어에서 일치하는지
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'tp-i18n.js'), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(src + '\nthis.__out = { TP_LOCALES, TP_SUPPORTED_LANGS };', sandbox);
const { TP_LOCALES, TP_SUPPORTED_LANGS } = sandbox.__out;

const results = [];
const ok = (name, cond, extra = '') => {
  results.push([cond ? 'PASS' : 'FAIL', name, extra]);
  if (!cond) console.log(`✗ FAIL - ${name} ${extra}`);
};

const langs = Object.keys(TP_LOCALES);
ok('5개 언어 존재 (ko/en/ja/es/pt)',
  TP_SUPPORTED_LANGS.length === 5 && langs.length === 5, langs.join(','));

const baseKeys = Object.keys(TP_LOCALES.ko).sort();
ok('ko 키 70개 이상', baseKeys.length >= 70, baseKeys.length + '개');
for (const l of langs) {
  if (l === 'ko') continue;
  const keys = Object.keys(TP_LOCALES[l]).sort();
  const missing = baseKeys.filter(k => !keys.includes(k));
  const extra = keys.filter(k => !baseKeys.includes(k));
  ok(`${l}: 키 집합 ko와 동일`, missing.length === 0 && extra.length === 0,
    `missing=[${missing}] extra=[${extra}]`);
}
for (const l of langs) {
  const empty = Object.entries(TP_LOCALES[l]).filter(([, v]) => !v || !String(v).trim());
  ok(`${l}: 빈 문자열 없음`, empty.length === 0, empty.map(([k]) => k).join(','));
}
const ph = (s) => (String(s).match(/\{[a-z]+\}/g) || []).sort().join(',');
for (const k of baseKeys) {
  const ref = ph(TP_LOCALES.ko[k]);
  for (const l of langs) {
    if (l === 'ko') continue;
    if (ph(TP_LOCALES[l][k]) !== ref) {
      ok(`${l}.${k}: 플레이스홀더 일치`, false, `ko=${ref} vs ${l}=${ph(TP_LOCALES[l][k])}`);
    }
  }
}
ok('플레이스홀더 전수 일치', !results.some(r => r[0] === 'FAIL' && r[1].includes('플레이스홀더')));

// T() 동작 검사
vm.runInContext(`
  this.__t = (() => {
    const out = [];
    tpSetLang(tpPickLang(undefined, 'ko-KR'));
    out.push(['ko pick', TP_LANG]);
    out.push(['ko T', T('row_adskip')]);
    out.push(['ko ph', T('st_loaded', { n: 3 })]);
    tpSetLang(tpPickLang('ja', 'ko-KR'));
    out.push(['ja T', T('row_adskip')]);
    tpSetLang(tpPickLang(undefined, 'de-DE'));
    out.push(['de fallback', TP_LANG]);
    tpSetLang('pt');
    out.push(['pt ph', T('confirm_del_item', { title: 'abc' })]);
    out.push(['missing key', T('no_such_key_xyz')]);
    return out;
  })();
`, sandbox);
const t = Object.fromEntries(sandbox.__t);
ok('ko 감지 (ko-KR)', t['ko pick'] === 'ko', t['ko pick']);
ok('ko 번역', t['ko T'] === '영상 광고 자동 스킵', t['ko T']);
ok('ko 플레이스홀더', t['ko ph'] === '스킵 구간 3개 로드됨', t['ko ph']);
ok('ja 오버라이드', t['ja T'] === '動画広告を自動スキップ', t['ja T']);
ok('미지원 언어 → en 폴백', t['de fallback'] === 'en', t['de fallback']);
ok('pt 플레이스홀더', t['pt ph'] === 'Excluir "abc"?', t['pt ph']);
ok('없는 키 → 키 그대로', t['missing key'] === 'no_such_key_xyz', t['missing key']);

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.length - fails}/${results.length} passed`);
if (fails) { console.log('I18N CHECK FAILED'); process.exit(1); }
console.log('I18N ALL PASS');
