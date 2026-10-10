const assert = require('node:assert/strict');
const { fixture, sleep } = require('./skip-test');
(async () => {
  const f = await fixture({ tp_cfg: { panelCollapsed: false, sbSkip: true, adSkip: false, adMute: false }, tp_library: { videos: {
    VIDEO_A: { id:'VIDEO_A',title:'Study video',duration:100,lastPosition:40,savedAt:1,tags:['learn'],notes:'Keep this note' },
  } } });
  const { w,doc,video,store }=f;
  let playing=false, ended=false;
  Object.defineProperty(video,'paused',{get:()=>!playing,configurable:true});
  Object.defineProperty(video,'ended',{get:()=>ended&&video.currentTime>=video.duration,configurable:true});
  video.play=async()=>{playing=true};video.pause=()=>{playing=false};
  doc.body.insertAdjacentHTML('beforeend','<ytd-watch-next-secondary-results-renderer>Recommended</ytd-watch-next-secondary-results-renderer><ytd-live-chat-frame>Chat</ytd-live-chat-frame>');
  doc.querySelector('#movie_player').insertAdjacentHTML('beforeend','<div class="ytp-ce-element">End card</div><div class="ytp-chrome-bottom">Controls</div>');
  await f.update({ hideRecommendations:true });
  assert.equal(w.getComputedStyle(doc.querySelector('ytd-watch-next-secondary-results-renderer')).display,'none');
  assert.notEqual(w.getComputedStyle(doc.querySelector('ytd-live-chat-frame')).display,'none');
  await f.update({ hideLiveChat:true,hideEndScreens:true });
  assert.equal(w.getComputedStyle(doc.querySelector('ytd-live-chat-frame')).display,'none');
  assert.equal(w.getComputedStyle(doc.querySelector('.ytp-ce-element')).display,'none');
  assert.notEqual(w.getComputedStyle(video).display,'none');
  assert.notEqual(w.getComputedStyle(doc.querySelector('.ytp-chrome-bottom')).display,'none');
  doc.body.insertAdjacentHTML('beforeend','<ytd-live-chat-frame id="new-chat">Hydrated chat</ytd-live-chat-frame>');
  assert.equal(w.getComputedStyle(doc.querySelector('#new-chat')).display,'none');
  await f.update({hideRecommendations:false,hideLiveChat:false,hideEndScreens:false});
  assert.notEqual(w.getComputedStyle(doc.querySelector('#new-chat')).display,'none');
  await sleep(350);
  assert.match(doc.querySelector('[data-a=resume]').textContent,/0:40/);
  // Progress only belongs to saved videos, preserves the previous visit's offer and ignores ad times.
  playing=true;video.currentTime=50;await sleep(350);
  assert.equal(store.tp_library.videos.VIDEO_A.lastPosition,50);
  assert.match(doc.querySelector('[data-a=resume]').textContent,/0:40/);
  doc.querySelector('#movie_player').classList.add('ad-showing');video.currentTime=90;await sleep(350);
  doc.querySelector('[data-a=resume]').click();assert.equal(video.currentTime,90);
  w.dispatchEvent(new w.Event('pagehide'));assert.equal(store.tp_library.videos.VIDEO_A.lastPosition,50);
  doc.querySelector('#movie_player').classList.remove('ad-showing');playing=false;
  doc.querySelector('[data-a=resume]').click();assert.equal(video.currentTime,40);
  assert(!doc.querySelector('[data-a=resume]'));
  // Existing save/edit must retain the stored playback position.
  [...doc.querySelectorAll('#ytpc-panel button')].find(b=>b.textContent==='Save').click();
  doc.querySelector('#ytpc-f-notes').value='Edited note';doc.querySelector('#ytpc-save .ytpc-btn-ok').click();
  assert.equal(store.tp_library.videos.VIDEO_A.lastPosition,50);
  assert.equal(store.tp_library.videos.VIDEO_A.notes,'Edited note');
  const rangeButton=()=>[...doc.querySelectorAll('#ytpc-panel button')].find(b=>b.textContent.includes('🔖'));
  video.currentTime=12;rangeButton().click();
  doc.querySelector('#ytpc-bm-start').value='0:12';doc.querySelector('#ytpc-bm-end').value='0:20';
  doc.querySelector('#ytpc-loop-count').value='3';doc.querySelector('#ytpc-loop-rate').value='0.75';
  doc.querySelector('#ytpc-bm .ytpc-btn-ok').click();
  assert.equal(store.tp_bookmarks[0].repeatCount,3);assert.equal(store.tp_bookmarks[0].rate,.75);
  const openMarks=()=>{[...doc.querySelectorAll('#ytpc-panel button')].find(b=>b.textContent==='List').click();doc.querySelector('[data-tab=marks]').click()};
  video.playbackRate=1.25;openMarks();doc.querySelector('[data-act=loop]').click();
  assert.equal(video.currentTime,12);assert.equal(video.playbackRate,.75);assert(playing);
  await sleep(350);assert.equal(video.currentTime,12,'intentional loop overrides SponsorBlock auto skip');
  for(let i=0;i<2;i++){video.currentTime=20;await sleep(350);assert.equal(video.currentTime,12)}
  video.currentTime=20;await sleep(350);assert(!playing);assert.equal(video.playbackRate,1.25);assert.equal(w.__tpBm.stopAt,null);
  // Infinite loop, ad guard, explicit seeking cancellation and rate restoration.
  const infinite={...store.tp_bookmarks[0],repeatCount:0};await w.chrome.storage.local.set({tp_bookmarks:[infinite]});
  openMarks();doc.querySelector('[data-act=loop]').click();
  doc.querySelector('#movie_player').classList.add('ad-showing');video.currentTime=21;await sleep(350);assert.equal(video.currentTime,21);
  doc.querySelector('#movie_player').classList.remove('ad-showing');video.currentTime=20;await sleep(350);assert.equal(video.currentTime,12);
  video.currentTime=30;video.dispatchEvent(new w.Event('seeking'));assert.equal(w.__tpBm.stopAt,null);assert.equal(video.playbackRate,1.25);
  openMarks();doc.querySelector('[data-act=loop]').click();doc.querySelector('.ytpc-study-controls button').click();assert.equal(w.__tpBm.stopAt,null);assert.equal(video.playbackRate,1.25);
  // A loop ending at the video's natural end restarts even when the media element has paused.
  const endRange={id:'end-range',videoId:'VIDEO_A',title:'End range',start:95,end:100,repeatCount:2,rate:1};
  await w.chrome.storage.local.set({tp_bookmarks:[...store.tp_bookmarks,endRange]});
  openMarks();[...doc.querySelectorAll('.ytpc-bmrow')].find(row=>row.textContent.includes('End range')).querySelector('[data-act=loop]').click();
  video.currentTime=100;playing=false;ended=true;await sleep(350);assert.equal(video.currentTime,95);assert(playing);ended=false;
  doc.querySelector('.ytpc-study-controls button').click();assert.equal(video.playbackRate,1.25);
  // Validate media bounds, retain fractional timestamps and close the dialog using Escape.
  playing=false;video.currentTime=50;rangeButton().click();
  doc.querySelector('#ytpc-bm-start').value='99';doc.querySelector('#ytpc-bm-end').value='101';doc.querySelector('#ytpc-bm .ytpc-btn-ok').click();
  assert(doc.querySelector('#ytpc-bm-overlay'));
  doc.querySelector('#ytpc-bm-start').value='.4';doc.querySelector('#ytpc-bm-end').value='.8';doc.querySelector('#ytpc-bm .ytpc-btn-ok').click();
  assert(doc.querySelector('#ytpc-bm-overlay'),'decimal input requires leading zero');
  doc.querySelector('#ytpc-bm-start').value='0.4';doc.querySelector('#ytpc-bm-end').value='0.8';doc.querySelector('#ytpc-bm .ytpc-btn-ok').click();
  assert(store.tp_bookmarks.some(b=>b.start===.4&&b.end===.8));
  rangeButton().click();doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!doc.querySelector('#ytpc-bm-overlay'));
  // Timestamp notes validate text, use the same searchable library and have no range-end or repeat action.
  playing=false;video.currentTime=42;doc.querySelector('.ytpc-skiptoast')?.remove();
  [...doc.querySelectorAll('#ytpc-panel button')].find(b=>b.textContent==='📝 Note').click();
  doc.querySelector('#ytpc-bm .ytpc-btn-ok').click();assert(doc.querySelector('#ytpc-bm-overlay'));
  doc.querySelector('#ytpc-bm-memo').value='Key explanation';doc.querySelector('#ytpc-bm .ytpc-btn-ok').click();
  const note=store.tp_bookmarks.find(b=>b.kind==='note');assert.equal(note.start,42);assert.equal(note.end,42);
  openMarks();doc.querySelector('#ytpc-lib-q').value='Key explanation';doc.querySelector('#ytpc-lib-q').dispatchEvent(new w.Event('input'));
  assert.equal(doc.querySelectorAll('.ytpc-bmrow').length,1);assert(!doc.querySelector('[data-act=loop]'));
  video.currentTime=50;doc.querySelector('[data-act=jump]').click();assert.equal(video.currentTime,42);assert.equal(w.__tpBm.stopAt,null);
  // Existing JSON backups include notes, repetition choices, progress and focus settings.
  await f.update({hideRecommendations:true});playing=false;
  [...doc.querySelectorAll('#ytpc-panel button')].find(b=>b.textContent==='List').click();
  let backupJSON='';const NativeBlob=w.Blob;w.Blob=function(parts,options){backupJSON=parts.join('');return new NativeBlob(parts,options)};
  w.URL.createObjectURL=()=> 'blob:study-backup';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
  doc.querySelector('#ytpc-lib-export').click();const backup=JSON.parse(backupJSON);
  assert(backup.bookmarks.some(b=>b.kind==='note'));assert(backup.bookmarks.some(b=>b.rate===.75));assert(Number.isFinite(backup.library.VIDEO_A.lastPosition));assert(backup.cfg.hideRecommendations);
  await w.chrome.storage.local.set({tp_library:{videos:{}},tp_bookmarks:[]});await f.update({hideRecommendations:false});
  w.confirm=()=>true;const file=new w.File([backupJSON],'study.json',{type:'application/json'});const input=doc.querySelector('#ytpc-lib-overlay input[type=file]');
  Object.defineProperty(input,'files',{value:[file]});input.dispatchEvent(new w.Event('change'));await sleep(350);
  assert.equal(store.tp_library.videos.VIDEO_A.lastPosition,backup.library.VIDEO_A.lastPosition);assert(store.tp_bookmarks.some(b=>b.kind==='note'));assert(store.tp_cfg.hideRecommendations);
  doc.querySelector('#ytpc-lib-close').click();
  // During YouTube hydration, the previous video's media must not become the next video's progress.
  await w.chrome.storage.local.set({tp_library:{videos:{...store.tp_library.videos,VIDEO_C:{id:'VIDEO_C',title:'Saved other',duration:100,lastPosition:8}}}});
  const page=doc.createElement('ytd-watch-flexy');page.setAttribute('video-id','VIDEO_A');doc.body.appendChild(page);
  video.currentTime=70;playing=true;w.history.pushState({},'','/watch?v=VIDEO_C');await sleep(350);
  assert.equal(store.tp_library.videos.VIDEO_C.lastPosition,8);
  page.setAttribute('video-id','VIDEO_C');video.currentTime=30;await sleep(350);assert.equal(store.tp_library.videos.VIDEO_C.lastPosition,30);
  page.remove();playing=false;
  // Pending cross-video loop requests survive navigation and cancel cleanly on the next video.
  const other={id:'other',videoId:'VIDEO_B',title:'Other range',start:4,end:8,repeatCount:2,rate:.5};
  await w.chrome.storage.local.set({tp_bookmarks:[...store.tp_bookmarks,other]});
  w.sessionStorage.setItem('ytpc-playback-request',JSON.stringify({videoId:'VIDEO_B',id:'other',loop:true,expires:Date.now()+90000}));
  video.currentTime=50;w.history.pushState({},'','/watch?v=VIDEO_B');await sleep(350);
  assert.equal(video.currentTime,4);assert.equal(video.playbackRate,.5);assert(w.__tpBm.stopAt.loop);
  assert(!store.tp_library.videos.VIDEO_B,'unsaved videos do not create watch-history entries');
  w.history.pushState({},'','/watch?v=VIDEO_A');await sleep(350);assert.equal(w.__tpBm.stopAt,null);assert.equal(video.playbackRate,1.25);
  playing=false;ended=true;video.currentTime=100;await sleep(350);w.dispatchEvent(new w.Event('pagehide'));
  assert.equal(store.tp_library.videos.VIDEO_A.lastPosition,0,'completed video starts fresh on the next visit');
  const snapshot=JSON.parse(JSON.stringify(store));f.dom.window.close();
  const r=await fixture(snapshot);assert(r.store.tp_bookmarks.some(b=>b.kind==='note'));assert(!r.doc.querySelector('[data-a=resume]'));r.dom.window.close();
  console.log('PASS: independent focus settings/dynamic DOM; resume/progress/ad protection; finite/infinite loops and rate restore; timestamp notes/search; pending navigation; persistence.');
})().catch(error=>{console.error(error);process.exit(1)});
