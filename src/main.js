import './style.css';
import { LiquidTabBar, LiquidMorph } from 'quick-liquid';
import { tagCapabilities, REDUCED_MOTION, IS_TOUCH } from './env.js';
import { GlassManager, liquidButtons } from './glass.js';
import { assistant } from './assistant.js';
import { LofiAudio, TRACKS } from './audio.js';
import { Pomodoro } from './timer.js';
import { TodoStore } from './todo.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ============ ENV / CAPABILITIES ============
tagCapabilities();

const haptic = (p = 15) => { try { navigator.vibrate?.(p); } catch {} };

// ============ HOTSPOT ANCHOR ALIGNMENT ============
// Hotspots are anchored to invisible SVG markers (same transform as the room),
// so they sit exactly on the object for every viewport/aspect-ratio.
function alignHotspots() {
  document.documentElement.classList.add('hotspots-js');
  const vw = window.innerWidth; const vh = window.innerHeight;
  $$('.hotspot[data-hotspot]').forEach((btn) => {
    const marker = document.getElementById('mk-' + btn.dataset.hotspot);
    if (!marker) return;
    const r = marker.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    if (cx < -60 || cy < -60 || cx > vw + 60 || cy > vh + 60) {
      btn.style.opacity = '0';
      btn.style.pointerEvents = 'none';
      return;
    }
    btn.style.opacity = '1';
    btn.style.pointerEvents = '';
    btn.style.left = Math.round(cx - btn.offsetWidth / 2) + 'px';
    btn.style.top = Math.round(cy - btn.offsetHeight / 2) + 'px';
  });
}
let alignT = null;
function alignDebounced() { clearTimeout(alignT); alignT = setTimeout(alignHotspots, 120); }
window.addEventListener('resize', alignDebounced);
window.addEventListener('orientationchange', alignDebounced);
try { document.fonts?.ready?.then(alignDebounced); } catch {}

// ============ QUICK-LIQUID GLASS (lazy + device-tuned) ============
const glass = new GlassManager();
glass.mountPersistent('.topbar, .dock, .minimini');
liquidButtons('.btn, .hud-chip, .preset-btn, .mode-btn, .dock-item, .hotspot');

// ============ DOCK / VIEWS ============
const dock = $('#dock');
const dockItems = $$('.dock-item');
let activeView = 'home';
let tabBar = null;
try {
  tabBar = new LiquidTabBar(dock, dockItems, { spring: 'snappy' });
  const ind = tabBar.getIndicator();
  ind.style.background = 'linear-gradient(180deg, rgba(169,139,255,.4), rgba(122,92,255,.22))';
  ind.style.borderRadius = '22px';
  ind.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,.25), 0 4px 16px rgba(122,92,255,.35)';
  ind.style.backdropFilter = 'blur(10px)';
  ind.style.webkitBackdropFilter = 'blur(10px)';
} catch {}

function activate(view) {
  activeView = view;
  $$('.panel').forEach((p) => p.classList.remove('active'));
  const target = $(`.panel[data-panel="${view}"]`);
  if (target) target.classList.add('active');
  // only the visible panel carries a live glass engine
  glass.setActivePanel(target);
  dockItems.forEach((it) => it.classList.toggle('active', it.dataset.view === view));
  const idx = dockItems.findIndex((it) => it.dataset.view === view);
  if (tabBar) tabBar.select(Math.max(0, idx));
  if (view === 'home') refreshHome();
  if (view === 'todo') renderTodos();
  if (view === 'playlist') renderTracks();
}

function applyHash() {
  const h = (location.hash || '#home').replace('#', '');
  const views = ['home', 'pomodoro', 'playlist', 'ai', 'todo'];
  activate(views.includes(h) ? h : 'home');
}

dockItems.forEach((it) => {
  it.addEventListener('click', () => {
    haptic();
    activate(it.dataset.view);
    history.replaceState(null, '', '#' + it.dataset.view);
  });
});

window.addEventListener('hashchange', applyHash);

// ============ CLOCK / GREETING ============
let lastClockText = '';
function tickClock() {
  if (document.hidden) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const clockText = `${hh}:${mm}`;
  if (clockText === lastClockText) return;
  lastClockText = clockText;
  $('#clock').textContent = clockText;
  const days = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'];
  const months = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  $('#date').textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
  const h = now.getHours();
  const greet = h < 5 ? 'malam yang sunyi' : h < 12 ? 'pagi yang tenang' : h < 18 ? 'petang santai' : 'malam yang tenang';
  $('#greeting').textContent = `${greet}, amir`;
}
tickClock();
setInterval(tickClock, 1000);

// ============ AUDIO / PLAYER ============
const audio = new LofiAudio();

function renderTracks() {
  const list = $('#trackList');
  list.innerHTML = '';
  TRACKS.forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'track' + (i === audio.trackIndex ? ' active' : '');
    row.innerHTML = `
      <span class="t-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="t-meta"><strong>${t.title}</strong><span>${t.artist}</span></span>
      <span class="t-dur">${Math.round(t.bpm)}bpm</span>
      <span class="t-play">▶</span>`;
    row.addEventListener('click', () => { audio.setTrack(i); renderTracks(); syncPlayer(); });
    list.appendChild(row);
  });
}

function syncPlayer() {
  const t = audio.track;
  $('#trackTitle').textContent = t.title;
  $('#trackArtist').textContent = t.artist;
  $('#miniTitle').textContent = t.title;
  $('#miniArtist').textContent = t.artist;
  $('#nowPlayingCard').textContent = t.title;
  $('#btnPlay').textContent = audio.playing ? '⏸' : '▶';
  $('#miniToggle').textContent = audio.playing ? '⏸' : '▶';
  document.body.classList.toggle('playing', audio.playing);
  renderTracks();
}

$('#btnPlay').addEventListener('click', () => { haptic(); audio.play(); syncPlayer(); });
$('#btnNext').addEventListener('click', () => { audio.next(); syncPlayer(); });
$('#btnPrev').addEventListener('click', () => { audio.prev(); syncPlayer(); });
$('#miniToggle').addEventListener('click', () => { audio.toggle(); syncPlayer(); });
$('#vol').addEventListener('input', (e) => audio.setVolume(e.target.value / 100));

$('#radioHotspot').addEventListener('click', () => {
  haptic();
  audio.toggle();
  syncPlayer();
  activate('playlist');
  history.replaceState(null, '', '#playlist');
});

// ============ POMODORO ============
const timerR = 96 * 2 * Math.PI;
const timer = new Pomodoro({
  onChange: (s) => {
    const mm = String(Math.floor(s.remaining / 60)).padStart(2, '0');
    const ss = String(s.remaining % 60).padStart(2, '0');
    $('#timerDisplay').textContent = `${mm}:${ss}`;
    $('#timerState').textContent = s.running
      ? (s.mode === 'focus' ? 'Fokus — jaga ritma' : 'Rehat — tarik nafas')
      : (s.mode === 'focus' ? 'Bersedia untuk fokus' : 'Press mula untuk berehat');
    $('#ringFg').style.strokeDashoffset = timerR * (1 - s.progress);
    $('#sessions').textContent = s.sessions > 0 ? '🍅'.repeat(Math.min(s.sessions, 20)) : '';
  },
});
timer.onOnly = (ev) => { toast(ev.includes('break') ? 'Sesi selesai — ambil rehat 5 minit' : 'Rehat tamat — kembali fokus'); };
timer.autoResume(() => true);

$('#btnStart').addEventListener('click', () => {
  haptic();
  timer.toggle();
  $('#btnStart').textContent = timer.running ? '⏸ Jeda' : '▶ Mula';
});
$('#btnReset').addEventListener('click', () => { timer.reset(); $('#btnStart').textContent = '▶ Mula'; });
$('#btnSkip').addEventListener('click', () => { timer.skip(); $('#btnStart').textContent = '▶ Mula'; });
$$('.preset-btn').forEach((b) => b.addEventListener('click', () => {
  $('.preset-btn.active')?.classList.remove('active');
  b.classList.add('active');
  timer.setDuration(Number(b.dataset.min));
}));
timer._emit();

// ============ TODO ============
const todo = new TodoStore();

function renderTodos() {
  const list = $('#todoList');
  list.innerHTML = '';
  const items = todo.all();
  if (!items.length) {
    list.innerHTML = '<div class="todo-empty">Tiada tugasan — tambah yang pertama.</div>';
  }
  items.forEach((it) => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (it.done ? ' done' : '');
    li.innerHTML = `
      <input type="checkbox" ${it.done ? 'checked' : ''} />
      <span class="t-label">${it.text}</span>
      <button class="t-del" aria-label="Padam">✕</button>`;
    const cb = li.querySelector('input'); const del = li.querySelector('.t-del');
    cb.addEventListener('change', () => { todo.toggle(it.id); renderTodos(); refreshHome(); });
    del.addEventListener('click', () => { todo.remove(it.id); renderTodos(); refreshHome(); });
    list.appendChild(li);
  });
  const pending = todo.pending(); const total = items.length;
  $('#todoCount').textContent = `${total - pending}/${total}`;
  $('#todoBar').style.width = total ? (((total - pending) / total) * 100) + '%' : '0%';
}

$('#todoForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const val = $('#todoInput').value.trim();
  if (!val) return;
  todo.add(val);
  $('#todoInput').value = '';
  renderTodos();
  refreshHome();
});

// ============ AI ASSISTANT ============
const aiLog = $('#aiLog');
const aiInput = $('#aiInput');

function aiAppend(role, html) {
  const m = document.createElement('div');
  m.className = 'ai-msg ' + (role === 'user' ? 'ai-user' : 'ai-bot');
  m.innerHTML = `<span class="ai-ava">${role === 'user' ? '😊' : '🤖'}</span><div class="ai-bubble">${html}</div>`;
  aiLog.appendChild(m);
  aiLog.scrollTop = aiLog.scrollHeight;
  return m;
}
function aiSay(role, text) {
  aiAppend(role, text.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])));
}

function buildAiCtx() {
  const items = todo.all();
  return {
    lampOn: document.body.classList.contains('lamp-on'),
    weather: [...document.body.classList].find((c) => c.startsWith('weather')) || 'clear',
    playing: audio.playing,
    trackTitle: audio.track.title,
    todoCount: items.length,
    todoDone: items.filter((i) => i.done).length,
  };
}

function runAiActions(actions = []) {
  actions.forEach((a) => {
    switch (a.type) {
      case 'view': activate(a.value); history.replaceState(null, '', '#' + a.value); break;
      case 'lamp:on': if (!document.body.classList.contains('lamp-on')) { document.body.classList.add('lamp-on'); toast('lampu hangat dinyalakan'); } break;
      case 'lamp:off': if (document.body.classList.contains('lamp-on')) { document.body.classList.remove('lamp-on'); toast('lampu dipadamkan'); } break;
      case 'weather': toggleWeather(a.value); break;
      case 'audio:play': if (!audio.playing) { audio.play(); syncPlayer(); } break;
      case 'audio:pause': if (audio.playing) { audio.pause(); syncPlayer(); } break;
      case 'timer:set':
        timer.setDuration(Number(a.value));
        $$('.preset-btn').forEach((b) => b.classList.toggle('active', Number(b.dataset.min) === Number(a.value)));
        $('#btnStart').textContent = '▶ Mula';
        break;
      case 'timer:toggle': timer.toggle(); $('#btnStart').textContent = timer.running ? '⏸ Jeda' : '▶ Mula'; break;
      case 'timer:pause': timer.pause(); $('#btnStart').textContent = '▶ Mula'; break;
      case 'timer:start': timer.start(); $('#btnStart').textContent = '⏸ Jeda'; break;
    }
  });
}

function aiSend() {
  const val = aiInput.value.trim();
  if (!val) return;
  aiSay('user', val);
  aiInput.value = '';
  const typing = aiAppend('bot', '<div class="ai-dot"><i></i><i></i><i></i></div>');
  setTimeout(() => {
    const res = assistant(val, buildAiCtx());
    typing.remove();
    aiAppend('bot', res.text.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])));
    runAiActions(res.actions);
  }, 420 + Math.random() * 380);
}

$('#aiForm').addEventListener('submit', (e) => { e.preventDefault(); aiSend(); });
$('#aiChips').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-prompt]');
  if (!b) return;
  aiInput.value = b.dataset.prompt;
  aiSend();
});

// ============ HOTSPOTS / ROOM ============
const hotspotSpecs = [
  { id: 'lamp', msg: 'lampu katil dinyalakan', on: true },
  { id: 'plant', msg: 'pokok menghayun dengan riak' },
  { id: 'moon', msg: 'bintang bersinar gerimis' },
  { id: 'cat', msg: 'kucing mengiau… meow' },
];

$$('.hotspot').forEach((btn) => {
  smallMorph(btn);
  btn.addEventListener('click', (e) => {
    haptic();
    spawnRipple(e.clientX, e.clientY);
    pulse(btn);
    applyHotspot(btn.dataset.hotspot);
  });
});

function applyHotspot(k) {
  const spec = hotspotSpecs.find((s) => s.id === k);
  if (k === 'lamp') {
    document.body.classList.toggle('lamp-on');
    toast(document.body.classList.contains('lamp-on') ? 'lampu katil dinyalakan • mood hangat' : 'lampu padam • kembali tenang');
  } else if (k === 'moon') {
    cycleWeather();
  } else if (k === 'plant') {
    toast('pokok menghayun • riak kaca tersebar');
  } else if (k === 'cat') {
    toast('miau 🐱 — kucing duduk sebelah laptop');
  }
}

const WEATHERS = ['clear', 'rain'];
let weatherIdx = 0;
function cycleWeather() {
  weatherIdx = (weatherIdx + 1) % WEATHERS.length;
  toggleWeather(WEATHERS[weatherIdx]);
}
function toggleWeather(w) {
  document.body.classList.remove('weather-clear', 'weather-rain');
  document.body.classList.add('weather-' + w);
  toast(w === 'rain' ? 'hujan mula turun di luar tingkap' : 'langit cerah, bintang kelihatan');
}

// ============ RIPPLES ============
function makeRippleLayer() {
  const d = document.createElement('div');
  d.className = 'ripple-layer';
  document.body.appendChild(d);
  return d;
}
function spawnRipple(x, y) {
  if (REDUCED_MOTION) return;
  const layer = (document.querySelector('.ripple-layer') || makeRippleLayer());
  const r = document.createElement('div');
  r.className = 'ripple';
  const dur = 0.8 + Math.random() * 0.3;
  r.style.left = x + 'px'; r.style.top = y + 'px';
  r.style.setProperty('--rd', dur + 's');
  layer.appendChild(r);
  setTimeout(() => r.remove(), dur * 1000 + 300);
}

// ============ LIQUID MOTION ============
const morphs = [];
function smallMorph(el) {
  if (REDUCED_MOTION) return null;
  try {
    const m = new LiquidMorph(el, { spring: 'bouncy' });
    morphs.push(m);
    return m;
  } catch { return null; }
}
function pulse(el) {
  if (REDUCED_MOTION) return;
  try {
    el.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(0.86) rotate(-6deg)' },
      { transform: 'scale(1.06)' },
      { transform: 'scale(1)' },
    ], { duration: 480, easing: 'cubic-bezier(.2,1.2,.4,1)' });
  } catch {}
  const m = morphs.find((mm) => mm.el === el);
  if (m) m.jiggle?.(0.25);
}

// ============ HOME CARDS ============
const quotes = [
  '“little by little, one travels far.”',
  '“you don’t have to see the whole staircase, just the first step.”',
  '“focus is the new luxury.”',
  '“the room glows; so does your progress.”',
  '“soft music, warm light, steady mind.”',
];
function pickQuote() {
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  $('#quote').textContent = q;
}
function refreshHome() {
  const now = new Date();
  const h = now.getHours();
  const focusToday = Math.round((Math.min(Math.max(h, 6), 23) - 6) * 4.2);
  $('#focusToday').textContent = focusToday + 'm';
  $('#todoPending').textContent = todo.pending();
  $('#nowPlayingCard').textContent = audio.track.title;
  const mood = document.body.classList.contains('lamp-on') ? 'lampu hangat menyala' : 'bilik tenang';
  $('#moodLine').textContent = `${mood} • ${audio.playing ? 'musik sedang dipasang' : 'senyap seketika'} • masa untuk fokus.`;
  // smart suggestion (on-device AI hint)
  const items = todo.all();
  let hint;
  if (items.length === 0) hint = 'belum ada tugasan — taip yang pertama di To-Do, atau tanya pembantu AI untuk turunkan hujan';
  else if (items.filter((i) => i.done).length === items.length) hint = 'semua tugasan siap! masa untuk rehat panjang 🏆';
  else hint = `cuba fokus 25 minit pada "«${items[0].text}»" — tanya pembantu: "fokus 25 minit"`;
  $('#aiHint').textContent = '💡 saran AI: ' + hint;
}
refreshHome();

// ============ AMBIENT CHIPS ============
$('#chipWeather').addEventListener('click', cycleWeather);
$('#chipMood').addEventListener('click', () => {
  haptic();
  document.body.classList.toggle('lamp-on');
  toast(document.body.classList.contains('lamp-on') ? 'warna hangat diaktifkan' : 'warna sejuk kembali');
});

// ============ TOAST ============
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ============ BOOT ============
pickQuote();
renderTracks();
syncPlayer();
applyHash();
timer._emit();
aiAppend('bot', 'Hai amir! Aku pembantu kecil kamu di bilik ini. 🤖 Cuba: <em>"fokus 50 minit"</em>, <em>"mainkan muzik"</em>, <em>"hidupkan lampu"</em>, atau <em>"quote motivasi"</em>.');
alignHotspots();