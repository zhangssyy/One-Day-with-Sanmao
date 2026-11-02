'use strict';
const experience = window.MUSEUM_EXPERIENCES;
const JOURNEY_KEY = 'sanmao-museum-journey-v2';
const journey = { mode: 'guided', step: 0, seen: new Set(), solved: new Set(), stamps: new Set(), visited: new Set() };
try {
  const saved = JSON.parse(localStorage.getItem(JOURNEY_KEY) || 'null');
  if (saved) {
    if (Number.isInteger(saved.step) && saved.step >= 0 && saved.step < experience.route.length) journey.step = saved.step;
    for (const key of ['seen', 'solved', 'stamps', 'visited']) if (Array.isArray(saved[key])) journey[key] = new Set(saved[key].filter(x => typeof x === 'string'));
  }
} catch (_) { /* The tour also works when local storage is unavailable. */ }
let activeObservation = null;
let navigationAction = 0;
function saveJourney() {
  try { localStorage.setItem(JOURNEY_KEY, JSON.stringify({ step: journey.step, seen: [...journey.seen], solved: [...journey.solved], stamps: [...journey.stamps], visited: [...journey.visited] })); } catch (_) {}
}
function currentChapter() { return experience.chapters[experience.route[journey.step].chapter]; }
function observationById(id) { return experience.observations.find(x => x.id === id); }
function anchorFor(id) { return anchors.find(a => a.ids.includes(id)); }
function roomEntries(id) {
  return [...anchors.filter(a => a.scene === id).map(a => ({ type: a.kind === 'painting' ? 'art' : 'album', id: a.kind === 'painting' ? a.ids[0] : a.key, title: a.title, scene: a.scene, ath: a.ath, atv: a.atv, image: works.find(w => w.id === a.ids[0]).image })),
    ...experience.observations.filter(o => o.scene === id).map(o => ({ ...o, type: 'observation' }))];
}
function guideEntry(goal) {
  if (goal.type === 'observation') return { ...observationById(goal.id), type: 'observation' };
  const a = goal.type === 'album' ? anchors.find(x => x.key === goal.id) : anchorFor(goal.id);
  return { ...a, type: goal.type, id: goal.id };
}
function recordDiscovery(type, id) {
  if (type === 'art') journey.seen.add(id);
  if (type === 'observation') journey.solved.add(id);
  for (const chapter of experience.chapters) {
    const goal = chapter.goal;
    const match = goal.type === type && goal.id === id || goal.type === 'album' && type === 'art' && experience.albums.find(a => a.id === goal.id).ids.includes(id);
    if (match && !journey.stamps.has(chapter.id)) {
      journey.stamps.add(chapter.id);
      toast('发现了「' + chapter.title + '」的小故事 ✦');
    }
  }
  saveJourney();
  renderJourneyUI();
}
function renderJourneyUI() {
  const guided = journey.mode === 'guided';
  const recommended = experience.route[journey.step + 1];
  document.querySelectorAll('.nav-hotspot').forEach(b => b.classList.toggle('recommended', guided && !!recommended && b.dataset.scene === recommended.scene));
  $('#route-list').hidden = !guided;
  $('#guide-card').hidden = !guided;
  $('#room-list').hidden = guided;
  document.querySelectorAll('[data-mode]').forEach(b => { const active = b.dataset.mode === journey.mode; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  const chapterIndex = experience.route[journey.step].chapter;
  $('#route-list').replaceChildren();
  experience.chapters.forEach((chapter, i) => {
    const b = document.createElement('button');
    b.className = 'chapter-button' + (chapterIndex === i ? ' active' : '') + (journey.stamps.has(chapter.id) ? ' discovered' : '');
    b.dataset.chapter = chapter.id;
    b.setAttribute('aria-label', '第' + (i + 1) + '章：' + chapter.title);
    if (chapterIndex === i) b.setAttribute('aria-current', 'step');
    b.innerHTML = `<span class="chapter-number">${journey.stamps.has(chapter.id) ? '✓' : String(i + 1).padStart(2, '0')}</span><span class="chapter-copy"><strong>${chapter.title}</strong><small>${chapter.subtitle}</small></span>`;
    b.onclick = () => goStep(chapter.start);
    $('#route-list').append(b);
  });
  // 小屏上章节条是横向的，当前章可能排在可视范围外
  const currentChip = $('#route-list').querySelector('.chapter-button.active');
  if (currentChip) $('#route-list').scrollTo({ left: currentChip.offsetLeft - ($('#route-list').clientWidth - currentChip.offsetWidth) / 2 });
  const chapter = currentChapter();
  $('#guide-task').innerHTML = `<span>${journey.stamps.has(chapter.id) ? '✓' : '✦'}</span><span>${chapter.task}</span><span>↗</span>`;
  $('#journey-count').innerHTML = `${journey.stamps.size} / 6<span class="count-unit"> 个小发现</span>`;
  $('#guide-card-label').textContent = journey.stamps.has(chapter.id) ? '这一站的小发现，收好啦' : '这一站，找点什么？';
  $('#previous-room').disabled = !guided || journey.step === 0;
  $('#previous-room').setAttribute('aria-label', '回看上一处');
  if (guided) {
    $('#scene-position').textContent = String(chapterIndex + 1).padStart(2, '0') + ' / 06';
    $('#scene-description').textContent = experience.route[journey.step].hint;
    const next = experience.route[journey.step + 1];
    $('#next-room').innerHTML = next ? `去${roomInfo[next.scene].name}<span>→</span>` : '收好今天的发现<span>✦</span>';
    $('#next-room').setAttribute('aria-label', next ? '沿路线前往' + roomInfo[next.scene].name : '完成路线，查看今天的发现');
    $('#next-room').dataset.routeStep = journey.step;
  } else {
    $('#scene-position').textContent = '自由漫游';
    $('#scene-description').textContent = roomInfo[scene.id].note;
    $('#next-room').innerHTML = '继续路线<span>→</span>';
    $('#next-room').setAttribute('aria-label', '继续参观路线');
  }
  const entries = roomEntries(scene.id);
  $('#room-art-count').textContent = entries.length;
  $('#room-artworks').hidden = !entries.length;
  document.querySelectorAll('.observation-hotspot').forEach(b => { const solved = journey.solved.has(b.dataset.observation); b.classList.toggle('solved', solved); b.querySelector('.spot-symbol').textContent = solved ? '✓' : '?'; });
}
async function goStep(index) {
  if (index < 0 || index >= experience.route.length) return;
  const requestId = ++navigationAction;
  journey.mode = 'guided'; journey.step = index;
  const step = experience.route[index];
  const upcoming = experience.route[index + 1];
  let view;
  if (['scene_6', 'scene_13'].includes(step.scene) && upcoming) {
    const h = scenes.find(s => s.id === step.scene).hotspots.find(h => h.linkedscene === upcoming.scene);
    if (h) view = { ath: Number(h.ath), atv: Math.min(Number(h.atv), 12) };
  }
  if (index === experience.route.length - 1) view = { ath: -8, atv: 6 };
  await loadScene(scenes.find(s => s.id === step.scene), view);
  return requestId === navigationAction && journey.mode === 'guided' && viewer.dataset.state === 'ready';
}
function nextJourneyStep() {
  if (journey.mode !== 'guided') return goStep(journey.step);
  if (journey.step < experience.route.length - 1) goStep(journey.step + 1);
  else openSouvenir();
}
function navigateRoom(id) {
  const next = experience.route[journey.step + 1];
  if (journey.mode === 'guided' && next && id === next.scene) return goStep(journey.step + 1);
  navigationAction++;
  journey.mode = 'free';
  return loadScene(scenes.find(s => s.id === id));
}
async function focusEntry(entry, open = true) {
  if (!entry) return;
  const requestId = ++navigationAction;
  if (entry.scene !== scene.id) journey.mode = 'free';
  if (activeTab !== 'tour') { location.hash = 'tour'; showTab('tour'); }
  if (entry.scene !== scene.id) await loadScene(scenes.find(s => s.id === entry.scene), entry);
  else { stopRotation(); yaw = radians(entry.ath); pitch = radians(entry.atv); fov = 62; zoom(0); }
  if (requestId !== navigationAction) return;
  renderJourneyUI();
  if (!open || viewer.dataset.state !== 'ready') return;
  if (entry.type === 'observation') openObservation(entry.id);
  else { const a = entry.type === 'album' ? anchors.find(x => x.key === entry.id) : anchorFor(entry.id); openArt(entry.type === 'art' ? entry.id : a.ids[0], a.ids); }
}
function renderObservationHotspots() {
  for (const o of experience.observations.filter(o => o.scene === scene.id)) {
    const b = document.createElement('button');
    b.className = 'hotspot observation-hotspot' + (journey.solved.has(o.id) ? ' solved' : '');
    b.dataset.observation = o.id; b.setAttribute('aria-label', '观察：' + o.title);
    b.innerHTML = `<span class="spot-symbol">${journey.solved.has(o.id) ? '✓' : '?'}</span><span class="hotspot-label">${o.title}</span>`;
    b.onclick = () => openObservation(o.id); b.hidden = true;
    $('#hotspots').append(b);
    if (webglReady) activeHotspots.push({ button: b, point: pointAt(o.ath, o.atv) });
  }
  if (journey.mode === 'guided') {
    const next = experience.route[journey.step + 1];
    if (next) document.querySelectorAll('.nav-hotspot').forEach(b => b.classList.toggle('recommended', b.dataset.scene === next.scene));
  }
}
function openObservation(id) {
  const o = observationById(id); if (!o) return;
  activeObservation = o; stopRotation();
  $('#observation-dialog').dataset.observation = id;
  $('#observation-title').textContent = o.title;
  $('#observation-image').src = o.image; $('#observation-image').alt = o.title + '的实景细节';
  $('#observation-question').textContent = o.question;
  $('#observation-options').replaceChildren();
  $('#observation-feedback').textContent = '';
  $('#observation-feedback').className = 'observation-feedback';
  o.options.forEach((option, i) => {
    const b = document.createElement('button'); b.dataset.answer = i; b.textContent = option;
    b.onclick = () => answerObservation(i);
    $('#observation-options').append(b);
  });
  if (journey.solved.has(id)) showObservationAnswer();
  if (!$('#observation-dialog').open) $('#observation-dialog').showModal();
}
function showObservationAnswer() {
  const o = activeObservation;
  $('#observation-feedback').textContent = '找到了！' + o.explanation;
  $('#observation-feedback').className = 'observation-feedback correct';
  document.querySelectorAll('#observation-options button').forEach((b, i) => { b.disabled = true; b.classList.toggle('correct', i === o.answer); });
}
function answerObservation(index) {
  if (index !== activeObservation.answer) {
    $('#observation-feedback').textContent = '再仔细看看，试试另一个。';
    $('#observation-feedback').className = 'observation-feedback';
    return;
  }
  showObservationAnswer(); recordDiscovery('observation', activeObservation.id);
}
function openRoomDiscoveries() {
  $('#room-dialog-title').textContent = roomInfo[scene.id].name + '的小发现';
  $('#room-discovery-list').replaceChildren();
  roomEntries(scene.id).forEach(entry => {
    const b = document.createElement('button'); b.className = 'discovery-item';
    b.innerHTML = `<img src="${entry.image}" alt=""><span>${entry.title}<small>${entry.type === 'observation' ? '找找看' : entry.type === 'album' ? '一起读漫画' : '走近这幅画'}</small></span><span>↗</span>`;
    b.onclick = () => { $('#room-dialog').close(); focusEntry(entry); };
    $('#room-discovery-list').append(b);
  });
  stopRotation(); $('#room-dialog').showModal();
}
function openSouvenir() {
  $('#souvenir-count').textContent = `看过 ${journey.seen.size} 件作品，找到 ${journey.solved.size} 处小细节。`;
  $('#souvenir-stamps').replaceChildren();
  experience.chapters.forEach((c, i) => { const stamp = document.createElement('div'); stamp.className = 'souvenir-stamp' + (journey.stamps.has(c.id) ? ' earned' : ''); stamp.innerHTML = `<span>${journey.stamps.has(c.id) ? '✦' : String(i + 1).padStart(2, '0')}</span><strong>${c.title}</strong>`; $('#souvenir-stamps').append(stamp); });
  stopRotation(); $('#souvenir-dialog').showModal();
}
function initJourney() {
  document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { if (b.dataset.mode === 'guided') goStep(journey.step); else { navigationAction++; journey.mode = 'free'; renderJourneyUI(); } });
  $('#guide-task').onclick = async () => {
    const entry = guideEntry(currentChapter().goal);
    if (entry.scene !== scene.id) {
      const matches = experience.route.map((s, i) => ({ ...s, i })).filter(s => s.scene === entry.scene && s.chapter === experience.route[journey.step].chapter);
      if (matches.length && !await goStep(matches[0].i)) return;
    }
    focusEntry(entry);
  };
  $('#look-again').onclick = () => { $('#observation-dialog').close(); focusEntry({ ...activeObservation, type: 'observation' }, false); };
  $('#observation-done').onclick = () => $('#observation-dialog').close();
  $('#souvenir-free').onclick = () => { $('#souvenir-dialog').close(); navigationAction++; journey.mode = 'free'; renderJourneyUI(); };
  $('#souvenir-restart').onclick = () => { $('#souvenir-dialog').close(); goStep(0); };
  $('#journey-count').onclick = openSouvenir;
}
