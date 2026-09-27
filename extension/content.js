/* TubePilot — Manifest V3 content script
 * https://github.com/sapgun/tubepilot
 */

(function () {
  'use strict';

  /* ================= 설정 ================= */
  const DEFAULTS = {
    adSkip: true,   // 영상 광고 자동 스킵
    adMute: true,   // 광고 중 음소거
    sbSkip: true,   // SponsorBlock 구간 자동 스킵
    sbMark: true,   // SponsorBlock 구간 마킹 표시
    panelMode: 'corner',  // corner(우측 하단) | player(플레이어 위) | below(플레이어 아래 고정)
    panelPos: null,       // {left, top} 수동 드래그 위치 (있으면 모드보다 우선)
    opacity: 100,         // 패널 투명도 (%)
    cats: {
      sponsor: true,
      intro: true,
      outro: true,
      selfpromo: true,
      interaction: false,
      music_offtopic: false,
    },
  };
  let cfg = Object.assign({}, DEFAULTS);
  cfg.cats = Object.assign({}, DEFAULTS.cats);
  let library = {}; // 다시보기 저장소 (메모리 캐시, chrome.storage.local에 write-through)
  function saveCfg() { chrome.storage.local.set({ tp_cfg: cfg }).catch(() => {}); }

  const CAT_META = {
    sponsor:        { label: '스폰서',      color: '#00d400' },
    intro:          { label: '인트로',      color: '#00ffff' },
    outro:          { label: '아웃트로',    color: '#0202ed' },
    selfpromo:      { label: '자기홍보',    color: '#ffff00' },
    interaction:    { label: '구독 알림',   color: '#cc00ff' },
    music_offtopic: { label: '음악(비주제)', color: '#ff9900' },
  };


  /* ================= 헬퍼 ================= */
  function getVideo() {
    return document.querySelector('#movie_player .html5-main-video') ||
           document.querySelector('#movie_player video');
  }
  function getPlayer() { return document.getElementById('movie_player'); }
  function getVideoId() {
    try {
      const u = new URL(location.href);
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const m = u.pathname.match(/^\/shorts\/([\w-]{6,})/);
      return m ? m[1] : null;
    } catch (e) { return null; }
  }
  function isAdShowing() {
    const p = getPlayer();
    return !!(p && p.classList.contains('ad-showing'));
  }

  // MV3: GM_xmlhttpRequest 대체. sponsor.ajay.app는 host_permissions에 등록됨.
  function tpFetch(opts) {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) { done = true; if (opts.ontimeout) opts.ontimeout(); }
    }, opts.timeout || 8000);
    fetch(opts.url, { method: opts.method || 'GET' })
      .then(async (res) => {
        if (done) return; done = true; clearTimeout(timer);
        const text = await res.text();
        if (opts.onload) opts.onload({ status: res.status, responseText: text });
      })
      .catch((err) => {
        if (done) return; done = true; clearTimeout(timer);
        if (err && err.name === 'AbortError') { if (opts.ontimeout) opts.ontimeout(); }
        else if (opts.onerror) opts.onerror(err);
      });
  }

  /* ================= 상태 ================= */
  let currentVideoId = null;
  let segments = [];           // {start, end, cat}
  let zoom = { s: 1, x: 0, y: 0 };
  let adState = null;          // { muted, rate } 광고 시작 전 상태
  let statusEl = null, zoomLbl = null;

  function setStatus(t) { if (statusEl) statusEl.textContent = t; }

  /* ================= 영상 변경 감지 ================= */
  function onVideoChange(vid) {
    currentVideoId = vid;
    segments = [];
    clearMarkers();
    resetZoom(true);
    hideRecall();
    if (vid) {
      setStatus('구간 정보 불러오는 중…');
      loadSegments(vid);
      checkRecall(vid);
    } else {
      setStatus('');
    }
  }

  /* ================= SponsorBlock ================= */
  function loadSegments(vid) {
    const cats = Object.keys(cfg.cats).filter(c => cfg.cats[c]);
    if (!cats.length) { setStatus(''); return; }
    tpFetch({
      method: 'GET',
      url: 'https://sponsor.ajay.app/api/skipSegments?videoID=' +
           encodeURIComponent(vid) + '&categories=' + encodeURIComponent(JSON.stringify(cats)),
      timeout: 8000,
      onload: function (res) {
        if (vid !== currentVideoId) return; // 이미 다른 영상으로 이동
        if (res.status === 200) {
          try {
            const data = JSON.parse(res.responseText);
            segments = [];
            data.forEach(e => {
              // 실제 API는 segment(단수, [start, end])로 옴. 혹시 모를 복수형도 허용.
              const list = Array.isArray(e.segment) ? [e.segment] : (e.segments || []);
              list.forEach(s => {
                if (Array.isArray(s) && s.length >= 2 && isFinite(s[0]) && isFinite(s[1]) && s[1] > s[0]) {
                  segments.push({ start: s[0], end: s[1], cat: e.category });
                }
              });
            });
            segments.sort((a, b) => a.start - b.start);
            console.log('[TubePilot] segments loaded:', segments.length,
              segments.map(s => s.cat + ':' + Math.round(s.start) + '-' + Math.round(s.end)).join(', '));
            if (cfg.sbMark) drawMarkers();
            setStatus(segments.length ? '스킵 구간 ' + segments.length + '개 로드됨' : '스킵 구간 없음');
          } catch (e) { setStatus('구간 파싱 실패'); }
        } else if (res.status === 404) {
          segments = []; clearMarkers(); setStatus('스킵 구간 없음');
        } else {
          setStatus('구간 조회 실패 (' + res.status + ')');
        }
      },
      onerror: function () { if (vid === currentVideoId) setStatus('구간 서버 연결 실패'); },
      ontimeout: function () { if (vid === currentVideoId) setStatus('구간 조회 시간 초과'); },
    });
  }

  function progressContainer() {
    return document.querySelector('#movie_player .ytp-progress-bar') ||
           document.querySelector('#movie_player .ytp-progress-bar-container');
  }
  function clearMarkers() {
    document.querySelectorAll('.ytpc-marker').forEach(el => el.remove());
  }
  function drawMarkers() {
    clearMarkers();
    const v = getVideo(), bar = progressContainer();
    if (!v || !bar || !v.duration || !isFinite(v.duration)) return;
    bar.style.position = 'relative'; // 마커 absolute 기준점 보장
    const dur = v.duration;
    segments.forEach(s => {
      const meta = CAT_META[s.cat] || { color: '#ffffff' };
      const el = document.createElement('div');
      el.className = 'ytpc-marker';
      el.style.left = (s.start / dur * 100) + '%';
      el.style.width = Math.max(0.4, (s.end - s.start) / dur * 100) + '%';
      el.style.background = meta.color;
      el.title = (meta.label || s.cat) + ' ' + fmtTime(s.start) + ' → ' + fmtTime(s.end) + ' (클릭하면 이동)';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const vv = getVideo();
        if (vv) { try { vv.currentTime = s.start + 0.1; } catch (err) {} }
      });
      bar.appendChild(el);
    });
  }
  function fmtTime(t) {
    t = Math.max(0, Math.floor(t));
    const m = Math.floor(t / 60), s = t % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function handleSponsorSkip() {
    if (!cfg.sbSkip || !segments.length || isAdShowing()) return;
    const v = getVideo();
    if (!v || !isFinite(v.duration)) return;
    const t = v.currentTime;
    for (const s of segments) {
      if (t >= s.start && t < s.end - 0.05) {
        v.currentTime = Math.min(s.end + 0.05, v.duration - 0.05);
        const meta = CAT_META[s.cat] || {};
        setStatus('스킵: ' + (meta.label || s.cat));
        showSkipToast(meta.label || s.cat);
        break;
      }
    }
  }

  /* ================= 광고 자동 스킵 ================= */
  function handleAds() {
    const p = getPlayer(), v = getVideo();
    if (!p || !v) return;
    if (!isAdShowing()) {
      if (adState) { // 광고 종료 → 원래 상태 복원
        try {
          if (cfg.adMute) v.muted = adState.muted;
          if (v.playbackRate !== adState.rate) v.playbackRate = adState.rate;
        } catch (e) {}
        adState = null;
        setStatus(segments.length ? '스킵 구간 ' + segments.length + '개 로드됨' : '');
      }
      return;
    }
    if (!adState) adState = { muted: v.muted, rate: v.playbackRate };
    if (!cfg.adSkip && !cfg.adMute) return;

    if (cfg.adMute) { try { v.muted = true; } catch (e) {} }
    setStatus('광고 스킵 중…');

    if (cfg.adSkip) {
      // 1) 스킵 버튼이 보이면 클릭
      const btn = p.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern');
      if (btn) { try { btn.click(); } catch (e) {} return; }
      // 2) 스킵 불가 광고는 끝으로 시크 + 고속 재생
      try {
        if (v.duration && isFinite(v.duration) && v.currentTime < v.duration - 0.3) {
          v.currentTime = v.duration;
        }
        if (v.playbackRate < 4) v.playbackRate = 16;
      } catch (e) {}
    }
  }

  /* ================= 줌 / 패닝 ================= */
  function applyZoom() {
    const v = getVideo();
    if (!v) return;
    if (zoom.s <= 1.001 && zoom.x === 0 && zoom.y === 0) {
      v.style.transform = '';
    } else {
      v.style.transformOrigin = 'center center';
      v.style.transform = 'translate(' + zoom.x + 'px,' + zoom.y + 'px) scale(' + zoom.s + ')';
    }
  }
  function updateZoomLabel() {
    if (zoomLbl) zoomLbl.textContent = Math.round(zoom.s * 100) + '%';
  }
  function resetZoom(silent) {
    zoom = { s: 1, x: 0, y: 0 };
    applyZoom();
    if (!silent) updateZoomLabel();
  }

  // 줌 상태에서 드래그로 패닝 (클릭-일시정지는 드래그가 아닐 때만)
  let panning = null, dragged = false;
  document.addEventListener('pointerdown', function (e) {
    const v = getVideo();
    if (!v || e.target !== v || zoom.s <= 1.01 || e.button !== 0) return;
    panning = { sx: e.clientX, sy: e.clientY, x: zoom.x, y: zoom.y };
    dragged = false;
  }, true);
  document.addEventListener('pointermove', function (e) {
    if (!panning) return;
    const dx = e.clientX - panning.sx, dy = e.clientY - panning.sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragged = true;
    zoom.x = panning.x + dx;
    zoom.y = panning.y + dy;
    applyZoom();
  }, true);
  document.addEventListener('pointerup', function () { panning = null; }, true);
  document.addEventListener('click', function (e) {
    if (dragged && e.target === getVideo()) {
      e.stopPropagation();
      e.preventDefault();
      dragged = false;
    }
  }, true);

  /* ================= 패널 위치/드래그 ================= */
  let skipToastTimer = null;
  function showSkipToast(label) {
    const pl = getPlayer();
    if (!pl) return;
    let t = pl.querySelector('.ytpc-skiptoast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'ytpc-skiptoast';
      pl.appendChild(t);
    }
    t.textContent = '\u23ED 스킵: ' + label;
    t.classList.add('ytpc-show');
    clearTimeout(skipToastTimer);
    skipToastTimer = setTimeout(() => t.classList.remove('ytpc-show'), 1600);
  }
  function belowAnchor() {
    // 플레이어 바로 아래 = 영상 제목/설명 영역 앞
    return document.querySelector('ytd-watch-flexy #below') ||
           document.querySelector('#below') ||
           document.querySelector('ytd-watch-metadata');
  }
  function playerRect() {
    const pl = document.getElementById('movie_player');
    if (!pl) return null;
    const r = pl.getBoundingClientRect();
    return (r && r.width > 50) ? r : null;
  }
  function positionPanel() {
    const panel = document.getElementById('ytpc-panel');
    if (!panel) return;
    // 플레이어 아래 고정 모드: 페이지 흐름에 자연스럽게 삽입
    if (cfg.panelMode === 'below' && !cfg.panelPos) {
      const anchor = belowAnchor();
      if (anchor) {
        if (panel.nextElementSibling !== anchor || !panel.classList.contains('ytpc-inline')) {
          anchor.parentNode.insertBefore(panel, anchor);
        }
        panel.classList.add('ytpc-inline');
        return;
      }
      // 앵커가 없으면(시청 페이지 아님) 우측 하단으로 폴백
    }
    panel.classList.remove('ytpc-inline');
    if (panel.parentElement !== document.body) {
      (document.body || document.documentElement).appendChild(panel);
    }
    panel.style.position = '';
    if (cfg.panelPos) {
      // 수동 드래그 위치가 있으면 최우선
      panel.style.left = cfg.panelPos.left;
      panel.style.top = cfg.panelPos.top;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      return;
    }
    if (cfg.panelMode === 'player') {
      const pr = playerRect();
      if (pr) {
        const h = panel.offsetHeight || 0;
        panel.style.left = (pr.left + 12) + 'px';
        panel.style.top = Math.max(0, pr.bottom - h - 64) + 'px'; // 컨트롤 바 위
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        return;
      }
    }
    // 기본: 우측 하단
    panel.style.left = 'auto';
    panel.style.top = 'auto';
    panel.style.right = '16px';
    panel.style.bottom = '88px';
  }
  function makeDraggable(panel, head) {
    let drag = null;
    head.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const inlineMode = cfg.panelMode === 'below'; // 인라인 모드는 드래그 대신 클릭만
      let l = 0, t = 0;
      if (!inlineMode) {
        const r = panel.getBoundingClientRect();
        panel.style.left = r.left + 'px';
        panel.style.top = r.top + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        l = r.left; t = r.top;
      }
      drag = { x0: e.clientX, y0: e.clientY, l, t, moved: false, inline: inlineMode };
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!drag || drag.inline) return;
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return; // 클릭과 구분
      drag.moved = true;
      const w = panel.offsetWidth || 212, h = panel.offsetHeight || 100;
      const l = Math.max(-w + 60, Math.min(window.innerWidth - 60, drag.l + dx));
      const t = Math.max(0, Math.min(window.innerHeight - 40, drag.t + dy));
      panel.style.left = l + 'px';
      panel.style.top = t + 'px';
    });
    document.addEventListener('mouseup', () => {
      if (!drag) return;
      if (drag.moved) {
        cfg.panelPos = { left: panel.style.left, top: panel.style.top };
        saveCfg();
        setStatus('패널 위치 저장됨');
      } else {
        panel.classList.toggle('ytpc-hidden'); // 클릭 = 접기/펼치기
      }
      drag = null;
    });
    head.addEventListener('dblclick', (e) => {
      e.preventDefault();
      cfg.panelPos = null;
      saveCfg();
      positionPanel();
      setStatus('패널 위치 초기화됨');
    });
  }

  /* ================= 컨트롤 패널 ================= */
  function buildPanel() {
    if (document.getElementById('ytpc-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'ytpc-panel';

    const head = document.createElement('div');
    head.className = 'ytpc-head';
    head.innerHTML = '<span>🎬 TubePilot</span><span>–</span>';
    panel.appendChild(head);

    const body = document.createElement('div');
    body.className = 'ytpc-body';

    function row(label, key) {
      const l = document.createElement('label');
      l.className = 'ytpc-row';
      const c = document.createElement('input');
      c.type = 'checkbox'; c.checked = !!cfg[key];
      c.addEventListener('change', () => { cfg[key] = c.checked; saveCfg(); });
      l.appendChild(c);
      l.appendChild(document.createTextNode(label));
      return l;
    }
    body.appendChild(row('영상 광고 자동 스킵', 'adSkip'));
    body.appendChild(row('광고 중 음소거', 'adMute'));
    body.appendChild(row('스폰서 구간 자동 스킵', 'sbSkip'));

    const markRow = row('스폰서 구간 마킹 표시', 'sbMark');
    markRow.querySelector('input').addEventListener('change', e => {
      if (e.target.checked) drawMarkers(); else clearMarkers();
    });
    body.appendChild(markRow);

    const cats = document.createElement('div');
    cats.className = 'ytpc-cats';
    Object.keys(CAT_META).forEach(k => {
      const l = document.createElement('label');
      const c = document.createElement('input');
      c.type = 'checkbox'; c.checked = !!cfg.cats[k];
      c.addEventListener('change', () => {
        cfg.cats[k] = c.checked; saveCfg();
        if (currentVideoId) { segments = []; clearMarkers(); loadSegments(currentVideoId); }
      });
      const dot = document.createElement('span');
      dot.className = 'ytpc-dot';
      dot.style.background = CAT_META[k].color;
      l.appendChild(c); l.appendChild(dot);
      l.appendChild(document.createTextNode(CAT_META[k].label));
      cats.appendChild(l);
    });
    body.appendChild(cats);

    const zr = document.createElement('div');
    zr.className = 'ytpc-zoomrow';
    const bIn = document.createElement('button'); bIn.textContent = '＋';
    const bOut = document.createElement('button'); bOut.textContent = '－';
    const bRs = document.createElement('button'); bRs.textContent = '리셋';
    zoomLbl = document.createElement('span');
    zoomLbl.className = 'ytpc-zoomlbl'; zoomLbl.textContent = '100%';
    bIn.addEventListener('click', () => { zoom.s = Math.min(4, zoom.s * 1.25); applyZoom(); updateZoomLabel(); });
    bOut.addEventListener('click', () => { zoom.s = Math.max(1, zoom.s / 1.25); if (zoom.s <= 1.001) { zoom.x = 0; zoom.y = 0; } applyZoom(); updateZoomLabel(); });
    bRs.addEventListener('click', () => { resetZoom(); updateZoomLabel(); });
    zr.appendChild(bIn); zr.appendChild(bOut); zr.appendChild(bRs); zr.appendChild(zoomLbl);
    body.appendChild(zr);

    const posRow = document.createElement('label');
    posRow.className = 'ytpc-row ytpc-posrow';
    posRow.appendChild(document.createTextNode('\uD83D\uDCCC 패널 위치'));
    const posSel = document.createElement('select');
    posSel.id = 'ytpc-posmode';
    [['corner', '우측 하단'], ['player', '플레이어 위'], ['below', '플레이어 아래']].forEach(([val, label]) => {
      const o = document.createElement('option');
      o.value = val; o.textContent = label;
      posSel.appendChild(o);
    });
    posSel.value = cfg.panelMode || 'corner';
    posSel.addEventListener('change', () => {
      cfg.panelMode = posSel.value;
      cfg.panelPos = null; // 수동 위치 초기화
      saveCfg();
      positionPanel();
      setStatus(cfg.panelMode === 'player' ? '플레이어 하단에 고정' : '우측 하단에 고정');
    });
    posRow.appendChild(posSel);
    body.appendChild(posRow);

    const opRow = document.createElement('label');
    opRow.className = 'ytpc-row';
    opRow.appendChild(document.createTextNode('\uD83C\uDF17 투명도'));
    const opRange = document.createElement('input');
    opRange.type = 'range'; opRange.min = '30'; opRange.max = '100';
    opRange.id = 'ytpc-opacity';
    opRange.value = (cfg.opacity != null ? cfg.opacity : 100);
    const opVal = document.createElement('span');
    opVal.className = 'ytpc-opval';
    const applyOpacity = () => {
      const v = parseInt(opRange.value, 10) || 100;
      panel.style.opacity = (v / 100).toFixed(2);
      opVal.textContent = v + '%';
    };
    opRange.addEventListener('input', applyOpacity);
    opRange.addEventListener('change', () => {
      cfg.opacity = parseInt(opRange.value, 10) || 100;
      saveCfg();
    });
    opRow.appendChild(opRange);
    opRow.appendChild(opVal);
    body.appendChild(opRow);
    applyOpacity();

    const libRow = document.createElement('div');
    libRow.className = 'ytpc-zoomrow';
    const bLib = document.createElement('button'); bLib.textContent = '목록';
    const bSave = document.createElement('button'); bSave.textContent = '저장';
    bLib.title = '다시보기 목록 열기';
    bSave.title = '현재 영상을 다시보기에 저장';
    bLib.addEventListener('click', openLibrary);
    bSave.addEventListener('click', () => openSaveDialog());
    libRow.appendChild(bLib); libRow.appendChild(bSave);
    body.appendChild(libRow);

    const hint = document.createElement('div');
    hint.className = 'ytpc-hint';
    hint.textContent = '줌 100% 초과 시 영상 드래그로 이동';
    body.appendChild(hint);

    statusEl = document.createElement('div');
    statusEl.className = 'ytpc-status';
    body.appendChild(statusEl);

    panel.appendChild(body);
    (document.body || document.documentElement).appendChild(panel);
    makeDraggable(panel, head);
    positionPanel();
  }

  /* ================= 다시보기 라이브러리 ================= */
  function libLoad() { return library; }
  function libWrite(videos) {
    library = videos || {};
    chrome.storage.local.set({ tp_library: { videos: library } })
      .catch(() => setStatus('저장 공간 부족'));
  }
  function isSaved(vid) { return !!libLoad()[vid]; }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function getVideoMeta() {
    const vid = getVideoId();
    if (!vid) return null;
    const v = getVideo();
    let title = '';
    const tEl = document.querySelector('ytd-watch-metadata #title h1 yt-formatted-string') ||
                document.querySelector('#title h1');
    if (tEl) title = tEl.textContent.trim();
    if (!title) title = document.title.replace(/ - YouTube$/, '').trim();
    let channel = '';
    const cEl = document.querySelector('ytd-channel-name#channel-name a') ||
                document.querySelector('#channel-name a');
    if (cEl) channel = cEl.textContent.trim();
    return {
      id: vid,
      title: title || vid,
      channel,
      thumb: 'https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg',
      duration: (v && v.duration && isFinite(v.duration)) ? Math.floor(v.duration) : 0,
    };
  }

  // 영상 설명란의 #해시태그 자동 추출
  function extractHashtags() {
    const tags = new Set();
    const desc = document.querySelector('#description-inline-expander') ||
                 document.querySelector('ytd-expander#description') ||
                 document.querySelector('#description');
    const text = desc ? (desc.innerText || '') : '';
    const re = /#([^\s#.,!?;:'"<>[\](){}]+)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m[1].length <= 30) tags.add(m[1]);
    }
    return [...tags].slice(0, 20);
  }

  /* ---------- 저장 다이얼로그 ---------- */
  let saveOverlay = null;
  function openSaveDialog(existing) {
    const meta = existing || getVideoMeta();
    if (!meta) { setStatus('저장할 영상이 없어요'); return; }
    closeSaveDialog();
    const saved = libLoad()[meta.id];
    const auto = saved ? [] : extractHashtags();

    saveOverlay = document.createElement('div');
    saveOverlay.id = 'ytpc-save-overlay';
    saveOverlay.innerHTML =
      '<div id="ytpc-save">' +
        '<h3>' + (saved ? '저장 정보 편집' : '다시보기 저장') + '</h3>' +
        '<div class="ytpc-save-title"></div>' +
        '<label>태그 (쉼표로 구분)</label>' +
        '<input type="text" id="ytpc-f-tags" value="">' +
        (auto.length ? '<div class="ytpc-autotags">' + auto.map(t =>
          '<span data-tag="' + escapeHtml(t) + '">#' + escapeHtml(t) + ' +</span>').join('') +
          '</div>' : '') +
        '<label>키워드 / 메모 (나중에 이 영상을 떠올릴 단서)</label>' +
        '<textarea id="ytpc-f-notes" placeholder="예: 자막 번역 팁, 12:30부터 실전 데모"></textarea>' +
        '<div class="ytpc-save-btns">' +
          '<button class="ytpc-btn-ok">' + (saved ? '수정' : '저장') + '</button>' +
          (saved ? '<button class="ytpc-btn-del">삭제</button>' : '') +
          '<button class="ytpc-btn-cancel">취소</button>' +
        '</div>' +
      '</div>';

    saveOverlay.querySelector('.ytpc-save-title').textContent = meta.title;
    const tagInput = saveOverlay.querySelector('#ytpc-f-tags');
    tagInput.value = saved ? (saved.tags || []).join(', ') : '';
    const notesInput = saveOverlay.querySelector('#ytpc-f-notes');
    if (saved) notesInput.value = saved.notes || '';
    saveOverlay.querySelectorAll('.ytpc-autotags span').forEach(sp => {
      sp.addEventListener('click', () => {
        const t = sp.getAttribute('data-tag');
        const cur = tagInput.value.split(',').map(s => s.trim()).filter(Boolean);
        if (!cur.includes(t)) cur.push(t);
        tagInput.value = cur.join(', ');
      });
    });
    saveOverlay.querySelector('.ytpc-btn-ok').addEventListener('click', () => {
      const tags = tagInput.value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 30);
      const fresh = libLoad();
      fresh[meta.id] = {
        id: meta.id,
        title: meta.title || (saved && saved.title) || meta.id,
        channel: meta.channel || (saved && saved.channel) || '',
        thumb: 'https://i.ytimg.com/vi/' + meta.id + '/hqdefault.jpg',
        duration: meta.duration || (saved && saved.duration) || 0,
        savedAt: (saved && saved.savedAt) || Date.now(),
        tags,
        notes: notesInput.value.trim().slice(0, 2000),
      };
      libWrite(fresh);
      closeSaveDialog();
      setStatus('저장됨: ' + fresh[meta.id].title.slice(0, 24));
      if (currentVideoId === meta.id) showRecall(meta.id);
    });
    const delBtn = saveOverlay.querySelector('.ytpc-btn-del');
    if (delBtn) delBtn.addEventListener('click', () => {
      if (!confirm('이 영상을 다시보기 목록에서 삭제할까요?')) return;
      const fresh = libLoad(); delete fresh[meta.id]; libWrite(fresh);
      closeSaveDialog(); hideRecall(); setStatus('삭제됨');
    });
    saveOverlay.querySelector('.ytpc-btn-cancel').addEventListener('click', closeSaveDialog);
    saveOverlay.addEventListener('click', e => { if (e.target === saveOverlay) closeSaveDialog(); });
    document.body.appendChild(saveOverlay);
    setTimeout(() => tagInput.focus(), 50);
  }
  function closeSaveDialog() {
    if (saveOverlay) { saveOverlay.remove(); saveOverlay = null; }
  }

  /* ---------- 라이브러리 목록 ---------- */
  let libOverlay = null;
  const libFilter = { q: '', tag: null };
  function openLibrary() {
    closeLibrary();
    libFilter.q = ''; libFilter.tag = null;
    libOverlay = document.createElement('div');
    libOverlay.id = 'ytpc-lib-overlay';
    libOverlay.innerHTML =
      '<div id="ytpc-lib">' +
        '<div class="ytpc-lib-head">' +
          '<input type="text" id="ytpc-lib-q" placeholder="제목 · 채널 · 태그 · 메모 검색…">' +
          '<button id="ytpc-lib-close">닫기</button>' +
        '</div>' +
        '<div class="ytpc-tagbar" id="ytpc-lib-tags"></div>' +
        '<div class="ytpc-lib-list" id="ytpc-lib-list"></div>' +
      '</div>';
    document.body.appendChild(libOverlay);
    const q = libOverlay.querySelector('#ytpc-lib-q');
    q.addEventListener('input', () => { libFilter.q = q.value.trim().toLowerCase(); renderLibList(); });
    libOverlay.querySelector('#ytpc-lib-close').addEventListener('click', closeLibrary);
    libOverlay.addEventListener('click', e => { if (e.target === libOverlay) closeLibrary(); });
    document.addEventListener('keydown', libEsc);
    renderLibTags(); renderLibList();
    setTimeout(() => q.focus(), 50);
  }
  function libEsc(e) {
    if (e.key === 'Escape') { closeLibrary(); closeSaveDialog(); }
  }
  function closeLibrary() {
    if (libOverlay) {
      libOverlay.remove(); libOverlay = null;
      document.removeEventListener('keydown', libEsc);
    }
  }
  function allTags() {
    const counts = {};
    Object.values(libLoad()).forEach(v => (v.tags || []).forEach(t => {
      counts[t] = (counts[t] || 0) + 1;
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }
  function renderLibTags() {
    const bar = libOverlay && libOverlay.querySelector('#ytpc-lib-tags');
    if (!bar) return;
    bar.innerHTML = '';
    const tags = allTags();
    if (!tags.length) { bar.style.display = 'none'; return; }
    bar.style.display = '';
    tags.forEach(([t, n]) => {
      const c = document.createElement('button');
      c.className = 'ytpc-tagchip' + (libFilter.tag === t ? ' on' : '');
      c.textContent = '#' + t + ' (' + n + ')';
      c.addEventListener('click', () => {
        libFilter.tag = (libFilter.tag === t) ? null : t;
        renderLibTags(); renderLibList();
      });
      bar.appendChild(c);
    });
  }
  function libMatches(v) {
    if (libFilter.tag && !(v.tags || []).includes(libFilter.tag)) return false;
    if (libFilter.q) {
      const hay = [v.title, v.channel, (v.tags || []).join(' '), v.notes || '']
        .join(' ').toLowerCase();
      if (!hay.includes(libFilter.q)) return false;
    }
    return true;
  }
  function renderLibList() {
    const list = libOverlay && libOverlay.querySelector('#ytpc-lib-list');
    if (!list) return;
    const videos = Object.values(libLoad()).filter(libMatches)
      .sort((a, b) => b.savedAt - a.savedAt);
    list.innerHTML = '';
    if (!videos.length) {
      list.innerHTML = '<div class="ytpc-empty">저장된 영상이 없어요.<br>' +
        '유튜브에서 패널의 "저장" 버튼으로 추가해 보세요.</div>';
      return;
    }
    videos.forEach(v => {
      const card = document.createElement('div');
      card.className = 'ytpc-card';
      card.innerHTML =
        '<img loading="lazy" src="' + v.thumb + '">' +
        '<div class="ytpc-card-body">' +
          '<div class="ytpc-card-title"></div>' +
          '<div class="ytpc-card-sub"></div>' +
          ((v.tags && v.tags.length) ? '<div class="ytpc-card-tags">' +
            v.tags.map(t => '<span>#' + escapeHtml(t) + '</span>').join('') + '</div>' : '') +
          (v.notes ? '<div class="ytpc-card-notes"></div>' : '') +
          '<div class="ytpc-card-actions"><button data-act="edit">편집</button>' +
          '<button data-act="del">삭제</button></div>' +
        '</div>';
      card.querySelector('.ytpc-card-title').textContent = v.title;
      card.querySelector('.ytpc-card-sub').textContent =
        (v.channel ? v.channel + ' · ' : '') + new Date(v.savedAt).toLocaleDateString();
      const notesEl = card.querySelector('.ytpc-card-notes');
      if (notesEl) notesEl.textContent = v.notes;
      card.querySelector('img').addEventListener('click', () => {
        closeLibrary();
        location.href = 'https://www.youtube.com/watch?v=' + v.id;
      });
      card.querySelector('[data-act="edit"]').addEventListener('click', e => {
        e.stopPropagation(); openSaveDialog(v);
      });
      card.querySelector('[data-act="del"]').addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm('"' + v.title.slice(0, 30) + '" 삭제할까요?')) return;
        const fresh = libLoad(); delete fresh[v.id]; libWrite(fresh);
        renderLibTags(); renderLibList();
        if (currentVideoId === v.id) hideRecall();
      });
      list.appendChild(card);
    });
  }

  /* ---------- 저장됨 리콜 배너 (영상 열면 태그/메모 표시) ---------- */
  function hideRecall() {
    const el = document.getElementById('ytpc-recall');
    if (el) el.remove();
  }
  function showRecall(vid) {
    hideRecall();
    const v = libLoad()[vid];
    const p = getPlayer();
    if (!v || !p) return;
    const el = document.createElement('div');
    el.id = 'ytpc-recall';
    el.innerHTML =
      '<div><b>다시보기 저장됨</b> · ' + new Date(v.savedAt).toLocaleDateString() + '</div>' +
      ((v.tags && v.tags.length) ? '<div class="ytpc-recall-tags">' +
        v.tags.map(t => '<span>#' + escapeHtml(t) + '</span>').join('') + '</div>' : '') +
      (v.notes ? '<div class="ytpc-recall-notes"></div>' : '') +
      '<div class="ytpc-recall-btns"><button data-a="lib">목록</button>' +
      '<button data-a="edit">편집</button><button data-a="hide">닫기</button></div>';
    if (v.notes) el.querySelector('.ytpc-recall-notes').textContent = v.notes;
    el.addEventListener('click', e => e.stopPropagation());
    el.querySelector('[data-a="lib"]').addEventListener('click', openLibrary);
    el.querySelector('[data-a="edit"]').addEventListener('click', () => openSaveDialog(v));
    el.querySelector('[data-a="hide"]').addEventListener('click', hideRecall);
    p.appendChild(el);
  }
  function checkRecall(vid) {
    hideRecall();
    if (!vid || !isSaved(vid)) return;
    let tries = 0;
    const iv = setInterval(() => {
      if (vid !== currentVideoId) { clearInterval(iv); return; }
      if (getPlayer()) { clearInterval(iv); showRecall(vid); }
      else if (++tries > 16) clearInterval(iv);
    }, 300);
  }

  /* ================= 메인 루프 ================= */
  let lastHref = '';
  function tick() {
    if (location.href !== lastHref) {
      lastHref = location.href;
      const vid = getVideoId();
      if (vid !== currentVideoId) onVideoChange(vid);
    }
    // 메타데이터 로드 후 마킹이 안 그려졌으면 재시도
    const v = getVideo();
    if (v && cfg.sbMark && segments.length && !document.querySelector('.ytpc-marker') &&
        v.duration && isFinite(v.duration)) {
      drawMarkers();
    }
    handleAds();
    handleSponsorSkip();
    // 패널이 유튜브 리렌더로 사라졌으면 복구
    if (!document.getElementById('ytpc-panel')) {
      try { buildPanel(); } catch (e) {}
    } else if ((cfg.panelMode === 'player' || cfg.panelMode === 'below') && !cfg.panelPos) {
      // 플레이어 위/아래 모드: 플레이어 크기·위치 변화를 따라감 (수동 드래그 위치가 없을 때만)
      positionPanel();
    }
  }

  /* ================= 초기화 ================= */
  let inited = false;
  function init() {
    if (inited) return;
    inited = true;
    console.log('[TubePilot] content script loaded');
    try {
      buildPanel();
    } catch (e) {
      console.error('[TubePilot] panel build failed:', e);
    }
    setInterval(() => {
      try { tick(); } catch (e) { console.error('[TubePilot] tick error:', e); }
    }, 300);
    window.addEventListener('resize', () => {
      if (cfg.panelMode === 'player' && !cfg.panelPos) positionPanel();
    });
    document.addEventListener('fullscreenchange', () => {
      const p = document.getElementById('ytpc-panel');
      if (p) p.style.display = document.fullscreenElement ? 'none' : '';
    });
    try { tick(); } catch (e) { console.error('[TubePilot] tick error:', e); }
  }
  // MV3 부트: 저장소에서 설정/라이브러리 로드 후 시작
  (async function boot() {
    try {
      const s = await chrome.storage.local.get(['tp_enabled', 'tp_cfg', 'tp_library']);
      if (s.tp_enabled === false) { console.log('[TubePilot] disabled'); return; }
      cfg = Object.assign({}, DEFAULTS, s.tp_cfg || {});
      cfg.cats = Object.assign({}, DEFAULTS.cats, cfg.cats || {});
      library = (s.tp_library && s.tp_library.videos) ? s.tp_library.videos : {};
    } catch (e) {
      console.error('[TubePilot] storage load failed:', e);
    }
    if (document.body) {
      init();
    } else if (document.readyState !== 'loading') {
      init();
    } else {
      document.addEventListener('DOMContentLoaded', init, { once: true });
      // 안전망: DOMContentLoaded가 안 오면 3초 후 강제 시도
      setTimeout(init, 3000);
    }
  })();
})();
