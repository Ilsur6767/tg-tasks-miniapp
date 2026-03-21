/* ============================================================
   TELEGRAM MINI APP — Трекер задач
   Хранилище: Telegram CloudStorage (fallback: localStorage)
   ============================================================ */

'use strict';

// ============================================================
// Config
// ============================================================

const Config = {
  PREFIXES: {
    TASKS:      'tma_tasks',
    MINI:       'tma_mini',
    ACH:        'tma_ach',
  },
  KEYS: {
    RESET:      'tma_reset',
  },
  CHUNK_SIZE: 800,
  ICONS:  { daily: '🔄', onetime: '📌', mini: '⚡' },
  LABELS: { daily: 'Ежедневная', onetime: 'Разовая', mini: 'Мини' },
};

// ============================================================
// Utils
// ============================================================

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function todayDayIndex() {
  const j = new Date().getDay();
  return j === 0 ? 6 : j - 1;
}

function isTaskActiveToday(task) {
  if (!task.days || task.days.length === 0) return true;
  return task.days.includes(todayDayIndex());
}

function formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatDateLabel(dateStr) {
  const today = todayString();
  const d = new Date(); d.setDate(d.getDate() - 1);
  const yesterday = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  if (dateStr === today)     return 'Сегодня';
  if (dateStr === yesterday) return 'Вчера';
  const [y, m, day] = dateStr.split('-');
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
}

function haptic(type = 'light') {
  try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type); } catch(e) {}
}

function hapticNotify(type = 'success') {
  try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type); } catch(e) {}
}

function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
// CloudStore — Telegram CloudStorage с fallback на localStorage
// ============================================================

const CloudStore = {
  get _tg() {
    return window.Telegram?.WebApp?.CloudStorage;
  },

  async get(key) {
    if (!this._tg) return localStorage.getItem(key) || '';
    return new Promise((res, rej) => {
      this._tg.getItem(key, (err, val) => err ? rej(err) : res(val || ''));
    });
  },

  async set(key, value) {
    if (!this._tg) { localStorage.setItem(key, value); return; }
    return new Promise((res, rej) => {
      this._tg.setItem(key, value, (err, ok) => err ? rej(err) : res(ok));
    });
  },

  async getMultiple(keys) {
    if (!keys.length) return {};
    if (!this._tg) {
      return Object.fromEntries(keys.map(k => [k, localStorage.getItem(k) || '']));
    }
    return new Promise((res, rej) => {
      this._tg.getItems(keys, (err, vals) => err ? rej(err) : res(vals || {}));
    });
  },

  async removeMultiple(keys) {
    if (!keys.length) return;
    if (!this._tg) { keys.forEach(k => localStorage.removeItem(k)); return; }
    return new Promise((res, rej) => {
      this._tg.removeItems(keys, (err, ok) => err ? rej(err) : res(ok));
    });
  },

  async getKeys() {
    if (!this._tg) return Object.keys(localStorage);
    return new Promise((res, rej) => {
      this._tg.getKeys((err, keys) => err ? rej(err) : res(keys || []));
    });
  },
};

// ============================================================
// ChunkedStorage — хранение массивов через чанки
// ============================================================

const ChunkedStorage = {
  async save(prefix, arr) {
    const json   = JSON.stringify(arr);
    const chunks = [];
    for (let i = 0; i < json.length; i += Config.CHUNK_SIZE) {
      chunks.push(json.slice(i, i + Config.CHUNK_SIZE));
    }
    if (!chunks.length) chunks.push('[]');

    // Узнать сколько чанков было раньше — удалить лишние
    const prevN = parseInt(await CloudStore.get(`${prefix}_n`) || '0');
    const toRemove = [];
    for (let i = chunks.length; i < prevN; i++) toRemove.push(`${prefix}_${i}`);
    if (toRemove.length) await CloudStore.removeMultiple(toRemove);

    // Сохранить количество и все чанки
    await CloudStore.set(`${prefix}_n`, String(chunks.length));
    await Promise.all(chunks.map((c, i) => CloudStore.set(`${prefix}_${i}`, c)));
  },

  async load(prefix) {
    const nStr = await CloudStore.get(`${prefix}_n`);
    const n = parseInt(nStr || '0');
    if (!n) return [];

    const keys  = Array.from({ length: n }, (_, i) => `${prefix}_${i}`);
    const vals  = await CloudStore.getMultiple(keys);
    const json  = keys.map(k => vals[k] || '').join('');
    try { return JSON.parse(json) || []; } catch { return []; }
  },

  async remove(prefix) {
    const nStr = await CloudStore.get(`${prefix}_n`);
    const n = parseInt(nStr || '0');
    const keys = [`${prefix}_n`, ...Array.from({ length: n }, (_, i) => `${prefix}_${i}`)];
    await CloudStore.removeMultiple(keys);
  },
};

// ============================================================
// Store — CRUD поверх ChunkedStorage
// ============================================================

const Store = {
  // --- Tasks ---
  async getTasks()       { return ChunkedStorage.load(Config.PREFIXES.TASKS); },
  async saveTasks(arr)   { return ChunkedStorage.save(Config.PREFIXES.TASKS, arr); },

  async addTask(title, type, days = []) {
    const tasks = await this.getTasks();
    const task  = { id: genId(), title, type, completed: false, createdAt: Date.now(), days };
    tasks.unshift(task);
    await this.saveTasks(tasks);
    return task;
  },

  async updateTask(id, changes) {
    const tasks = await this.getTasks();
    await this.saveTasks(tasks.map(t => t.id === id ? { ...t, ...changes } : t));
  },

  async deleteTask(id) {
    const tasks = await this.getTasks();
    await this.saveTasks(tasks.filter(t => t.id !== id));
  },

  async completeTask(id) {
    const tasks = await this.getTasks();
    const task  = tasks.find(t => t.id === id);
    if (!task) return;
    const ach = await this.getAchievements();
    ach.unshift({ id: genId(), taskId: id, title: task.title, type: task.type,
                  completedAt: Date.now(), completedDate: todayString() });
    await this.saveAchievements(ach);
    await this.updateTask(id, { completed: true });
  },

  async uncompleteTask(id) {
    await this.updateTask(id, { completed: false });
    const ach = await this.getAchievements();
    const idx = [...ach].reverse().findIndex(a => a.taskId === id);
    if (idx >= 0) {
      ach.splice(ach.length - 1 - idx, 1);
      await this.saveAchievements(ach);
    }
  },

  // --- Mini Tasks ---
  async getMiniTasks()       { return ChunkedStorage.load(Config.PREFIXES.MINI); },
  async saveMiniTasks(arr)   { return ChunkedStorage.save(Config.PREFIXES.MINI, arr); },

  async addMiniTask(title) {
    const tasks = await this.getMiniTasks();
    const task  = { id: genId(), title, completed: false, createdAt: Date.now() };
    tasks.unshift(task);
    await this.saveMiniTasks(tasks);
    return task;
  },

  async updateMiniTask(id, changes) {
    const tasks = await this.getMiniTasks();
    await this.saveMiniTasks(tasks.map(t => t.id === id ? { ...t, ...changes } : t));
  },

  async deleteMiniTask(id) {
    const tasks = await this.getMiniTasks();
    await this.saveMiniTasks(tasks.filter(t => t.id !== id));
  },

  async completeMiniTask(id) {
    const tasks = await this.getMiniTasks();
    const task  = tasks.find(t => t.id === id);
    if (!task) return;
    const ach = await this.getAchievements();
    ach.unshift({ id: genId(), taskId: id, title: task.title, type: 'mini',
                  completedAt: Date.now(), completedDate: todayString() });
    await this.saveAchievements(ach);
    await this.updateMiniTask(id, { completed: true });
  },

  // --- Achievements ---
  async getAchievements()      { return ChunkedStorage.load(Config.PREFIXES.ACH); },
  async saveAchievements(arr)  { return ChunkedStorage.save(Config.PREFIXES.ACH, arr); },

  // --- Last Reset ---
  async getLastReset()         { return CloudStore.get(Config.KEYS.RESET); },
  async setLastReset(dateStr)  { return CloudStore.set(Config.KEYS.RESET, dateStr); },
};

// ============================================================
// DailyReset
// ============================================================

const DailyReset = {
  async run() {
    const today   = todayString();
    const lastDay = await Store.getLastReset();
    if (lastDay === today) return;

    const tasks = await Store.getTasks();
    const reset = tasks.map(t => (t.type === 'daily' && t.completed) ? { ...t, completed: false } : t);
    await Store.saveTasks(reset);
    await Store.setLastReset(today);
  },
};

// ============================================================
// SwipeHandler
// ============================================================

class SwipeHandler {
  constructor(containerEl, itemSel, contentSel, actionsSel) {
    this.container = containerEl;
    this.itemSel   = itemSel;
    this.contentSel = contentSel;
    this.actionsSel = actionsSel;
    this.startX = 0; this.startY = 0;
    this.currentItem = null;
    this.active = false;
    this.dirLocked = null;
    this.THRESHOLD   = 80;
    this.ACTION_WIDTH = 128;
  }

  attach() {
    this.container.addEventListener('touchstart', e => this._start(e), { passive: true });
    this.container.addEventListener('touchmove',  e => this._move(e),  { passive: false });
    this.container.addEventListener('touchend',   e => this._end(e),   { passive: true });
    document.addEventListener('touchstart', e => {
      if (!e.target.closest(this.itemSel)) this._closeAll();
    }, { passive: true });
  }

  _start(e) {
    const item = e.target.closest(this.itemSel);
    if (!item) return;
    this.currentItem = item;
    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
    this.active = true;
    this.dirLocked = null;
  }

  _move(e) {
    if (!this.active || !this.currentItem) return;
    const dx = e.touches[0].clientX - this.startX;
    const dy = e.touches[0].clientY - this.startY;
    if (!this.dirLocked && (Math.abs(dx) > 8 || Math.abs(dy) > 8))
      this.dirLocked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    if (this.dirLocked !== 'h') return;
    e.preventDefault();
    const swiped = this.currentItem.classList.contains('swiped');
    const offset = swiped ? -this.ACTION_WIDTH : 0;
    const delta  = Math.max(-this.ACTION_WIDTH, Math.min(0, dx + offset));
    const content = this.currentItem.querySelector(this.contentSel);
    const actions = this.currentItem.querySelector(this.actionsSel);
    if (content) { content.style.transition = 'none'; content.style.transform = `translateX(${delta}px)`; }
    if (actions) { actions.style.transition = 'none'; actions.style.transform = `translateX(${100 + (delta / this.ACTION_WIDTH) * 100}%)`; }
  }

  _end(e) {
    if (!this.active || !this.currentItem) return;
    const dx = e.changedTouches[0].clientX - this.startX;
    const swiped = this.currentItem.classList.contains('swiped');
    const content = this.currentItem.querySelector(this.contentSel);
    const actions = this.currentItem.querySelector(this.actionsSel);
    if (content) content.style.transition = '';
    if (actions) actions.style.transition = '';
    if (!swiped && dx < -this.THRESHOLD)   this._open(this.currentItem);
    else if (swiped && dx > this.THRESHOLD / 2) this._close(this.currentItem);
    else swiped ? this._open(this.currentItem) : this._close(this.currentItem);
    this.active = false; this.currentItem = null; this.dirLocked = null;
  }

  _open(item) {
    this._closeAll();
    item.classList.add('swiped');
    const c = item.querySelector(this.contentSel);
    const a = item.querySelector(this.actionsSel);
    if (c) c.style.transform = '';
    if (a) a.style.transform = '';
  }

  _close(item) {
    item.classList.remove('swiped');
    const c = item.querySelector(this.contentSel);
    const a = item.querySelector(this.actionsSel);
    if (c) c.style.transform = '';
    if (a) a.style.transform = '';
  }

  _closeAll() {
    this.container.querySelectorAll(this.itemSel + '.swiped').forEach(el => this._close(el));
  }
}

// ============================================================
// LongPressHandler
// ============================================================

class LongPressHandler {
  constructor(containerEl, itemSel, onLongPress) {
    this.container = containerEl;
    this.selector  = itemSel;
    this.callback  = onLongPress;
    this._timer    = null;
    this._sx = 0; this._sy = 0;
    this.attach();
  }

  attach() {
    this.container.addEventListener('touchstart', e => {
      const item = e.target.closest(this.selector);
      if (!item) return;
      this._sx = e.touches[0].clientX; this._sy = e.touches[0].clientY;
      this._timer = setTimeout(() => {
        haptic('medium');
        this.callback(item, e.touches[0].clientX, e.touches[0].clientY);
      }, 500);
    }, { passive: true });

    this.container.addEventListener('touchmove', e => {
      if (!this._timer) return;
      if (Math.abs(e.touches[0].clientX - this._sx) > 10 ||
          Math.abs(e.touches[0].clientY - this._sy) > 10) {
        clearTimeout(this._timer); this._timer = null;
      }
    }, { passive: true });

    this.container.addEventListener('touchend', () => {
      clearTimeout(this._timer); this._timer = null;
    }, { passive: true });
  }
}

// ============================================================
// ContextMenu
// ============================================================

const ContextMenu = {
  el:        document.getElementById('contextMenu'),
  editBtn:   document.getElementById('ctxEdit'),
  deleteBtn: document.getElementById('ctxDelete'),

  show(x, y, onEdit, onDelete) {
    const W = window.innerWidth, H = window.innerHeight;
    this.el.style.left    = Math.min(x, W - 188) + 'px';
    this.el.style.top     = Math.min(y, H - 100) + 'px';
    this.el.style.display = 'block';

    const cleanup = () => {
      this.hide();
      document.removeEventListener('touchstart', onOut);
    };
    const onOut = e => { if (!this.el.contains(e.target)) cleanup(); };

    this.editBtn.onclick   = () => { cleanup(); onEdit(); };
    this.deleteBtn.onclick = () => { cleanup(); onDelete(); };
    setTimeout(() => document.addEventListener('touchstart', onOut, { passive: true }), 50);
  },

  hide() {
    this.el.style.display = 'none';
    this.editBtn.onclick = null;
    this.deleteBtn.onclick = null;
  },
};

// ============================================================
// Modal
// ============================================================

const Modal = {
  overlay:    document.getElementById('modalOverlay'),
  titleEl:    document.getElementById('modalTitle'),
  inputEl:    document.getElementById('modalInput'),
  typeToggle: document.getElementById('typeToggle'),
  daysPicker: document.getElementById('daysPicker'),
  saveBtn:    document.getElementById('modalSave'),
  cancelBtn:  document.getElementById('modalCancel'),
  _onSave: null, _isOpen: false,
  _selectedType: 'daily', _selectedDays: [],

  init() {
    this.cancelBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('touchstart', e => {
      if (e.target === this.overlay) this.close();
    }, { passive: true });

    this.typeToggle.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.typeToggle.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._selectedType = btn.dataset.type;
        this.daysPicker.style.display = this._selectedType === 'daily' ? 'flex' : 'none';
      });
    });

    this.daysPicker.querySelectorAll('.day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        haptic('light');
        this._syncDays();
      });
    });

    this.saveBtn.addEventListener('click', () => {
      const val = this.inputEl.value.trim();
      if (!val) { this.inputEl.focus(); return; }
      this._syncDays();
      if (this._onSave) this._onSave(val, this._selectedType, this._selectedDays);
      this.close();
    });

    this.inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.saveBtn.click();
    });

    window.Telegram?.WebApp?.BackButton?.onClick?.(() => {
      if (this._isOpen) { this.close(); window.Telegram.WebApp.BackButton.hide(); }
    });
  },

  _syncDays() {
    const active = [...this.daysPicker.querySelectorAll('.day-btn.active')]
      .map(b => parseInt(b.dataset.day));
    this._selectedDays = active.length === 7 ? [] : active;
  },

  _setDaysUI(days) {
    const all = days.length === 0;
    this.daysPicker.querySelectorAll('.day-btn').forEach(btn => {
      btn.classList.toggle('active', all || days.includes(parseInt(btn.dataset.day)));
    });
    this._selectedDays = days;
  },

  open({ title = 'Новая задача', value = '', type = 'daily', days = [], showTypeToggle = true, onSave }) {
    this.titleEl.textContent = title;
    this.inputEl.value       = value;
    this._selectedType       = type;
    this._onSave             = onSave;
    this._isOpen             = true;
    this.typeToggle.style.display = showTypeToggle ? 'flex' : 'none';
    this.typeToggle.querySelectorAll('.type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
    const showDays = showTypeToggle && type === 'daily';
    this.daysPicker.style.display = showDays ? 'flex' : 'none';
    this._setDaysUI(days);
    this.overlay.classList.add('visible');
    window.Telegram?.WebApp?.BackButton?.show?.();
    setTimeout(() => this.inputEl.focus(), 350);
  },

  close() {
    this._isOpen = false;
    this.overlay.classList.remove('visible');
    this.inputEl.blur();
    window.Telegram?.WebApp?.BackButton?.hide?.();
  },

  isOpen() { return this._isOpen; },
};

// ============================================================
// Progress
// ============================================================

const Progress = {
  fillEl:  document.getElementById('progressFill'),
  statsEl: document.getElementById('progressStats'),

  async update() {
    const tasks = (await Store.getTasks()).filter(t => isTaskActiveToday(t));
    const total = tasks.length;
    const done  = tasks.filter(t => t.completed).length;
    const pct   = total === 0 ? 0 : Math.round((done / total) * 100);
    this.statsEl.textContent = `${done} / ${total}`;
    this.fillEl.style.width  = pct + '%';
    if (pct === 100 && total > 0) {
      this.fillEl.classList.add('complete');
      setTimeout(() => this.fillEl.classList.remove('complete'), 700);
    }
  },
};

// ============================================================
// UI.Tasks
// ============================================================

const UITasks = {
  listEl:  document.getElementById('taskList'),
  emptyEl: document.getElementById('emptyTasks'),

  init() {
    new SwipeHandler(this.listEl, '.task-item', '.task-content', '.task-actions').attach();
    new LongPressHandler(this.listEl, '.task-item', async (item, x, y) => {
      const task = (await Store.getTasks()).find(t => t.id === item.dataset.id);
      if (!task) return;
      ContextMenu.show(x, y,
        () => this._openEdit(task),
        async () => { await Store.deleteTask(task.id); this.render(); }
      );
    });
  },

  async render() {
    const tasks = await Store.getTasks();
    this.listEl.innerHTML = '';

    if (!tasks.length) {
      this.emptyEl.style.display = 'flex';
      await Progress.update();
      return;
    }
    this.emptyEl.style.display = 'none';

    const daily          = tasks.filter(t => t.type === 'daily');
    const dailyActive    = daily.filter(t => isTaskActiveToday(t));
    const dailyInactive  = daily.filter(t => !isTaskActiveToday(t));
    const onetime        = tasks.filter(t => t.type === 'onetime');

    if (dailyActive.length) {
      this.listEl.appendChild(this._sectionHeader('Ежедневные', dailyActive.length));
      dailyActive.forEach(t => this.listEl.appendChild(this._taskEl(t)));
    }
    if (dailyInactive.length) {
      this.listEl.appendChild(this._sectionHeader('Не сегодня', dailyInactive.length));
      dailyInactive.forEach(t => this.listEl.appendChild(this._taskEl(t, true)));
    }
    if (onetime.length) {
      this.listEl.appendChild(this._sectionHeader('Разовые', onetime.length));
      onetime.forEach(t => this.listEl.appendChild(this._taskEl(t)));
    }

    await Progress.update();
  },

  _sectionHeader(label, count) {
    const el = document.createElement('div');
    el.className = 'section-header';
    el.innerHTML = `<span class="section-title">${label}</span><span class="section-count">${count}</span>`;
    return el;
  },

  _taskEl(task, inactive = false) {
    const el = document.createElement('div');
    el.className = 'task-item' + (inactive ? ' inactive-today' : '');
    el.dataset.id = task.id;

    const DAY_NAMES = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    const todayIdx  = todayDayIndex();
    let daysHtml = '';
    if (task.type === 'daily' && task.days?.length && task.days.length < 7) {
      const dots = DAY_NAMES.map((name, i) => {
        const cls = task.days.includes(i) ? 'active-day' : 'inactive-day';
        const outline = i === todayIdx ? 'style="outline:2px solid currentColor;outline-offset:1px;"' : '';
        return `<span class="task-day-dot ${cls}" ${outline}>${name}</span>`;
      }).join('');
      daysHtml = `<div class="task-days">${dots}</div>`;
    }

    el.innerHTML = `
      <div class="task-content">
        <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
        <div style="flex:1;min-width:0;">
          <span class="task-text ${task.completed ? 'completed' : ''}">${escapeHtml(task.title)}</span>
          ${daysHtml}
        </div>
        <span class="task-badge ${task.type}">${Config.LABELS[task.type]}</span>
      </div>
      <div class="task-actions">
        <button class="task-action-btn task-action-edit" data-action="edit">✏️</button>
        <button class="task-action-btn task-action-delete" data-action="delete">🗑️</button>
      </div>`;

    if (!inactive) {
      el.querySelector('.task-checkbox').addEventListener('click', async () => {
        haptic('light');
        if (task.completed) { await Store.uncompleteTask(task.id); hapticNotify('warning'); }
        else                { await Store.completeTask(task.id);   hapticNotify('success'); }
        this.render();
        UIAchievements.render();
      });
      el.querySelector('.task-text').addEventListener('click', () => {
        el.querySelector('.task-checkbox').click();
      });
    }

    el.querySelector('[data-action="edit"]').addEventListener('click', () => this._openEdit(task));
    el.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      haptic('medium');
      await Store.deleteTask(task.id);
      this.render();
    });

    return el;
  },

  _openEdit(task) {
    Modal.open({
      title: 'Редактировать задачу',
      value: task.title,
      type:  task.type,
      days:  task.days || [],
      showTypeToggle: true,
      onSave: async (title, type, days) => {
        await Store.updateTask(task.id, { title, type, days });
        this.render();
      },
    });
  },
};

// ============================================================
// UI.MiniTasks
// ============================================================

const UIMiniTasks = {
  listEl:  document.getElementById('miniTaskList'),
  emptyEl: document.getElementById('emptyMini'),

  init() {
    new SwipeHandler(this.listEl, '.mini-item', '.mini-content', '.mini-actions').attach();
    new LongPressHandler(this.listEl, '.mini-item', async (item, x, y) => {
      const task = (await Store.getMiniTasks()).find(t => t.id === item.dataset.id);
      if (!task) return;
      ContextMenu.show(x, y,
        () => this._openEdit(task),
        async () => { await Store.deleteMiniTask(task.id); this.render(); }
      );
    });
  },

  async render() {
    const tasks = await Store.getMiniTasks();
    this.listEl.innerHTML = '';

    if (!tasks.length) { this.emptyEl.style.display = 'flex'; return; }
    this.emptyEl.style.display = 'none';

    const pending   = tasks.filter(t => !t.completed);
    const completed = tasks.filter(t => t.completed);

    pending.forEach(t => this.listEl.appendChild(this._miniEl(t)));
    if (completed.length && pending.length) {
      const sep = document.createElement('div');
      sep.className = 'section-header';
      sep.innerHTML = `<span class="section-title">Выполнено</span><span class="section-count">${completed.length}</span>`;
      this.listEl.appendChild(sep);
    }
    completed.forEach(t => this.listEl.appendChild(this._miniEl(t)));
  },

  _miniEl(task) {
    const el = document.createElement('div');
    el.className = 'mini-item';
    el.dataset.id = task.id;
    el.innerHTML = `
      <div class="mini-content">
        <div class="mini-checkbox ${task.completed ? 'checked' : ''}"></div>
        <span class="mini-text ${task.completed ? 'completed' : ''}">${escapeHtml(task.title)}</span>
      </div>
      <div class="mini-actions">
        <button class="task-action-btn task-action-edit" data-action="edit">✏️</button>
        <button class="task-action-btn task-action-delete" data-action="delete">🗑️</button>
      </div>`;

    el.querySelector('.mini-checkbox').addEventListener('click', async () => {
      haptic('light');
      if (task.completed) { await Store.updateMiniTask(task.id, { completed: false }); }
      else                { await Store.completeMiniTask(task.id); hapticNotify('success'); }
      this.render();
      UIAchievements.render();
    });
    el.querySelector('.mini-text').addEventListener('click', () => {
      el.querySelector('.mini-checkbox').click();
    });
    el.querySelector('[data-action="edit"]').addEventListener('click', () => this._openEdit(task));
    el.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      await Store.deleteMiniTask(task.id);
      this.render();
    });
    return el;
  },

  _openEdit(task) {
    Modal.open({
      title: 'Редактировать мини-задачу',
      value: task.title,
      showTypeToggle: false,
      onSave: async (title) => {
        await Store.updateMiniTask(task.id, { title });
        this.render();
      },
    });
  },
};

// ============================================================
// UI.Achievements
// ============================================================

const UIAchievements = {
  listEl:  document.getElementById('achievementList'),
  emptyEl: document.getElementById('emptyAchievements'),

  async render() {
    const ach = await Store.getAchievements();
    this.listEl.innerHTML = '';

    if (!ach.length) { this.emptyEl.style.display = 'flex'; return; }
    this.emptyEl.style.display = 'none';

    const today = todayString();
    const stats = document.createElement('div');
    stats.className = 'achievements-stats';
    stats.innerHTML = `
      <div class="stat-item">
        <div class="stat-number">${ach.filter(a => a.completedDate === today).length}</div>
        <div class="stat-label">Сегодня</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-number">${ach.length}</div>
        <div class="stat-label">Всего</div>
      </div>`;
    this.listEl.appendChild(stats);

    const groups = {};
    ach.forEach(a => {
      if (!groups[a.completedDate]) groups[a.completedDate] = [];
      groups[a.completedDate].push(a);
    });

    Object.entries(groups).forEach(([date, items], gi) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'achievements-date-group';
      groupEl.innerHTML = `<div class="achievements-date-label">${formatDateLabel(date)}</div>`;
      items.forEach((a, i) => {
        const card = document.createElement('div');
        card.className = 'achievement-card';
        card.style.animationDelay = `${(gi * 3 + i) * 0.04}s`;
        card.innerHTML = `
          <div class="achievement-icon">${Config.ICONS[a.type] || '⭐'}</div>
          <div class="achievement-info">
            <div class="achievement-title">${escapeHtml(a.title)}</div>
            <div class="achievement-meta">${Config.LABELS[a.type] || ''} · ${formatTime(a.completedAt)}</div>
          </div>
          <div class="achievement-check">✓</div>`;
        groupEl.appendChild(card);
      });
      this.listEl.appendChild(groupEl);
    });
  },
};

// ============================================================
// UI.Settings
// ============================================================

const UISettings = {
  showExportBtn: document.getElementById('showExportBtn'),
  exportArea:    document.getElementById('exportArea'),
  exportHint:    document.getElementById('exportHint'),
  pasteArea:     document.getElementById('pasteArea'),
  loadBtn:       document.getElementById('loadBtn'),
  exportBtn:     document.getElementById('exportBtn'),
  importInput:   document.getElementById('importInput'),
  clearBtn:      document.getElementById('clearBtn'),
  storageCountEl:document.getElementById('storageCount'),
  lastResetEl:   document.getElementById('lastResetInfo'),

  init() {
    this.showExportBtn.addEventListener('click', () => this._showExport());
    this.loadBtn.addEventListener('click', () => this._loadFromText());
    this.exportBtn.addEventListener('click', () => this._exportFile());
    this.importInput.addEventListener('change', e => {
      if (e.target.files[0]) { this._importFile(e.target.files[0]); e.target.value = ''; }
    });
    this.clearBtn.addEventListener('click', () => this._clearAll());
  },

  async _showExport() {
    haptic('light');
    const data = {
      v: '2',
      tasks: await Store.getTasks(),
      mini:  await Store.getMiniTasks(),
      ach:   await Store.getAchievements(),
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    this.exportArea.value        = encoded;
    this.exportArea.style.display = 'block';
    this.exportHint.textContent  = '👆 Выдели весь текст и скопируй (Ctrl+A, Ctrl+C)';
    setTimeout(() => this.exportArea.select(), 200);
  },

  async _loadFromText() {
    const text = this.pasteArea.value.trim();
    if (!text) { alert('Вставь данные в поле выше'); return; }
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(text))));
      if (!data.tasks || !data.mini || !data.ach) { alert('❌ Неверный формат данных'); return; }
      if (!confirm('Заменить все текущие данные?')) return;
      await Store.saveTasks(data.tasks);
      await Store.saveMiniTasks(data.mini);
      await Store.saveAchievements(data.ach);
      hapticNotify('success');
      this.pasteArea.value = '';
      alert('✅ Данные загружены!');
      await UITabs.switchTo('tasks');
    } catch { alert('❌ Ошибка при загрузке данных'); }
  },

  async _exportFile() {
    haptic('light');
    const data = {
      version: '2', exportedAt: new Date().toISOString(),
      tasks: await Store.getTasks(),
      miniTasks: await Store.getMiniTasks(),
      achievements: await Store.getAchievements(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasks-backup-${todayString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    hapticNotify('success');
  },

  _importFile(file) {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!confirm('Заменить все текущие данные?')) return;
        await Store.saveTasks(data.tasks || []);
        await Store.saveMiniTasks(data.miniTasks || []);
        await Store.saveAchievements(data.achievements || []);
        hapticNotify('success');
        alert('✅ Данные импортированы!');
        await UITabs.switchTo('tasks');
      } catch { alert('❌ Ошибка при импорте файла'); }
    };
    reader.readAsText(file);
  },

  async _clearAll() {
    if (!confirm('🗑️ Удалить ВСЕ данные? Это нельзя отменить.')) return;
    if (!confirm('Последний шанс. Точно удалить?')) return;
    haptic('medium');
    // Удалить из CloudStorage
    const keys = await CloudStore.getKeys();
    const tmaKeys = keys.filter(k => k.startsWith('tma_'));
    await CloudStore.removeMultiple(tmaKeys);
    // Fallback: очистить localStorage тоже
    Object.keys(localStorage).filter(k => k.startsWith('tma_')).forEach(k => localStorage.removeItem(k));
    alert('✅ Данные удалены');
    location.reload();
  },

  async updateStorageInfo() {
    const total = (await Store.getTasks()).length + (await Store.getMiniTasks()).length;
    this.storageCountEl.textContent = String(total);
    const last = await Store.getLastReset();
    this.lastResetEl.textContent = last ? formatDateLabel(last) : '—';
  },
};

// ============================================================
// UI.Tabs
// ============================================================

const UITabs = {
  currentTab: 'tasks',
  panels: {
    tasks:        document.getElementById('tab-tasks'),
    mini:         document.getElementById('tab-mini'),
    achievements: document.getElementById('tab-achievements'),
    settings:     document.getElementById('tab-settings'),
  },

  init() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        haptic('light');
        this.switchTo(btn.dataset.tab);
      });
    });
  },

  async switchTo(tab) {
    if (this.currentTab === tab) return;
    this.currentTab = tab;

    Object.entries(this.panels).forEach(([key, el]) => el.classList.toggle('active', key === tab));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));

    const header = document.getElementById('appHeader');
    const main   = document.querySelector('.main-content');
    header.style.display = tab === 'tasks' ? '' : 'none';
    main.style.top       = tab === 'tasks' ? 'var(--header-height)' : '0';

    document.getElementById('fabBtn').style.display =
      (tab === 'achievements' || tab === 'settings') ? 'none' : '';

    if (tab === 'tasks')        await UITasks.render();
    if (tab === 'mini')         await UIMiniTasks.render();
    if (tab === 'achievements') await UIAchievements.render();
    if (tab === 'settings')     await UISettings.updateStorageInfo();
  },
};

// ============================================================
// FAB
// ============================================================

const FAB = {
  btn: document.getElementById('fabBtn'),

  init() {
    this.btn.addEventListener('click', () => {
      haptic('light');
      const tab = UITabs.currentTab;
      if (tab === 'tasks') {
        Modal.open({
          title: 'Новая задача',
          showTypeToggle: true,
          onSave: async (title, type, days) => {
            await Store.addTask(title, type, days);
            UITasks.render();
          },
        });
      } else if (tab === 'mini') {
        Modal.open({
          title: 'Новая мини-задача',
          showTypeToggle: false,
          onSave: async (title) => {
            await Store.addMiniTask(title);
            UIMiniTasks.render();
          },
        });
      }
    });
  },
};

// ============================================================
// TelegramInit
// ============================================================

const TelegramInit = {
  init() {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation?.();
    tg.setHeaderColor?.(tg.themeParams?.secondary_bg_color || '#f4f4f5');
    tg.setBackgroundColor?.(tg.themeParams?.bg_color || '#ffffff');
  },
};

// ============================================================
// App
// ============================================================

const App = {
  async init() {
    // Показать лоадер пока данные грузятся
    document.body.style.opacity = '0';

    TelegramInit.init();
    await DailyReset.run();

    Modal.init();
    UITabs.init();
    UITasks.init();
    UIMiniTasks.init();
    UISettings.init();
    FAB.init();

    await UITasks.render();

    // Плавное появление после загрузки данных из облака
    document.body.style.transition = 'opacity 0.25s ease';
    document.body.style.opacity    = '1';
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
