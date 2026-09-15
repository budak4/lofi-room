import './style.css';
import { LiquidGlassEngine, LiquidButton, LiquidTabBar, LiquidMorph, Spring } from 'quick-liquid';
import { LofiAudio, TRACKS } from './audio.js';
import { Pomodoro } from './timer.js';
import { TodoStore } from './todo.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ============ QUICK-LIQUID GLASS INIT ============
const glasses = [];
$$('.glass').forEach((el) => {
  try {
    const engine = new LiquidGlassEngine(el, {
      material: 'regular',
      blur: 14,
      refractionStrength: 22,
      chromaticAberration: 0.2,
      dynamicLighting: true,
      parallax: true,
      quality: 'high',
      elevation: 2,
    });
    glasses.push({ el, engine });
  } catch (err) { el.style.background = 'rgba(28,26,64,0.72)'; glasses.push({ el, engine: null }); }
});

// Buttons get liquid press + min glass coat
const buttonEngines = [];
$$('.btn, .hud-chip, .preset-btn, .mode-btn, .dock-item').forEach((el) => {
  try {
    const lb = new LiquidButton(el);
    buttonEngines.push(lb);
  } catch {}
});

// Spotlight mouse lighting pulses on glass panels
glasses.forEach(({ el, engine }) => {
  if (!engine) return;
  const move = (e) => {
    const r = el.getBoundingClientRect();
    const lit = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
    if (lit && engine.updateConfig) {
      try { engine.updateConfig({ lightAngle: 20 }); } catch {}
    }
  };
  el.addEventListener('pointermove', move);
});

// ============ DOCK / VIEWS ============
const dock = $('#dock');
const dockItems = $$('.dock-item');
const panelEls = {};

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
  dockItems.forEach((it) => it.classList.toggle('active', it.dataset.view === view));
  const idx = dockItems.findIndex((it) => it.dataset.view === view);
  if (tabBar) tabBar.select(Math.max(0, idx));
  if (view === 'home') refreshHome();
  if (view === 'todo') renderTodos();
  if (view === 'playlist') renderTracks();
}

function applyHash() {
  const h = (location.hash || '#home').replace('#', '');
  const views = ['home', 'pomodoro', 'playlist', 'todo'];
  activate(views.includes(h) ? h : 'home');
}

dockItems.forEach((it) => {
  it.addEventListener('click', () => {
    activate(it.dataset.view);
    history.replaceState(null, '', '#' + it.dataset.view);
  });
});

window.addEventListener('hashchange', applyHash);

// ============ CLOCK / GREETING ============
function tickClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  $('#clock').textContent = `${hh}:${mm}`;
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
  $('#btnPause').textContent = '⏸';
  $('#miniToggle').textContent = audio.playing ? '⏸' : '▶';
  document.body.classList.toggle('playing', audio.playing);
  renderTracks();
}

$('#btnPlay').addEventListener('click', () => { audio.play(); syncPlayer(); });
$('#btnPause').addEventListener('click', () => { audio.pause(); syncPlayer(); });
$('#btnNext').addEventListener('click', () => { audio.next(); syncPlayer(); });
$('#btnPrev').addEventListener('click', () => { audio.prev(); syncPlayer(); });
$('#miniToggle').addEventListener('click', () => { audio.toggle(); syncPlayer(); });
$('#vol').addEventListener('input', (e) => audio.setVolume(e.target.value / 100));

const radioHotspot = $('[data-hotspot="radio"]');
radioHotspot.addEventListener('click', () => {
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
    const k = btn.dataset.hotspot;
    spawnRipple(e.clientX, e.clientY);
    pulse(btn);
    applyHotspot(k);
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
function spawnRipple(x, y) {
  const layer = (document.querySelector('.ripple-layer') || makeRippleLayer());
  const r = document.createElement('div');
  r.className = 'ripple';
  const dur = 0.8 + Math.random() * 0.3;
  r.style.left = x + 'px'; r.style.top = y + 'px';
  r.style.setProperty('--rd', dur + 's');
  layer.appendChild(r);
  setTimeout(() => r.remove(), dur * 1000 + 300);
}
function makeRippleLayer() {
  const d = document.createElement('div');
  d.className = 'ripple-layer';
  document.body.appendChild(d);
  return d;
}

// ============ LIQUID MOTION ============
const morphs = [];
function smallMorph(el) {
  try {
    const m = new LiquidMorph(el, { spring: 'bouncy' });
    morphs.push(m);
    return m;
  } catch { return null; }
}
function pulse(el) {
  el.animate([
    { transform: 'scale(1)' },
    { transform: 'scale(0.86) rotate(-6deg)' },
    { transform: 'scale(1.06)' },
    { transform: 'scale(1)' },
  ], { duration: 480, easing: 'cubic-bezier(.2,1.2,.4,1)' });
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
  // pretend focus accumulates during day
  const focusToday = Math.round((Math.min(Math.max(h, 6), 23) - 6) * 4.2);
  $('#focusToday').textContent = focusToday + 'm';
  $('#todoPending').textContent = todo.pending();
  $('#nowPlayingCard').textContent = audio.track.title;
  const mood = document.body.classList.contains('lamp-on') ? 'lampu hangat menyala' : 'bilik tenang';
  $('#moodLine').textContent = `${mood} • ${audio.playing ? 'musik sedang dipasang' : 'senyap seketika'} • masa untuk fokus.`;
}
refreshHome();

// ============ AMBIENT CHIPS ============
$('#chipWeather').addEventListener('click', cycleWeather);
$('#chipMood').addEventListener('click', () => {
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