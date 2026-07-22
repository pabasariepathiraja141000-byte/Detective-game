'use strict';

// ---------------------------------------------------------------------------
// SFX — tiny synthesized sound engine (Web Audio API, no audio files)
// Built defensively from the start: shared noise buffer (no per-call
// allocation), a hard cap on simultaneous voices, and per-sound throttling,
// so it can't spike native audio-node creation the way an earlier project's
// naive version did on iOS Safari.
// ---------------------------------------------------------------------------
const SFX = (() => {
  let actx = null;
  let master = null;
  let noiseBuffer = null;
  let activeVoices = 0;
  const MAX_VOICES = 20;
  const lastPlayedAt = {};

  function ensure() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = 0.5;
      master.connect(actx.destination);
      const len = actx.sampleRate;
      noiseBuffer = actx.createBuffer(1, len, actx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }

  function unlock() { ensure(); }

  function allow(key, minInterval) {
    if (activeVoices >= MAX_VOICES) return false;
    if (minInterval) {
      const t = actx ? actx.currentTime : 0;
      if (lastPlayedAt[key] !== undefined && t - lastPlayedAt[key] < minInterval) return false;
      lastPlayedAt[key] = t;
    }
    return true;
  }

  function track(node) {
    activeVoices++;
    node.onended = () => { activeVoices = Math.max(0, activeVoices - 1); };
  }

  function tone({ freq = 440, type = 'sine', dur = 0.15, gain = 0.3, freqEnd = null, delay = 0, attack = 0.006 }) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    track(osc);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst({ dur = 0.2, gain = 0.3, delay = 0, filterFreq = 1200, filterType = 'lowpass', filterEnd = null }) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer;
    const maxStart = Math.max(0, noiseBuffer.duration - dur - 0.02);
    const offset = Math.random() * maxStart;
    const filt = c.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.setValueAtTime(filterFreq, t0);
    if (filterEnd !== null) filt.frequency.exponentialRampToValueAtTime(Math.max(1, filterEnd), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt); filt.connect(g); g.connect(master);
    track(src);
    src.start(t0, offset, dur + 0.02);
  }

  return {
    unlock,
    click()      { if (!allow('click', 0.04)) return; tone({ freq: 320, type: 'triangle', dur: 0.06, gain: 0.12 }); },
    open()       { if (!allow('open', 0.05)) return; tone({ freq: 260, freqEnd: 420, type: 'sine', dur: 0.14, gain: 0.13 }); },
    discover()   { if (!allow('discover', 0.05)) return; tone({ freq: 520, type: 'triangle', dur: 0.1, gain: 0.15 }); tone({ freq: 780, type: 'triangle', dur: 0.14, gain: 0.14, delay: 0.09 }); },
    empty()      { if (!allow('empty', 0.05)) return; noiseBurst({ dur: 0.08, gain: 0.1, filterFreq: 500 }); },
    place()      { if (!allow('place', 0.04)) return; tone({ freq: 300, type: 'square', dur: 0.05, gain: 0.1 }); },
    correct()    { if (!allow('correct')) return; [523, 659, 784].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.28, gain: 0.16, delay: i * 0.12 })); },
    wrong()      { if (!allow('wrong')) return; tone({ freq: 220, freqEnd: 140, type: 'sawtooth', dur: 0.28, gain: 0.16 }); },
    win()        { if (!allow('win')) return; [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.32, gain: 0.17, delay: i * 0.15 })); },
    lose()       { if (!allow('lose')) return; [300, 250, 200, 150].forEach((f, i) => tone({ freq: f, type: 'sawtooth', dur: 0.36, gain: 0.15, delay: i * 0.17 })); },
    stamp()      { if (!allow('stamp')) return; noiseBurst({ dur: 0.1, gain: 0.22, filterFreq: 700 }); },
  };
})();

// ---------------------------------------------------------------------------
// DATA
// ---------------------------------------------------------------------------
const ROOMS = [
  {
    id: 'study', name: 'The Study', icon: '🖋️', sceneClass: 'scene-study',
    mapX: 50, mapY: 22,
    flavor: "Lord Blackwood's private study. His body was found slumped over this desk at eleven o'clock.",
    hotspots: [
      { id: 's-drawer', x: 22, y: 62, icon: '🗄️', label: 'Desk Drawer', evidence: 'ledger' },
      { id: 's-cabinet', x: 74, y: 55, icon: '🍾', label: 'Drink Cabinet', evidence: 'brandy' },
      { id: 's-shelf', x: 12, y: 24, icon: '📚', label: 'Bookshelf', empty: 'Rows of legal volumes. Nothing hidden here.' },
      { id: 's-fire', x: 50, y: 82, icon: '🔥', label: 'Fireplace', empty: 'Cold ashes. Someone burned paper recently, but nothing legible remains.' },
      { id: 's-window', x: 88, y: 20, icon: '🪟', label: 'Window', empty: 'Latched from the inside. No forced entry.' },
    ],
  },
  {
    id: 'library', name: 'The Library', icon: '📖', sceneClass: 'scene-library',
    mapX: 18, mapY: 22,
    flavor: 'Floor-to-ceiling shelves and the smell of old paper. Blackwood did his correspondence here.',
    hotspots: [
      { id: 'l-desk', x: 26, y: 60, icon: '✒️', label: 'Writing Desk', evidence: 'letter' },
      { id: 'l-globe', x: 68, y: 30, icon: '🌐', label: 'Globe', empty: 'A dusty globe, spun to rest on a random ocean. Nothing hidden inside.' },
      { id: 'l-chair', x: 80, y: 68, icon: '🪑', label: 'Reading Chair', empty: "A soft chair by the window, still holding a trace of lavender perfume. Eleanor's, perhaps — but perfume proves nothing." },
      { id: 'l-shelf', x: 15, y: 22, icon: '📚', label: 'Tall Shelves', empty: 'Leather-bound histories, undisturbed. If someone searched here, they left no trace.' },
    ],
  },
  {
    id: 'kitchen', name: 'The Kitchen', icon: '🍳', sceneClass: 'scene-kitchen',
    mapX: 82, mapY: 22,
    flavor: 'Copper pots hang over a cold iron stove. The staff finished cleaning up hours ago — or so they say.',
    hotspots: [
      { id: 'k-spice', x: 30, y: 40, icon: '🧂', label: 'Spice Rack', evidence: 'vial' },
      { id: 'k-stove', x: 70, y: 55, icon: '🔥', label: 'Stove', empty: 'Still faintly warm. Someone cooked recently, or perhaps just boiled water for tea.' },
      { id: 'k-sink', x: 20, y: 75, icon: '🚰', label: 'Sink', empty: 'Damp, and scrubbed cleaner than the rest of the kitchen. Odd, for this late at night.' },
      { id: 'k-larder', x: 85, y: 25, icon: '🥫', label: 'Larder', empty: 'Shelves of preserves and dry goods. Nothing out of place.' },
    ],
  },
  {
    id: 'garden', name: 'The Garden', icon: '🌷', sceneClass: 'scene-garden',
    mapX: 18, mapY: 78,
    flavor: 'A cool night air still lingers over the rose beds. A gravel path leads to the old potting shed.',
    hotspots: [
      { id: 'g-shed', x: 78, y: 58, icon: '🏚️', label: 'Potting Shed', evidence: 'footprints' },
      { id: 'g-roses', x: 24, y: 40, icon: '🌹', label: 'Rose Bushes', empty: 'A pair of garden shears rest against the trellis, clean and freshly oiled. No sign of use beyond pruning.' },
      { id: 'g-fountain', x: 50, y: 75, icon: '⛲', label: 'Fountain', empty: 'Still water, undisturbed. A few fallen leaves drift on the surface.' },
      { id: 'g-gate', x: 15, y: 70, icon: '🚪', label: 'Side Gate', empty: "The latch has been broken for months — everyone in the house knows it, and none of them mention it." },
    ],
  },
  {
    id: 'servants', name: "Servants' Hall", icon: '🧺', sceneClass: 'scene-servants',
    mapX: 82, mapY: 78,
    flavor: 'The narrow hall behind the kitchen, lined with coat pegs and the staff mail table.',
    hotspots: [
      { id: 'sv-pegs', x: 24, y: 45, icon: '🧥', label: 'Coat Pegs', evidence: 'button' },
      { id: 'sv-pantry', x: 70, y: 40, icon: '🍞', label: 'Pantry', empty: 'Neatly stocked, everything accounted for and labeled in a tidy hand.' },
      { id: 'sv-wine', x: 45, y: 70, icon: '🍷', label: 'Wine Rack', empty: 'One bottle missing from its slot — but that could mean anything, in a house this size.' },
      { id: 'sv-mail', x: 82, y: 72, icon: '✉️', label: 'Mail Table', empty: "A small stack of unopened post. One letter is addressed simply to 'J. Reyes.' It hasn't been opened yet." },
    ],
  },
];

const EVIDENCE = {
  ledger: {
    id: 'ledger', name: 'Torn Ledger Page', icon: '📒', order: 1,
    text: "Tucked in the back of the drawer: a torn ledger page, sums scratched out and rewritten, each figure smaller than the one it replaced. Someone has been quietly bleeding the estate accounts for months.",
  },
  letter: {
    id: 'letter', name: "Solicitor's Letter Draft", icon: '✉️', order: 2,
    text: "A half-finished letter in Lord Blackwood's own hand: \"I have found the discrepancy in the household accounts. I intend to call for the constable first thing tomorrow, and I will see the culprit —\" The sentence stops mid-word.",
  },
  button: {
    id: 'button', name: 'Torn Waistcoat Button', icon: '🔘', order: 3,
    text: 'Snagged on a splintered edge of the pantry doorframe: a small brass button, torn clean from a waistcoat. Whoever tore it was in a hurry to get through that door.',
  },
  vial: {
    id: 'vial', name: 'Hidden Poison Vial', icon: '🧪', order: 4,
    text: "Behind the spice jars, wedged out of easy sight: a small glass vial, empty but for a bitter-almond residue. Not something you'd keep in a kitchen — unless you didn't want it found.",
  },
  brandy: {
    id: 'brandy', name: 'Overturned Brandy Glass', icon: '🥃', order: 5,
    text: "An overturned brandy glass on the desk, a faint bitter-almond smell still on the rim. Beside it, Blackwood's own diary, the last entry unfinished: \"Nightcap tastes off tonight —\"",
  },
  footprints: {
    id: 'footprints', name: 'Muddy Footprints', icon: '👣', order: 6,
    text: 'Muddy bootprints lead from the kitchen door to the potting shed and back again. Inside, tucked beneath a flowerpot, a cork that smells faintly of almonds.',
  },
};
const EVIDENCE_IDS = Object.keys(EVIDENCE);

const SUSPECTS = [
  { id: 'eleanor', name: 'Eleanor Blackwood', blurb: 'the estranged wife' },
  { id: 'julian', name: 'Julian Reyes', blurb: 'the butler' },
  { id: 'ashcroft', name: 'Dr. Simon Ashcroft', blurb: 'the family physician' },
  { id: 'maggie', name: 'Maggie Voss', blurb: 'the niece and gardener' },
];
const WEAPONS = [
  { id: 'brandy_poison', name: 'Poisoned Brandy' },
  { id: 'opener', name: 'Letter Opener' },
  { id: 'candlestick', name: 'Candlestick' },
  { id: 'shears', name: 'Garden Shears' },
];
const MOTIVES = [
  { id: 'embezzlement', name: 'Exposed Embezzlement' },
  { id: 'inheritance', name: 'Inheritance Dispute' },
  { id: 'blackmail', name: 'Blackmail' },
  { id: 'grudge', name: 'Old Family Grudge' },
];
const SOLUTION = { suspect: 'julian', weapon: 'brandy_poison', motive: 'embezzlement' };

const TRUTH_TEXT = "Julian Reyes had spent three years quietly skimming the household accounts — small enough sums, he thought, that no one would notice. Lord Blackwood noticed. Confronted in the servants' hall that evening, Julian tore free of Blackwood's grip, losing a button in the doorframe. He knew the letter to the solicitor meant the end of everything. That night he slipped a vial of poison into Blackwood's nightly brandy, watched him drink it in the study, and disposed of the vial in the potting shed on his way back through the garden. He nearly got away with it.";

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------
const state = {
  screen: 'title',
  found: new Set(),
  examined: new Set(),
  currentRoom: null,
  corkSlots: new Array(6).fill(null),
  trayOrder: [],
  selectedTray: null,
  accusation: { suspect: null, weapon: null, motive: null },
  wrongGuesses: 0,
};

function resetState() {
  state.found = new Set();
  state.examined = new Set();
  state.currentRoom = null;
  state.corkSlots = new Array(6).fill(null);
  state.trayOrder = shuffle(EVIDENCE_IDS.slice());
  state.selectedTray = null;
  state.accusation = { suspect: null, weapon: null, motive: null };
  state.wrongGuesses = 0;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------------------
// SCREEN NAV
// ---------------------------------------------------------------------------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById('screen-' + id).classList.remove('hidden');
  state.screen = id;
}

// ---------------------------------------------------------------------------
// HUB
// ---------------------------------------------------------------------------
function renderHub() {
  const bp = document.getElementById('blueprint');
  bp.innerHTML = '';
  ROOMS.forEach(room => {
    const btn = document.createElement('button');
    btn.className = 'room-node' + (state.examined.has('visited-' + room.id) ? ' visited' : '');
    btn.style.left = room.mapX + '%';
    btn.style.top = room.mapY + '%';
    const foundHere = room.hotspots.filter(h => h.evidence && state.found.has(h.evidence)).length;
    const totalHere = room.hotspots.filter(h => h.evidence).length;
    btn.innerHTML = `
      <div class="node-box">${room.icon}${foundHere > 0 ? `<div class="node-badge">${foundHere}/${totalHere}</div>` : ''}</div>
      <div class="node-label">${room.name.toUpperCase()}</div>
    `;
    btn.onclick = () => { SFX.open(); openRoom(room.id); };
    bp.appendChild(btn);
  });
  document.getElementById('evidence-counter').textContent = `EVIDENCE ${state.found.size} / 6`;
  document.getElementById('btn-solve').classList.toggle('hidden', state.found.size < 6);
}

// ---------------------------------------------------------------------------
// ROOM VIEW
// ---------------------------------------------------------------------------
function openRoom(roomId) {
  const room = ROOMS.find(r => r.id === roomId);
  state.currentRoom = roomId;
  state.examined.add('visited-' + roomId);
  document.getElementById('room-title').textContent = room.name.toUpperCase();
  document.getElementById('room-flavor').textContent = room.flavor;
  const scene = document.getElementById('room-scene');
  scene.className = 'room-scene ' + room.sceneClass;
  scene.innerHTML = '';
  room.hotspots.forEach(h => {
    const isEvidence = !!h.evidence;
    const isFound = isEvidence && state.found.has(h.evidence);
    const isExamined = state.examined.has(h.id);
    const el = document.createElement('button');
    el.className = 'hotspot' + (isFound ? ' found' : '') + (!isEvidence && isExamined ? ' examined' : '');
    el.style.left = h.x + '%';
    el.style.top = h.y + '%';
    el.innerHTML = h.icon + (!isFound && !isExamined ? '<div class="glint"></div>' : '');
    el.onclick = () => examineHotspot(room, h);
    scene.appendChild(el);
  });
  hideToast();
  showScreen('room');
}

function examineHotspot(room, hotspot) {
  state.examined.add(hotspot.id);
  if (hotspot.evidence) {
    const wasNew = !state.found.has(hotspot.evidence);
    state.found.add(hotspot.evidence);
    const ev = EVIDENCE[hotspot.evidence];
    if (wasNew) SFX.discover(); else SFX.click();
    showToast(ev.icon, ev.name, ev.text);
  } else {
    SFX.empty();
    showToast('❔', hotspot.label, hotspot.empty);
  }
  openRoom(room.id); // re-render hotspot states (found/examined)
  showToastRaw(); // keep toast visible after re-render
}

let lastToast = null;
function showToast(icon, name, desc) {
  lastToast = { icon, name, desc };
}
function showToastRaw() {
  if (!lastToast) return;
  document.getElementById('clue-toast-icon').textContent = lastToast.icon;
  document.getElementById('clue-toast-name').textContent = lastToast.name;
  document.getElementById('clue-toast-desc').textContent = lastToast.desc;
  document.getElementById('clue-toast').classList.remove('hidden');
}
function hideToast() {
  document.getElementById('clue-toast').classList.add('hidden');
  lastToast = null;
}

// ---------------------------------------------------------------------------
// NOTEBOOK
// ---------------------------------------------------------------------------
function renderNotebook() {
  const list = document.getElementById('notebook-list');
  const foundSorted = EVIDENCE_IDS.filter(id => state.found.has(id)).sort((a, b) => EVIDENCE[a].order - EVIDENCE[b].order);
  if (foundSorted.length === 0) {
    list.innerHTML = '<div class="notebook-empty">Nothing logged yet. Search the manor for evidence.</div>';
    return;
  }
  list.innerHTML = foundSorted.map(id => {
    const ev = EVIDENCE[id];
    return `<div class="note-entry"><div class="ev-name">${ev.icon} ${ev.name}</div><div class="ev-desc">${ev.text}</div></div>`;
  }).join('');
}
function toggleNotebook(show) {
  if (show) { renderNotebook(); SFX.open(); } else { SFX.click(); }
  document.getElementById('notebook').classList.toggle('hidden', !show);
}

// ---------------------------------------------------------------------------
// CORKBOARD
// ---------------------------------------------------------------------------
function renderCorkboard() {
  const slotsEl = document.getElementById('cork-slots');
  slotsEl.innerHTML = '';
  state.corkSlots.forEach((evId, i) => {
    const slot = document.createElement('div');
    slot.className = 'cork-slot' + (evId ? ' filled' : '');
    slot.innerHTML = '<div class="pin"></div>' + (evId ? cardHtml(evId) : (i + 1));
    slot.onclick = () => onSlotClick(i);
    slotsEl.appendChild(slot);
  });
  renderTray();
  drawStrings();
}

function cardHtml(evId) {
  const ev = EVIDENCE[evId];
  return `<div class="evidence-card"><div class="ev-icon">${ev.icon}</div><div class="ev-name">${ev.name}</div></div>`;
}

function renderTray() {
  const tray = document.getElementById('cork-tray');
  tray.innerHTML = '';
  state.trayOrder.forEach(evId => {
    const placed = state.corkSlots.includes(evId);
    const card = document.createElement('div');
    card.className = 'tray-card' + (placed ? ' placed' : '') + (state.selectedTray === evId ? ' selected' : '');
    card.innerHTML = cardHtml(evId);
    card.onclick = () => onTrayClick(evId);
    tray.appendChild(card);
  });
}

function onTrayClick(evId) {
  if (state.corkSlots.includes(evId)) return;
  state.selectedTray = state.selectedTray === evId ? null : evId;
  SFX.click();
  renderTray();
}

function onSlotClick(i) {
  const current = state.corkSlots[i];
  if (state.selectedTray) {
    // if the slot already holds a card, that card returns to the tray
    state.corkSlots[i] = state.selectedTray;
    state.selectedTray = null;
    SFX.place();
  } else if (current) {
    state.corkSlots[i] = null;
    SFX.click();
  }
  document.getElementById('cork-feedback').textContent = '';
  renderCorkboard();
}

function drawStrings() {
  const svg = document.getElementById('cork-strings');
  const board = document.getElementById('corkboard');
  const rect = board.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  svg.innerHTML = '';
  const pins = document.querySelectorAll('.cork-slot .pin');
  const points = [];
  document.querySelectorAll('.cork-slot').forEach((slot, i) => {
    if (!state.corkSlots[i]) { points.push(null); return; }
    const pinEl = slot.querySelector('.pin');
    const pr = pinEl.getBoundingClientRect();
    points.push({ x: pr.left + pr.width / 2 - rect.left, y: pr.top + pr.height / 2 - rect.top });
  });
  for (let i = 0; i < points.length - 1; i++) {
    if (points[i] && points[i + 1]) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', points[i].x); line.setAttribute('y1', points[i].y);
      line.setAttribute('x2', points[i + 1].x); line.setAttribute('y2', points[i + 1].y);
      line.setAttribute('stroke', '#c1432f');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('opacity', '0.75');
      svg.appendChild(line);
    }
  }
}

function checkOrder() {
  const feedback = document.getElementById('cork-feedback');
  if (state.corkSlots.some(s => !s)) {
    feedback.textContent = "You haven't placed all six pieces of evidence yet.";
    SFX.wrong();
    return;
  }
  const correct = state.corkSlots.every((evId, i) => EVIDENCE[evId].order === i + 1);
  if (correct) {
    SFX.correct();
    feedback.style.color = '#7fbf7f';
    feedback.textContent = 'The picture is clear. Time to name the killer.';
    setTimeout(() => { renderAccusation(); showScreen('accusation'); }, 900);
  } else {
    state.wrongGuesses++;
    SFX.wrong();
    feedback.style.color = '';
    feedback.textContent = "That's not quite how it happened. Look again.";
  }
}

// ---------------------------------------------------------------------------
// ACCUSATION
// ---------------------------------------------------------------------------
function renderAccusation() {
  buildChoiceRow('choice-suspect', SUSPECTS, 'suspect');
  buildChoiceRow('choice-weapon', WEAPONS, 'weapon');
  buildChoiceRow('choice-motive', MOTIVES, 'motive');
}
function buildChoiceRow(elId, items, field) {
  const row = document.getElementById(elId);
  row.innerHTML = '';
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn' + (state.accusation[field] === item.id ? ' selected' : '');
    btn.textContent = item.name + (item.blurb ? ` — ${item.blurb}` : '');
    btn.onclick = () => {
      state.accusation[field] = item.id;
      SFX.click();
      buildChoiceRow(elId, items, field);
    };
    row.appendChild(btn);
  });
}

function submitReport() {
  const { suspect, weapon, motive } = state.accusation;
  const feedback = document.getElementById('report-feedback');
  if (!suspect || !weapon || !motive) {
    SFX.wrong();
    feedback.textContent = 'Choose a killer, a weapon, and a motive before closing the case.';
    return;
  }
  feedback.textContent = '';
  const correct = suspect === SOLUTION.suspect && weapon === SOLUTION.weapon && motive === SOLUTION.motive;
  renderEnding(correct);
  showScreen('ending');
}

// ---------------------------------------------------------------------------
// ENDING
// ---------------------------------------------------------------------------
function renderEnding(correct) {
  const stamp = document.getElementById('ending-stamp');
  const title = document.getElementById('ending-title');
  const text = document.getElementById('ending-text');
  const stats = document.getElementById('ending-stats');
  if (correct) {
    SFX.win();
    stamp.textContent = 'CASE CLOSED';
    stamp.className = 'stamp win';
    title.textContent = 'CASE CLOSED';
    text.textContent = TRUTH_TEXT + ' Julian Reyes is taken into custody before dawn.';
  } else {
    SFX.lose();
    stamp.textContent = 'CASE UNSOLVED';
    stamp.className = 'stamp lose';
    title.textContent = 'THE WRONG MAN';
    text.textContent = 'Your report names the wrong suspect. The file is marked unsolved, and the real killer sleeps soundly tonight. Here is what actually happened: ' + TRUTH_TEXT;
  }
  stats.textContent = `Evidence recovered: ${state.found.size} / 6   ·   Incorrect timelines attempted: ${state.wrongGuesses}`;
}

// ---------------------------------------------------------------------------
// WIRING
// ---------------------------------------------------------------------------
document.getElementById('btn-begin').onclick = () => {
  SFX.unlock();
  resetState();
  renderHub();
  showScreen('hub');
};

document.getElementById('btn-room-back').onclick = () => { SFX.click(); hideToast(); renderHub(); showScreen('hub'); };
document.getElementById('clue-toast-close').onclick = () => { SFX.click(); hideToast(); };

document.getElementById('btn-notebook').onclick = () => toggleNotebook(true);
document.getElementById('btn-notebook-2').onclick = () => toggleNotebook(true);
document.getElementById('btn-notebook-close').onclick = () => toggleNotebook(false);

document.getElementById('btn-solve').onclick = () => { SFX.open(); renderCorkboard(); showScreen('corkboard'); };
document.getElementById('btn-cork-back').onclick = () => { SFX.click(); renderHub(); showScreen('hub'); };
document.getElementById('btn-check-order').onclick = () => { SFX.stamp(); checkOrder(); };

document.getElementById('btn-submit-report').onclick = () => { SFX.stamp(); submitReport(); };

document.getElementById('btn-again').onclick = () => { SFX.click(); showScreen('title'); };

window.addEventListener('touchstart', () => SFX.unlock(), { once: true, passive: true });
window.addEventListener('resize', () => { if (state.screen === 'corkboard') drawStrings(); });
