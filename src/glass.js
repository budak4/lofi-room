// glass.js — lazy LiquidGlass lifecycle manager.
// Only the VISIBLE panel gets an engine (bounded GPU work on mobile);
// dock/topbar/minimini stay attached for the whole session.

import { LiquidGlassEngine, LiquidButton } from 'quick-liquid';
import { GLASS_QUALITY, HAS_BACKDROP, IS_TOUCH, REDUCED_MOTION } from './env.js';

const PANEL_PLACEHOLDER = 'background:rgba(26,24,58,.86);';

const ENGINE_OPTS = () => ({
  material: 'regular',
  blur: REDUCED_TRANSPARENCY ? 26 : 14,
  refractionStrength: HAS_BACKDROP ? 22 : 0,
  chromaticAberration: GLASS_QUALITY === 'high' ? 0.2 : 0.1,
  dynamicLighting: !IS_TOUCH && !REDUCED_MOTION,
  parallax: !IS_TOUCH && !REDUCED_MOTION,
  cursorTracking: !IS_TOUCH && !REDUCED_MOTION,
  quality: GLASS_QUALITY,
  elevation: 2,
  refractionMode: HAS_BACKDROP ? 'auto' : 'css',
});

class GlassSurface {
  constructor(el, opts) {
    this.el = el;
    this.opts = opts;
    this.engine = null;
  }

  attach() {
    if (this.engine) return;
    try {
      this.engine = new LiquidGlassEngine(this.el, this.opts);
    } catch {
      this.el.style.cssText += PANEL_PLACEHOLDER;
    }
  }

  detach() {
    if (!this.engine) return;
    try { this.engine.destroy(); } catch {}
    this.engine = null;
    // restore any live style cleanup handled by destroy() itself
  }

  destroy() { this.detach(); }
}

export class GlassManager {
  constructor() {
    this.surfaces = new Map();   // el -> GlassSurface
    this.persistent = [];
  }

  // Permanent surfaces (dock, topbar, minimini) — attach now, keep forever.
  mountPersistent(selector) {
    document.querySelectorAll(selector).forEach((el) => {
      const s = new GlassSurface(el, ENGINE_OPTS());
      s.attach();
      this.surfaces.set(el, s);
      this.persistent.push(s);
    });
  }

  // Panels: only one engine at a time.
  setActivePanel(el) {
    this.persistent.forEach((s) => s.attach());      // ensure dock etc are up
    let found = null;
    this.surfaces.forEach((s, key) => {
      if (key === el) found = s;
    });
    // attach target
    if (el) {
      if (!found) {
        found = new GlassSurface(el, ENGINE_OPTS());
        this.surfaces.set(el, found);
      }
      found.attach();
    }
    // detach all non-persistent, non-target panels
    this.surfaces.forEach((s, key) => {
      const isPersistent = !key.closest('.panel');
      if (!isPersistent && key !== el) s.detach();
    });
  }

  teardown() {
    this.surfaces.forEach((s) => s.destroy());
    this.surfaces.clear();
  }
}

// One shared LiquidButton press/tap handler pass.
export function liquidButtons(selector) {
  const buttons = [];
  document.querySelectorAll(selector).forEach((el) => {
    try {
      const lb = new LiquidButton(el);
      buttons.push(lb);
    } catch {}
  });
  return buttons;
}