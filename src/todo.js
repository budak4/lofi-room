const KEY = 'lofi-room-todo';

export class TodoStore {
  constructor() {
    try { this.items = JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { this.items = []; }
  }

  all() { return this.items; }

  add(text) {
    const item = { id: Date.now() + Math.random(), text, done: false, at: Date.now() };
    this.items.unshift(item);
    this._save();
    return item;
  }

  toggle(id) {
    const it = this.items.find((t) => t.id === id);
    if (it) { it.done = !it.done; this._save(); }
    return it;
  }

  remove(id) {
    this.items = this.items.filter((t) => t.id !== id);
    this._save();
  }

  clearDone() {
    this.items = this.items.filter((t) => !t.done);
    this._save();
  }

  pending() { return this.items.filter((t) => !t.done).length; }

  _save() { try { localStorage.setItem(KEY, JSON.stringify(this.items)); } catch {} }
}