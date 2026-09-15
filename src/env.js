// env.js — environment detection, polyfills and device quality tier.

const ua = navigator.userAgent || '';
export const IS_ANDROID = /Android/i.test(ua);
export const IS_IOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);

export const hasFinePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
export const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const REDUCED_TRANSPARENCY = window.matchMedia && window.matchMedia('(prefers-reduced-transparency: reduce)').matches;

function hasBackdropFilter() {
  const pre = 'backdropFilter' in document.body.style;
  const webkit = 'webkitBackdropFilter' in document.body.style;
  return pre || webkit;
}
export const HAS_BACKDROP = hasBackdropFilter();

export const DEVICE_TIER = (() => {
  if (IS_TOUCH) {
    // roughly TDP based; use simple heuristic
    return hasFinePointer ? 'mid' : IS_IOS ? 'mid' : 'low';
  }
  return 'high';
})();

export const GLASS_QUALITY = DEVICE_TIER === 'high' ? 'high' : DEVICE_TIER === 'mid' ? 'medium' : 'low';

// Expose to <html class> for CSS hooks
export function tagCapabilities() {
  const html = document.documentElement;
  html.classList.remove('no-js');
  if (IS_TOUCH) html.classList.add('touch');
  if (!hasFinePointer) html.classList.add('coarse');
  if (!HAS_BACKDROP) html.classList.add('no-backdrop');
  if (REDUCED_MOTION) html.classList.add('reduced-motion');
  if (REDUCED_TRANSPARENCY) html.classList.add('reduced-transparency');
  if (IS_ANDROID) html.classList.add('android');
  uploadSafeHeight();
}

// Virual viewport height (fixes iOS Safari 100vh + mobile URL bar shifts)
export function uploadSafeHeight() {
  const setH = () => {
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--vh', (vh * 0.01).toFixed(2) + 'px');
  };
  setH();
  if (window.visualViewport) window.visualViewport.addEventListener('resize', setH);
  return setH;
}

// ---- Polyfills -----------------------------------------------------------

// ResizeObserver (used by quick-liquid): minimal fallback for older engines
if (typeof window.ResizeObserver === 'undefined' && typeof window !== 'undefined') {
  class RO {
    constructor(cb) {
      this.cb = cb;
      this.obs = new Map();
    }
    observe(el) { if (!this.obs.has(el)) { this.obs.set(el, true); this.emit(); } }
    unobserve(el) { this.obs.delete(el); }
    disconnect() { this.obs.clear(); }
    emit() {
      const entries = [...this.obs.keys()].map((el) => ({
        target: el,
        contentRect: el.getBoundingClientRect(),
      }));
      this.cb(entries, this);
    }
  }
  window.ResizeObserver = RO;
}

// Element.animate (WAAPI) fallback -> CSS transition approximator
if (typeof Element !== 'undefined' && !Element.prototype.animate) {
  Element.prototype.animate = function (frames, opts = {}) {
    const el = this;
    const { duration = 400, easing = 'ease', delay = 0 } = opts;
    const last = frames[frames.length - 1];
    const first = frames[0];
    el.style.transition = `none`;
    Object.assign(el.style, first);
    void el.offsetWidth;
    el.style.transition = `transform ${duration}ms ${easing} ${delay}ms, opacity ${duration}ms ${easing} ${delay}ms`;
    if (last) Object.assign(el.style, last);
    return {
      cancel() { el.style.removeProperty('transition'); el.style.removeProperty('transform'); el.style.removeProperty('opacity'); },
      finished: Promise.resolve(),
    };
  };
}

// matchMedia fallback addEventListener/removeEventListener for legacy
if (typeof window.matchMedia === 'function') {
  const mm = window.matchMedia;
  if (mm && mm.prototype && !mm.prototype.addEventListener) {
    mm.prototype.addEventListener = function (type, l) { if (type === 'change') this.addListener(l); };
    mm.prototype.removeEventListener = function (type, l) { if (type === 'change') this.removeListener(l); };
  }
}

// Smooth history.replaceState guard (safe anywhere)
export function setHash(h) {
  try { history.replaceState(null, '', h); } catch {}
}