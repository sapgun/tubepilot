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
    hideComments: false,  // 댓글 숨기기 (몰입 모드)
    shotMode: 'download', // 스크린샷 저장 방식: download | clipboard | both
    hotkeys: { shot: 'Alt+S', comments: 'Alt+H', save: 'Alt+B' }, // 단축키 (팝업에서 변경 가능)
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
    sponsor:        { labelKey: 'cat_sponsor',      color: '#00d400' },
    intro:          { labelKey: 'cat_intro',      color: '#00ffff' },
    outro:          { labelKey: 'cat_outro',    color: '#0202ed' },
    selfpromo:      { labelKey: 'cat_selfpromo',    color: '#ffff00' },
    interaction:    { labelKey: 'cat_interaction',   color: '#cc00ff' },
    music_offtopic: { labelKey: 'cat_music_offtopic', color: '#ff9900' },
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
      setStatus(T('st_loading'));
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
            setStatus(segments.length ? T('st_loaded', { n: segments.length }) : T('st_empty'));
          } catch (e) { setStatus(T('st_parse_fail')); }
        } else if (res.status === 404) {
          segments = []; clearMarkers(); setStatus(T('st_empty'));
        } else {
          setStatus(T('st_fetch_fail', { status: res.status }));
        }
      },
      onerror: function () { if (vid === currentVideoId) setStatus(T('st_conn_fail')); },
      ontimeout: function () { if (vid === currentVideoId) setStatus(T('st_timeout')); },
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
      const meta = CAT_META[s.cat] || { labelKey: null, color: '#ffffff' };
      const el = document.createElement('div');
      el.className = 'ytpc-marker';
      el.style.left = (s.start / dur * 100) + '%';
      el.style.width = Math.max(0.4, (s.end - s.start) / dur * 100) + '%';
      el.style.background = meta.color;
      el.title = T('marker_title', { label: T(meta.labelKey || s.cat), start: fmtTime(s.start), end: fmtTime(s.end) });
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
        const catLabel = T(meta.labelKey || s.cat);
        setStatus(T('st_skipped', { label: catLabel }));
        showSkipToast(catLabel);
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
        setStatus(segments.length ? T('st_loaded', { n: segments.length }) : '');
      }
      return;
    }
    if (!adState) adState = { muted: v.muted, rate: v.playbackRate };
    if (!cfg.adSkip && !cfg.adMute) return;

    if (cfg.adMute) { try { v.muted = true; } catch (e) {} }
    setStatus(T('st_ad_skipping'));

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
    t.textContent = T('toast_skipped', { label });
    t.classList.add('ytpc-show');
    clearTimeout(skipToastTimer);
    skipToastTimer = setTimeout(() => t.classList.remove('ytpc-show'), 1600);
  }
  function applyCommentVisibility() {
    // CSS 클래스 토글 방식: 유튜브가 댓글 DOM을 다시 그려도 유지됨
    let st = document.getElementById('ytpc-nocomments-style');
    if (!st) {
      st = document.createElement('style');
      st.id = 'ytpc-nocomments-style';
      st.textContent = 'html.ytpc-nocomments #comments, html.ytpc-nocomments ytd-comments { display: none !important; }';
      (document.head || document.documentElement).appendChild(st);
    }
    document.documentElement.classList.toggle('ytpc-nocomments', !!cfg.hideComments);
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
        setStatus(T('st_panel_saved'));
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
      setStatus(T('st_panel_reset'));
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
    body.appendChild(row(T('row_adskip'), 'adSkip'));
    body.appendChild(row(T('row_admute'), 'adMute'));
    const cmtRow = row(T('row_hide_comments'), 'hideComments');
    cmtRow.querySelector('input').addEventListener('change', applyCommentVisibility);
    body.appendChild(cmtRow);
    body.appendChild(row(T('row_sbskip'), 'sbSkip'));

    const markRow = row(T('row_sbmark'), 'sbMark');
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
      l.appendChild(document.createTextNode(T(CAT_META[k].labelKey)));
      cats.appendChild(l);
    });
    body.appendChild(cats);

    const zr = document.createElement('div');
    zr.className = 'ytpc-zoomrow';
    const bIn = document.createElement('button'); bIn.textContent = '＋';
    const bOut = document.createElement('button'); bOut.textContent = '－';
    const bRs = document.createElement('button'); bRs.textContent = T('zoom_reset');
    zoomLbl = document.createElement('span');
    zoomLbl.className = 'ytpc-zoomlbl'; zoomLbl.textContent = '100%';
    bIn.addEventListener('click', () => { zoom.s = Math.min(4, zoom.s * 1.25); applyZoom(); updateZoomLabel(); });
    bOut.addEventListener('click', () => { zoom.s = Math.max(1, zoom.s / 1.25); if (zoom.s <= 1.001) { zoom.x = 0; zoom.y = 0; } applyZoom(); updateZoomLabel(); });
    bRs.addEventListener('click', () => { resetZoom(); updateZoomLabel(); });
    zr.appendChild(bIn); zr.appendChild(bOut); zr.appendChild(bRs); zr.appendChild(zoomLbl);
    body.appendChild(zr);

    const posRow = document.createElement('label');
    posRow.className = 'ytpc-row ytpc-posrow';
    posRow.appendChild(document.createTextNode(T('pos_label')));
    const posSel = document.createElement('select');
    posSel.id = 'ytpc-posmode';
    [['corner', T('pos_corner')], ['player', T('pos_player')], ['below', T('pos_below')]].forEach(([val, label]) => {
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
      setStatus(T(cfg.panelMode === 'player' ? 'st_pinned_player' : 'st_pinned_corner'));
    });
    posRow.appendChild(posSel);
    body.appendChild(posRow);

    const opRow = document.createElement('label');
    opRow.className = 'ytpc-row';
    opRow.appendChild(document.createTextNode(T('op_label')));
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
    const bLib = document.createElement('button'); bLib.textContent = T('btn_list');
    const bSave = document.createElement('button'); bSave.textContent = T('btn_save');
    const bShot = document.createElement('button'); bShot.textContent = T('btn_shot');
    const bBm = document.createElement('button'); bBm.textContent = T('btn_bookmark');
    bLib.title = T('title_list');
    bSave.title = T('title_save');
    bShot.title = T('title_shot');
    bBm.title = T('bm_title');
    bLib.addEventListener('click', openLibrary);
    bSave.addEventListener('click', () => openSaveDialog());
    bShot.addEventListener('click', takeScreenshot);
    bBm.addEventListener('click', openBookmarkDialog);
    libRow.appendChild(bLib); libRow.appendChild(bSave); libRow.appendChild(bShot); libRow.appendChild(bBm);
    body.appendChild(libRow);

    const hint = document.createElement('div');
    hint.className = 'ytpc-hint';
    hint.textContent = T('zoom_hint');
    body.appendChild(hint);
    const keyHint = document.createElement('div');
    keyHint.className = 'ytpc-hint';
    const hk0 = tpHotkeys();
    keyHint.textContent = T('hint_keys', { shot: hk0.shot, comments: hk0.comments, save: hk0.save });
    body.appendChild(keyHint);

    statusEl = document.createElement('div');
    statusEl.className = 'ytpc-status';
    body.appendChild(statusEl);

    panel.appendChild(body);
    (document.body || document.documentElement).appendChild(panel);
    makeDraggable(panel, head);
    positionPanel();
    applyCommentVisibility();
  }

  /* ================= 다시보기 라이브러리 ================= */
  function libLoad() { return library; }
  function libWrite(videos) {
    library = videos || {};
    chrome.storage.local.set({ tp_library: { videos: library } })
      .catch(() => setStatus(T('st_quota')));
  }
  /* ---------- 백업: JSON 내보내기/가져오기 ---------- */
  function exportBackup() {
    const data = {
      app: 'TubePilot', format: 1,
      exportedAt: new Date().toISOString(),
      cfg: cfg, library: library, bookmarks: bmLoad()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date(), p2 = (n) => String(n).padStart(2, '0');
    a.href = URL.createObjectURL(blob);
    a.download = 'tubepilot-backup-' + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) +
                 '-' + p2(d.getHours()) + p2(d.getMinutes()) + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    setStatus(T('st_backup_saved'));
  }
  function importBackup(file) {
    const r = new FileReader();
    r.onload = () => {
      let data = null;
      try { data = JSON.parse(r.result); } catch (e) {}
      if (!data || data.app !== 'TubePilot' || !data.library || typeof data.library !== 'object') {
        setStatus(T('st_backup_bad'));
        return;
      }
      const n = Object.keys(data.library).length;
      if (!confirm(T('confirm_restore', { n }))) return;
      const newCfg = Object.assign({}, DEFAULTS, data.cfg || {});
      chrome.storage.local.set({ tp_cfg: newCfg }, () => {
        cfg = newCfg;
        libWrite(data.library);
        if (Array.isArray(data.bookmarks)) bmWrite(data.bookmarks);
        const p = document.getElementById('ytpc-panel');
        if (p) p.remove();
        try { buildPanel(); } catch (e) {}
        renderLibTags(); renderLibList();
        setStatus(T('st_restored', { n }));
      });
    };
    r.readAsText(file);
  }
  function isSaved(vid) { return !!libLoad()[vid]; }

  /* ================= 스크린샷 (Alt+S) ================= */
  // chrome.tabs.captureVisibleTab은 content script에서 호출 불가 →
  // background service worker에 요청 후 영상 영역만 잘라 PNG로 저장
  function takeScreenshot() {
    const v = getVideo();
    if (!v || !v.videoWidth) { setStatus(T('shot_no_video')); return; }
    const r = v.getBoundingClientRect();
    const x = Math.max(0, r.left), y = Math.max(0, r.top);
    const w = Math.min(r.width, window.innerWidth - x);
    const h = Math.min(r.height, window.innerHeight - y);
    if (w <= 0 || h <= 0) { setStatus(T('shot_no_video')); return; }
    if (!chrome.runtime || !chrome.runtime.sendMessage) { setStatus(T('shot_fail')); return; }
    chrome.runtime.sendMessage({ type: 'TP_CAPTURE' }, (res) => {
      if ((chrome.runtime && chrome.runtime.lastError) || !res || !res.dataUrl) {
        setStatus(T('shot_fail')); return;
      }
      cropAndDownload(res.dataUrl, x, y, w, h); // CSS 픽셀 그대로 전달
    });
  }
  // 캡처 이미지의 실제 해상도를 재서 스케일 계산 (devicePixelRatio 가정 금지:
  // 캡처 API의 실제 반환 해상도가 환경마다 다를 수 있음)
  function tpCaptureScale(imgW, innerW) {
    if (!imgW || !innerW) return 1;
    return imgW / innerW;
  }
  if (typeof window !== 'undefined') window.__tpCaptureScale = tpCaptureScale;
  function finishShot(canvas) {
    canvas.toBlob((blob) => {
      if (!blob) { setStatus(T('shot_fail')); return; }
      const mode = cfg.shotMode === 'clipboard' ? 'clipboard'
        : cfg.shotMode === 'both' ? 'both' : 'download';
      const canCopy = typeof window.ClipboardItem !== 'undefined' &&
        navigator.clipboard && typeof navigator.clipboard.write === 'function';
      const doDownload = () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const d = new Date(), p2 = (n) => String(n).padStart(2, '0');
        a.download = 'tubepilot-' + (getVideoId() || 'shot') + '-' +
          d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + '-' +
          p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds()) + '.png';
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        setStatus(T('shot_saved'));
      };
      if (mode === 'download' || !canCopy) { doDownload(); return; }
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(
        () => setStatus(T(mode === 'both' ? 'shot_saved' : 'shot_copied')),
        () => doDownload() // 클립보드 실패 → 다운로드 폴백
      );
      if (mode === 'both') doDownload();
    }, 'image/png');
  }
  function cropAndDownload(dataUrl, x, y, w, h) {
    const img = new Image();
    img.onload = () => {
      try {
        const s = tpCaptureScale(img.naturalWidth, window.innerWidth);
        let sx = Math.round(x * s), sy = Math.round(y * s);
        let sw = Math.round(w * s), sh = Math.round(h * s);
        // 이미지 범위로 클램프 (범위 밖 잘라내기는 검게 나올 수 있음)
        sx = Math.max(0, Math.min(sx, img.naturalWidth - 1));
        sy = Math.max(0, Math.min(sy, img.naturalHeight - 1));
        sw = Math.max(1, Math.min(sw, img.naturalWidth - sx));
        sh = Math.max(1, Math.min(sh, img.naturalHeight - sy));
        const c = document.createElement('canvas');
        c.width = sw; c.height = sh;
        c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        finishShot(c);
      } catch (e) { setStatus(T('shot_fail')); }
    };
    img.onerror = () => setStatus(T('shot_fail'));
    img.src = dataUrl;
  }

  /* ================= 단축키 ================= */
  // "Alt+Shift+S" 형태 파싱 → {ctrl, alt, shift, meta, key}
  function tpParseHotkey(str) {
    const hk = { ctrl: false, alt: false, shift: false, meta: false, key: '' };
    for (const p of String(str || '').split('+')) {
      const u = p.trim().toUpperCase();
      if (u === 'CTRL' || u === 'CONTROL') hk.ctrl = true;
      else if (u === 'ALT') hk.alt = true;
      else if (u === 'SHIFT') hk.shift = true;
      else if (u === 'META' || u === 'CMD' || u === 'COMMAND' || u === 'WIN') hk.meta = true;
      else if (u) hk.key = u;
    }
    return hk;
  }
  function tpMatchHotkey(e, str) {
    const hk = tpParseHotkey(str);
    if (!hk.key) return false;
    if (!!e.ctrlKey !== hk.ctrl || !!e.altKey !== hk.alt ||
        !!e.shiftKey !== hk.shift || !!e.metaKey !== hk.meta) return false;
    const k = String(e.key || '').toUpperCase();
    return k === hk.key;
  }
  if (typeof window !== 'undefined') {
    window.__tpHotkey = { parse: tpParseHotkey, match: tpMatchHotkey };
  }
  function tpHotkeys() {
    return Object.assign({}, DEFAULTS.hotkeys, cfg.hotkeys || {});
  }
  // Alt+S 캡처 · Alt+H 댓글 숨기기 토글 · Alt+B 다시보기 저장 (팝업에서 변경 가능)
  function onHotkey(e) {
    const t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (t && t.isContentEditable) return;
    const hk = tpHotkeys();
    if (tpMatchHotkey(e, hk.shot)) { e.preventDefault(); takeScreenshot(); }
    else if (tpMatchHotkey(e, hk.comments)) { e.preventDefault(); toggleComments(); }
    else if (tpMatchHotkey(e, hk.save)) { e.preventDefault(); openSaveDialog(); }
  }
  function toggleComments() {
    cfg.hideComments = !cfg.hideComments;
    saveCfg();
    applyCommentVisibility();
    // 패널 체크박스도 동기화
    const p = document.getElementById('ytpc-panel');
    const row = p && [...p.querySelectorAll('label.ytpc-row')]
      .find(l => l.textContent.includes(T('row_hide_comments')));
    const box = row && row.querySelector('input');
    if (box) box.checked = !!cfg.hideComments;
  }
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
    if (!meta) { setStatus(T('st_no_meta')); return; }
    closeSaveDialog();
    const saved = libLoad()[meta.id];
    const auto = saved ? [] : extractHashtags();

    saveOverlay = document.createElement('div');
    saveOverlay.id = 'ytpc-save-overlay';
    saveOverlay.innerHTML =
      '<div id="ytpc-save">' +
        '<h3>' + (saved ? T('save_title_edit') : T('save_title_new')) + '</h3>' +
        '<div class="ytpc-save-title"></div>' +
        '<label>' + T('save_tags_label') + '</label>' +
        '<input type="text" id="ytpc-f-tags" value="">' +
        (auto.length ? '<div class="ytpc-autotags">' + auto.map(t =>
          '<span data-tag="' + escapeHtml(t) + '">#' + escapeHtml(t) + ' +</span>').join('') +
          '</div>' : '') +
        '<label>' + T('save_notes_label') + '</label>' +
        '<textarea id="ytpc-f-notes" placeholder="' + escapeHtml(T('save_notes_ph')) + '"></textarea>' +
        '<div class="ytpc-save-btns">' +
          '<button class="ytpc-btn-ok">' + (saved ? T('btn_ok_edit') : T('btn_ok_new')) + '</button>' +
          (saved ? '<button class="ytpc-btn-del">' + T('card_del') + '</button>' : '') +
          '<button class="ytpc-btn-cancel">' + T('btn_cancel') + '</button>' +
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
      setStatus(T('st_saved', { title: fresh[meta.id].title.slice(0, 24) }));
      if (currentVideoId === meta.id) showRecall(meta.id);
    });
    const delBtn = saveOverlay.querySelector('.ytpc-btn-del');
    if (delBtn) delBtn.addEventListener('click', () => {
      if (!confirm(T('confirm_del_video'))) return;
      const fresh = libLoad(); delete fresh[meta.id]; libWrite(fresh);
      closeSaveDialog(); hideRecall(); setStatus(T('st_deleted'));
    });
    saveOverlay.querySelector('.ytpc-btn-cancel').addEventListener('click', closeSaveDialog);
    saveOverlay.addEventListener('click', e => { if (e.target === saveOverlay) closeSaveDialog(); });
    document.body.appendChild(saveOverlay);
    setTimeout(() => tagInput.focus(), 50);
  }
  function closeSaveDialog() {
    if (saveOverlay) { saveOverlay.remove(); saveOverlay = null; }
  }

  /* ================= 구간 북마크 ================= */
  let bookmarks = [];
  let bmStopAt = null; // {videoId, end} — 점프 후 구간 끝에서 자동 일시정지
  function bmLoad() { return bookmarks; }
  function bmWrite(list) {
    bookmarks = list;
    try { chrome.storage.local.set({ tp_bookmarks: list }); } catch (e) {}
  }
  function tpFmtTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  function tpParseTime(str) {
    const t = String(str || '').trim();
    if (!t) return null;
    if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t);
    const m = t.match(/^(?:(\d+):)?([0-5]?\d):([0-5]\d)$/);
    if (!m) return null;
    return ((parseInt(m[1] || '0', 10) * 60) + parseInt(m[2], 10)) * 60 + parseInt(m[3], 10);
  }
  if (typeof window !== 'undefined') window.__tpBm = {
    fmt: tpFmtTime, parse: tpParseTime,
    get stopAt() { return bmStopAt; },
  };
  let bmOverlay = null;
  function openBookmarkDialog() {
    const v = getVideo();
    const meta = getVideoMeta();
    if (!v || !meta) { setStatus(T('st_no_meta')); return; }
    closeBookmarkDialog();
    const now = v.currentTime || 0;
    bmOverlay = document.createElement('div');
    bmOverlay.id = 'ytpc-bm-overlay';
    bmOverlay.innerHTML =
      '<div id="ytpc-bm">' +
        '<h3>' + T('bm_title') + '</h3>' +
        '<div class="ytpc-save-title"></div>' +
        '<div class="ytpc-bm-timerow">' +
          '<input type="text" id="ytpc-bm-start" value="' + tpFmtTime(now) + '" placeholder="m:ss">' +
          '<button id="ytpc-bm-now-start">' + T('bm_set_start') + '</button>' +
        '</div>' +
        '<div class="ytpc-bm-timerow">' +
          '<input type="text" id="ytpc-bm-end" value="' + tpFmtTime(now + 30) + '" placeholder="m:ss">' +
          '<button id="ytpc-bm-now-end">' + T('bm_set_end') + '</button>' +
        '</div>' +
        '<input type="text" id="ytpc-bm-memo" placeholder="' + escapeHtml(T('bm_memo_ph')) + '">' +
        '<p class="ytpc-bm-err" id="ytpc-bm-err"></p>' +
        '<div class="ytpc-save-btns">' +
          '<button class="ytpc-btn-ok">' + T('bm_save') + '</button>' +
          '<button class="ytpc-btn-cancel">' + T('btn_cancel') + '</button>' +
        '</div>' +
      '</div>';
    bmOverlay.querySelector('.ytpc-save-title').textContent = meta.title || meta.id;
    const startInput = bmOverlay.querySelector('#ytpc-bm-start');
    const endInput = bmOverlay.querySelector('#ytpc-bm-end');
    const memoInput = bmOverlay.querySelector('#ytpc-bm-memo');
    const errEl = bmOverlay.querySelector('#ytpc-bm-err');
    bmOverlay.querySelector('#ytpc-bm-now-start').addEventListener('click', () => {
      const vv = getVideo(); if (vv) startInput.value = tpFmtTime(vv.currentTime || 0);
      errEl.textContent = '';
    });
    bmOverlay.querySelector('#ytpc-bm-now-end').addEventListener('click', () => {
      const vv = getVideo(); if (vv) endInput.value = tpFmtTime(vv.currentTime || 0);
      errEl.textContent = '';
    });
    bmOverlay.querySelector('.ytpc-btn-ok').addEventListener('click', () => {
      const start = tpParseTime(startInput.value), end = tpParseTime(endInput.value);
      if (start == null || end == null || end <= start) { errEl.textContent = T('bm_invalid'); return; }
      const list = bmLoad().slice();
      list.unshift({
        id: 'bm' + Date.now().toString(36),
        videoId: meta.id, title: meta.title || meta.id,
        start: Math.floor(start), end: Math.floor(end),
        memo: memoInput.value.trim().slice(0, 500),
        createdAt: Date.now(),
      });
      bmWrite(list);
      closeBookmarkDialog();
      setStatus(T('bm_saved'));
    });
    bmOverlay.querySelector('.ytpc-btn-cancel').addEventListener('click', closeBookmarkDialog);
    bmOverlay.addEventListener('click', e => { if (e.target === bmOverlay) closeBookmarkDialog(); });
    document.body.appendChild(bmOverlay);
  }
  function closeBookmarkDialog() {
    if (bmOverlay) { bmOverlay.remove(); bmOverlay = null; }
  }
  function tpBmJump(b) {
    if (b.end > b.start) bmStopAt = { videoId: b.videoId, end: b.end };
    location.href = 'https://www.youtube.com/watch?v=' + b.videoId + '&t=' + Math.floor(b.start) + 's';
  }

  /* ---------- 라이브러리 목록 ---------- */
  let libOverlay = null;
  const libFilter = { q: '', tag: null, tab: 'videos' };
  function openLibrary() {
    closeLibrary();
    libFilter.q = ''; libFilter.tag = null; libFilter.tab = 'videos';
    libOverlay = document.createElement('div');
    libOverlay.id = 'ytpc-lib-overlay';
    libOverlay.innerHTML =
      '<div id="ytpc-lib">' +
        '<div class="ytpc-lib-head">' +
          '<input type="text" id="ytpc-lib-q" placeholder="' + escapeHtml(T('lib_search_ph')) + '">' +
          '<button id="ytpc-lib-export" title="' + escapeHtml(T('title_backup')) + '">' + T('btn_backup') + '</button>' +
          '<button id="ytpc-lib-import" title="' + escapeHtml(T('title_restore')) + '">' + T('btn_restore') + '</button>' +
          '<button id="ytpc-lib-close">' + T('btn_close') + '</button>' +
        '</div>' +
        '<div class="ytpc-lib-tabs">' +
          '<button data-tab="videos" class="on">' + T('bm_tab_videos') + '</button>' +
          '<button data-tab="marks">' + T('bm_tab_marks') + '</button>' +
        '</div>' +
        '<div class="ytpc-tagbar" id="ytpc-lib-tags"></div>' +
        '<div class="ytpc-lib-list" id="ytpc-lib-list"></div>' +
      '</div>';
    document.body.appendChild(libOverlay);
    const q = libOverlay.querySelector('#ytpc-lib-q');
    q.addEventListener('input', () => { libFilter.q = q.value.trim().toLowerCase(); renderLibList(); });
    libOverlay.querySelectorAll('.ytpc-lib-tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        libFilter.tab = btn.getAttribute('data-tab');
        libOverlay.querySelectorAll('.ytpc-lib-tabs button').forEach(b2 =>
          b2.classList.toggle('on', b2 === btn));
        const tagbar = libOverlay.querySelector('#ytpc-lib-tags');
        if (tagbar) tagbar.style.display = libFilter.tab === 'marks' ? 'none' : '';
        renderLibList();
      });
    });
    libOverlay.querySelector('#ytpc-lib-close').addEventListener('click', closeLibrary);
    libOverlay.querySelector('#ytpc-lib-export').addEventListener('click', exportBackup);
    const impBtn = libOverlay.querySelector('#ytpc-lib-import');
    const impFile = document.createElement('input');
    impFile.type = 'file'; impFile.accept = 'application/json,.json'; impFile.style.display = 'none';
    impFile.addEventListener('change', () => {
      if (impFile.files[0]) importBackup(impFile.files[0]);
      impFile.value = '';
    });
    impBtn.addEventListener('click', () => impFile.click());
    libOverlay.appendChild(impFile);
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
    list.innerHTML = '';
    if ((libFilter.tab || 'videos') === 'marks') { renderBmList(list); return; }
    const videos = Object.values(libLoad()).filter(libMatches)
      .sort((a, b) => b.savedAt - a.savedAt);
    if (!videos.length) {
      list.innerHTML = '<div class="ytpc-empty">' + T('lib_empty') + '<br>' +
        T('lib_empty_hint') + '</div>';
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
          '<div class="ytpc-card-actions"><button data-act="edit">' + T('card_edit') + '</button>' +
          '<button data-act="del">' + T('card_del') + '</button></div>' +
        '</div>';
      card.querySelector('.ytpc-card-title').textContent = v.title;
      card.querySelector('.ytpc-card-sub').textContent =
        (v.channel ? v.channel + ' · ' : '') + new Date(v.savedAt).toLocaleDateString(TP_LANG);
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
        if (!confirm(T('confirm_del_item', { title: v.title.slice(0, 30) }))) return;
        const fresh = libLoad(); delete fresh[v.id]; libWrite(fresh);
        renderLibTags(); renderLibList();
        if (currentVideoId === v.id) hideRecall();
      });
      list.appendChild(card);
    });
  }
  function renderBmList(list) {
    const marks = bmLoad().filter(b => {
      if (!libFilter.q) return true;
      return [b.title, b.memo || ''].join(' ').toLowerCase().includes(libFilter.q);
    });
    if (!marks.length) {
      list.innerHTML = '<div class="ytpc-empty">' + T('bm_empty') + '</div>';
      return;
    }
    marks.forEach(b => {
      const row = document.createElement('div');
      row.className = 'ytpc-bmrow';
      row.innerHTML =
        '<div class="ytpc-bmrow-main"><div class="ytpc-bmrow-title"></div>' +
        '<div class="ytpc-bmrow-time">' + tpFmtTime(b.start) + ' – ' + tpFmtTime(b.end) + '</div>' +
        (b.memo ? '<div class="ytpc-bmrow-memo"></div>' : '') + '</div>' +
        '<div class="ytpc-bmrow-actions"><button data-act="jump">' + T('bm_jump') + '</button>' +
        '<button data-act="del">' + T('bm_del') + '</button></div>';
      row.querySelector('.ytpc-bmrow-title').textContent = b.title;
      const memoEl = row.querySelector('.ytpc-bmrow-memo');
      if (memoEl) memoEl.textContent = b.memo;
      row.querySelector('[data-act="jump"]').addEventListener('click', () => {
        closeLibrary(); tpBmJump(b);
      });
      row.querySelector('[data-act="del"]').addEventListener('click', () => {
        if (!confirm(T('confirm_del_item', { title: b.title.slice(0, 30) }))) return;
        bmWrite(bmLoad().filter(x => x.id !== b.id));
        renderLibList();
      });
      list.appendChild(row);
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
      '<div><b>' + T('recall_title') + '</b> · ' + new Date(v.savedAt).toLocaleDateString(TP_LANG) + '</div>' +
      ((v.tags && v.tags.length) ? '<div class="ytpc-recall-tags">' +
        v.tags.map(t => '<span>#' + escapeHtml(t) + '</span>').join('') + '</div>' : '') +
      (v.notes ? '<div class="ytpc-recall-notes"></div>' : '') +
      '<div class="ytpc-recall-btns"><button data-a="lib">' + T('recall_list') + '</button>' +
      '<button data-a="edit">' + T('recall_edit') + '</button><button data-a="hide">' + T('recall_hide') + '</button></div>';
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
    // 구간 북마크 점프 후 끝에서 자동 일시정지
    if (bmStopAt && currentVideoId === bmStopAt.videoId) {
      const pv = getVideo();
      if (pv && !pv.paused && pv.currentTime >= bmStopAt.end) {
        pv.pause();
        bmStopAt = null;
        setStatus(T('bm_stop_end'));
      }
    }
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
    document.addEventListener('keydown', onHotkey);
    // 팝업에서 언어 변경 → 패널 즉시 리빌드
    try {
      if (chrome.storage.onChanged && chrome.storage.onChanged.addListener) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'local' && changes && changes.tp_lang) {
            tpSetLang(tpPickLang(changes.tp_lang.newValue, navigator.language));
            const p = document.getElementById('ytpc-panel');
            if (p) p.remove();
            closeSaveDialog(); closeLibrary(); hideRecall(); closeBookmarkDialog();
            try { buildPanel(); } catch (e) {}
          }
          // 팝업에서 설정 변경 → 즉시 반영 (새로고침 불필요)
          if (area === 'local' && changes && changes.tp_cfg) {
            const oldHk = JSON.stringify((cfg.hotkeys || {}));
            cfg = Object.assign({}, DEFAULTS, changes.tp_cfg.newValue || {});
            cfg.cats = Object.assign({}, DEFAULTS.cats, cfg.cats || {});
            // 단축키가 바뀌면 힌트 문구 갱신을 위해 패널 리빌드
            if (JSON.stringify(cfg.hotkeys || {}) !== oldHk) {
              const p2 = document.getElementById('ytpc-panel');
              if (p2) { p2.remove(); try { buildPanel(); } catch (e2) {} }
            }
          }
        });
      }
    } catch (e) {}
    try { tick(); } catch (e) { console.error('[TubePilot] tick error:', e); }
  }
  // MV3 부트: 저장소에서 설정/라이브러리 로드 후 시작
  (async function boot() {
    try {
      const s = await chrome.storage.local.get(['tp_enabled', 'tp_cfg', 'tp_library', 'tp_lang', 'tp_bookmarks']);
      tpSetLang(tpPickLang(s.tp_lang, navigator.language));
      if (s.tp_enabled === false) { console.log('[TubePilot] disabled'); return; }
      cfg = Object.assign({}, DEFAULTS, s.tp_cfg || {});
      cfg.cats = Object.assign({}, DEFAULTS.cats, cfg.cats || {});
      bookmarks = Array.isArray(s.tp_bookmarks) ? s.tp_bookmarks : [];
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
