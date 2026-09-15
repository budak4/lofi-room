const STATE = {
  focus: 'focus', break: 'break',
};

export class Pomodoro {
  constructor({ onChange }) {
    this.mode = STATE.focus;
    this.durationMin = 25;
    this.remaining = 25 * 60;
    this.running = false;
    this.timer = null;
    this.sessions = 0;
    this.onChange = onChange || (() => {});
  }

  setDuration(min) {
    if (this.running) return;
    this.durationMin = min;
    this.remaining = min * 60;
    this._emit();
  }

  setMode(mode, keepTime) {
    this.mode = mode;
    this.stopTimer();
    this.durationMin = mode === STATE.focus ? this.durationMin || 25 : 5;
    if (!keepTime) this.remaining = this.durationMin * 60;
    this._emit();
  }

  toggle() {
    if (this.running) this.pause();
    else this.start();
    this._emit();
  }

  start() {
    if (this.running) return;
    const now = Date.now();
    this.deadline = now + this.remaining * 1000;
    this.running = true;
    this.timer = setInterval(() => this._tick(), 500);
    this._emit();
  }

  pause() {
    this.running = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this._emit();
  }

  skip() {
    this._finishMode();
  }

  reset() {
    this.stopTimer();
    this.remaining = this.durationMin * 60;
    this._emit();
  }

  stopTimer() {
    this.running = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  _tick() {
    this.remaining = Math.max(0, Math.round((this.deadline - Date.now()) / 1000));
    if (this.remaining <= 0) this._finishMode();
    else this._emit();
  }

  _finishMode() {
    this.stopTimer();
    if (this.mode === STATE.focus) {
      this.sessions++;
      this.mode = STATE.break;
      this.durationMin = 5;
      this.remaining = 5 * 60;
      this.onOnly?.('break-start');
    } else {
      this.mode = STATE.focus;
      this.remaining = this.durationMin * 60;
      this.onOnly?.('focus-start');
    }
    if (this._auto && this._auto()) this.start();
    this._emit();
  }

  autoResume(enable) { this._auto = enable; }

  _emit() {
    const total = this.durationMin * 60;
    const progress = 1 - this.remaining / total;
    this.onChange({
      mode: this.mode,
      remaining: this.remaining,
      durationMin: this.durationMin,
      running: this.running,
      sessions: this.sessions,
      progress: this.mode === STATE.focus ? progress : 1 - progress,
    });
  }

  destroy() { this.stopTimer(); }
}