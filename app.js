/* ============================================================
   TELEGRAM MINI APP — Tasks & Thoughts
   Storage: Telegram CloudStorage (fallback: localStorage)
   i18n: Russian / English
   ============================================================ */

'use strict';

// ============================================================
// i18n
// ============================================================

const I18n = {
  current: 'ru',

  strings: {
    ru: {
      progressLabel:        'Прогресс дня',
      tabTasks:             'Задачи',
      tabAch:               'Победы',
      tabThoughts:          'Мысли',
      emptyTasks:           'Задач пока нет',
      emptyTasksHint:       'Нажми + чтобы добавить',
      emptyAch:             'Пока нет достижений',
      emptyAchHint:         'Выполни задачи — они появятся здесь',
      emptyThoughts:        'Нет записей',
      emptyThoughtsHint:    'Напиши свою первую мысль',
      thoughtPlaceholder:   'Напиши мысль...',
      newTask:              'Новая задача',
      editTask:             'Редактировать задачу',
      typeDaily:            'Ежедневная',
      typeOnetime:          'Разовая',
      activeDays:           'Активна в дни:',
      deadline:             'Дедлайн',
      cancel:               'Отмена',
      save:                 'Сохранить',
      ctxEdit:              'Редактировать',
      ctxDelete:            'Удалить',
      labelDaily:           'Ежедневная',
      labelOnetime:         'Разовая',
      sectionDaily:         'Ежедневные',
      sectionOnetime:       'Разовые',
      sectionNotToday:      'Не сегодня',
      sectionDone:          'Выполнено',
      statToday:            'Сегодня',
      statTotal:            'Всего',
      confirmReplace:       'Заменить все текущие данные?',
      confirmDeleteAll:     'Удалить ВСЕ данные? Это нельзя отменить.',
      confirmDeleteAll2:    'Последний шанс. Точно удалить?',
      confirmDeleteThought: 'Удалить запись?',
      clearAll:             'Очистить всё',
      confirmClearThoughts: 'Удалить все мысли? Это нельзя отменить.',
      confirmClearTasks:    'Удалить все задачи? Это нельзя отменить.',
      deadlineOverdue:      'Просрочено',
      deadlineSoon:         'Скоро дедлайн',
      subtaskPlaceholder:   'Новая подзадача...',
      addSubtaskBtn:        '+ подзадача',
      days: ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'],
    },
    en: {
      progressLabel:        'Daily progress',
      tabTasks:             'Tasks',
      tabAch:               'Wins',
      tabThoughts:          'Thoughts',
      emptyTasks:           'No tasks yet',
      emptyTasksHint:       'Tap + to add one',
      emptyAch:             'No achievements yet',
      emptyAchHint:         'Complete tasks — they will appear here',
      emptyThoughts:        'No entries yet',
      emptyThoughtsHint:    'Write your first thought',
      thoughtPlaceholder:   'Write a thought...',
      newTask:              'New task',
      editTask:             'Edit task',
      typeDaily:            'Daily',
      typeOnetime:          'One-time',
      activeDays:           'Active on days:',
      deadline:             'Deadline',
      cancel:               'Cancel',
      save:                 'Save',
      ctxEdit:              'Edit',
      ctxDelete:            'Delete',
      labelDaily:           'Daily',
      labelOnetime:         'One-time',
      sectionDaily:         'Daily',
      sectionOnetime:       'One-time',
      sectionNotToday:      'Not today',
      sectionDone:          'Done',
      statToday:            'Today',
      statTotal:            'Total',
      confirmReplace:       'Replace all current data?',
      confirmDeleteAll:     'Delete ALL data? This cannot be undone.',
      confirmDeleteAll2:    'Last chance. Are you sure?',
      confirmDeleteThought: 'Delete this entry?',
      clearAll:             'Clear all',
      confirmClearThoughts: 'Delete all thoughts? This cannot be undone.',
      confirmClearTasks:    'Delete all tasks? This cannot be undone.',
      deadlineOverdue:      'Overdue',
      deadlineSoon:         'Deadline soon',
      subtaskPlaceholder:   'New subtask...',
      addSubtaskBtn:        '+ subtask',
      days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    },
  },

  t(key) {
    return this.strings[this.current][key] ?? key;
  },

  set(lang) {
    this.current = lang;
    document.documentElement.lang = lang;
    this._applyAll();
  },

  _applyAll() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = this.t(el.dataset.i18nPlaceholder);
    });
    const btn = document.getElementById('langBtn');
    if (btn) btn.textContent = this.current === 'ru' ? 'EN' : 'RU';
  },
};

// ============================================================
// Config
// ============================================================

const Config = {
  PREFIXES: { TASKS: 'tma_tasks', ACH: 'tma_ach', THOUGHTS: 'tma_thoughts' },
  KEYS:     { RESET: 'tma_reset', LANG: 'tma_lang' },
  CHUNK_SIZE: 800,
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
  const yd = new Date(); yd.setDate(yd.getDate() - 1);
  const yesterday = `${yd.getFullYear()}-${String(yd.getMonth()+1).padStart(2,'0')}-${String(yd.getDate()).padStart(2,'0')}`;
  if (dateStr === today)     return I18n.t('statToday');
  if (dateStr === yesterday) return I18n.current === 'ru' ? 'Вчера' : 'Yesterday';
  const [y, m, day] = dateStr.split('-');
  const months = I18n.current === 'ru'
    ? ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
}

function deadlineProgress(task) {
  const now     = Date.now();
  const created = task.createdAt || (task.deadline - 86400000);
  const total   = task.deadline - created;
  const elapsed = now - created;
  const pct     = Math.min(100, Math.max(4, total > 0 ? (elapsed / total) * 100 : 100));

  const diff = task.deadline - now;
  let color, label;

  if (diff < 0) {
    color = '#c62828';
    label = I18n.current === 'ru' ? 'просрочено' : 'overdue';
  } else {
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const d = Math.floor(h / 24);
    label = d >= 2
      ? (I18n.current === 'ru' ? `${d}д` : `${d}d`)
      : d === 1
        ? (I18n.current === 'ru' ? '1д' : '1d')
        : h > 0
          ? (I18n.current === 'ru' ? `${h}ч ${m}м` : `${h}h ${m}m`)
          : (I18n.current === 'ru' ? `${m}м` : `${m}m`);
    color = diff < 3600000   ? '#e53935'
          : diff < 21600000  ? '#f57c00'
          : diff < 86400000  ? '#f9ab00'
          : '#43a047';
  }

  return { pct, color, label };
}

function haptic(type = 'light') {
  try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type); } catch(e) {}
}

function hapticNotify(type = 'success') {
  try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type); } catch(e) {}
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
// CloudStore
// ============================================================

const CloudStore = {
  get _tg() { return window.Telegram?.WebApp?.CloudStorage; },

  async get(key) {
    if (!this._tg) return localStorage.getItem(key) || '';
    return new Promise((res, rej) =>
      this._tg.getItem(key, (err, val) => err ? rej(err) : res(val || ''))
    );
  },

  async set(key, value) {
    if (!this._tg) { localStorage.setItem(key, value); return; }
    return new Promise((res, rej) =>
      this._tg.setItem(key, value, (err, ok) => err ? rej(err) : res(ok))
    );
  },

  async getMultiple(keys) {
    if (!keys.length) return {};
    if (!this._tg) return Object.fromEntries(keys.map(k => [k, localStorage.getItem(k) || '']));
    return new Promise((res, rej) =>
      this._tg.getItems(keys, (err, vals) => err ? rej(err) : res(vals || {}))
    );
  },

  async removeMultiple(keys) {
    if (!keys.length) return;
    if (!this._tg) { keys.forEach(k => localStorage.removeItem(k)); return; }
    return new Promise((res, rej) =>
      this._tg.removeItems(keys, (err, ok) => err ? rej(err) : res(ok))
    );
  },

  async getKeys() {
    if (!this._tg) return Object.keys(localStorage);
    return new Promise((res, rej) =>
      this._tg.getKeys((err, keys) => err ? rej(err) : res(keys || []))
    );
  },
};

// ============================================================
// ChunkedStorage
// ============================================================

const ChunkedStorage = {
  async save(prefix, arr) {
    const json   = JSON.stringify(arr);
    const chunks = [];
    for (let i = 0; i < json.length; i += Config.CHUNK_SIZE) chunks.push(json.slice(i, i + Config.CHUNK_SIZE));
    if (!chunks.length) chunks.push('[]');

    const prevN    = parseInt(await CloudStore.get(`${prefix}_n`) || '0');
    const toRemove = [];
    for (let i = chunks.length; i < prevN; i++) toRemove.push(`${prefix}_${i}`);
    if (toRemove.length) await CloudStore.removeMultiple(toRemove);

    await CloudStore.set(`${prefix}_n`, String(chunks.length));
    await Promise.all(chunks.map((c, i) => CloudStore.set(`${prefix}_${i}`, c)));
  },

  async load(prefix) {
    const n = parseInt(await CloudStore.get(`${prefix}_n`) || '0');
    if (!n) return [];
    const keys = Array.from({ length: n }, (_, i) => `${prefix}_${i}`);
    const vals = await CloudStore.getMultiple(keys);
    const json = keys.map(k => vals[k] || '').join('');
    try { return JSON.parse(json) || []; } catch { return []; }
  },
};

// ============================================================
// Store
// ============================================================

const Store = {
  async getTasks()            { return ChunkedStorage.load(Config.PREFIXES.TASKS); },
  async saveTasks(arr)        { return ChunkedStorage.save(Config.PREFIXES.TASKS, arr); },
  async getAchievements()     { return ChunkedStorage.load(Config.PREFIXES.ACH); },
  async saveAchievements(arr) { return ChunkedStorage.save(Config.PREFIXES.ACH, arr); },
  async getThoughts()         { return ChunkedStorage.load(Config.PREFIXES.THOUGHTS); },
  async saveThoughts(arr)     { return ChunkedStorage.save(Config.PREFIXES.THOUGHTS, arr); },

  async getLastReset() { return CloudStore.get(Config.KEYS.RESET); },
  async setLastReset(d){ return CloudStore.set(Config.KEYS.RESET, d); },
  async getLang()      { return CloudStore.get(Config.KEYS.LANG); },
  async setLang(l)     { return CloudStore.set(Config.KEYS.LANG, l); },

  async addTask(title, type, days = [], deadline = null) {
    const tasks = await this.getTasks();
    const task  = { id: genId(), title, type, completed: false, createdAt: Date.now(), days, deadline, subtasks: [] };
    tasks.unshift(task);
    await this.saveTasks(tasks);
    return task;
  },

  async updateTask(id, changes) {
    await this.saveTasks((await this.getTasks()).map(t => t.id === id ? { ...t, ...changes } : t));
  },

  async deleteTask(id) {
    await this.saveTasks((await this.getTasks()).filter(t => t.id !== id));
  },

  async completeTask(id) {
    const task = (await this.getTasks()).find(t => t.id === id);
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
    if (idx >= 0) { ach.splice(ach.length - 1 - idx, 1); await this.saveAchievements(ach); }
  },

  // Subtask methods
  async addSubtask(taskId, title) {
    const tasks = await this.getTasks();
    const task  = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (!task.subtasks) task.subtasks = [];
    task.subtasks.push({ id: genId(), title, completed: false, createdAt: Date.now() });
    await this.saveTasks(tasks);
  },

  async toggleSubtask(taskId, subtaskId) {
    const tasks = await this.getTasks();
    const task  = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;
    const sub = task.subtasks.find(s => s.id === subtaskId);
    if (sub) sub.completed = !sub.completed;
    await this.saveTasks(tasks);
  },

  async deleteSubtask(taskId, subtaskId) {
    const tasks = await this.getTasks();
    const task  = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;
    task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
    await this.saveTasks(tasks);
  },

  async addThought(text) {
    const thoughts = await this.getThoughts();
    const thought  = { id: genId(), text, createdAt: Date.now(), date: todayString() };
    thoughts.unshift(thought);
    await this.saveThoughts(thoughts);
    return thought;
  },

  async deleteThought(id) {
    await this.saveThoughts((await this.getThoughts()).filter(t => t.id !== id));
  },

  async clearThoughts() { await this.saveThoughts([]); },
  async clearTasks()    { await this.saveTasks([]); await this.saveAchievements([]); },
};

// ============================================================
// DailyReset
// ============================================================

const DailyReset = {
  async run() {
    const today = todayString();
    if (await Store.getLastReset() === today) return;
    const tasks = await Store.getTasks();
    await Store.saveTasks(tasks.map(t => (t.type === 'daily' && t.completed) ? { ...t, completed: false } : t));
    await Store.setLastReset(today);
  },
};

// ============================================================
// SwipeHandler
// ============================================================

class SwipeHandler {
  constructor(containerEl, itemSel, contentSel, actionsSel) {
    this.container  = containerEl;
    this.itemSel    = itemSel;
    this.contentSel = contentSel;
    this.actionsSel = actionsSel;
    this.startX = 0; this.startY = 0;
    this.currentItem = null; this.active = false; this.dirLocked = null;
    this.THRESHOLD = 80; this.ACTION_WIDTH = 128;
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
    this.startX = e.touches[0].clientX; this.startY = e.touches[0].clientY;
    this.active = true; this.dirLocked = null;
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
    const delta  = Math.max(-this.ACTION_WIDTH, Math.min(0, dx + (swiped ? -this.ACTION_WIDTH : 0)));
    const c = this.currentItem.querySelector(this.contentSel);
    const a = this.currentItem.querySelector(this.actionsSel);
    if (c) { c.style.transition = 'none'; c.style.transform = `translateX(${delta}px)`; }
    if (a) { a.style.transition = 'none'; a.style.transform = `translateX(${100 + (delta / this.ACTION_WIDTH) * 100}%)`; }
  }

  _end(e) {
    if (!this.active || !this.currentItem) return;
    const dx     = e.changedTouches[0].clientX - this.startX;
    const swiped = this.currentItem.classList.contains('swiped');
    const c = this.currentItem.querySelector(this.contentSel);
    const a = this.currentItem.querySelector(this.actionsSel);
    if (c) c.style.transition = '';
    if (a) a.style.transition = '';
    if (!swiped && dx < -this.THRESHOLD)        this._open(this.currentItem);
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
  constructor(containerEl, itemSel, cb) {
    this.container = containerEl; this.selector = itemSel; this.callback = cb;
    this._timer = null; this._sx = 0; this._sy = 0;
    this.attach();
  }

  attach() {
    this.container.addEventListener('touchstart', e => {
      const item = e.target.closest(this.selector);
      if (!item) return;
      this._sx = e.touches[0].clientX; this._sy = e.touches[0].clientY;
      this._timer = setTimeout(() => { haptic('medium'); this.callback(item, e.touches[0].clientX, e.touches[0].clientY); }, 500);
    }, { passive: true });
    this.container.addEventListener('touchmove', e => {
      if (this._timer && (Math.abs(e.touches[0].clientX - this._sx) > 10 || Math.abs(e.touches[0].clientY - this._sy) > 10))
        { clearTimeout(this._timer); this._timer = null; }
    }, { passive: true });
    this.container.addEventListener('touchend', () => { clearTimeout(this._timer); this._timer = null; }, { passive: true });
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
    const cleanup = () => { this.hide(); document.removeEventListener('touchstart', onOut); };
    const onOut = e => { if (!this.el.contains(e.target)) cleanup(); };
    this.editBtn.onclick   = () => { cleanup(); onEdit(); };
    this.deleteBtn.onclick = () => { cleanup(); onDelete(); };
    setTimeout(() => document.addEventListener('touchstart', onOut, { passive: true }), 50);
  },

  hide() { this.el.style.display = 'none'; this.editBtn.onclick = null; this.deleteBtn.onclick = null; },
};

// ============================================================
// Modal
// ============================================================

const Modal = {
  overlay:       document.getElementById('modalOverlay'),
  titleEl:       document.getElementById('modalTitle'),
  inputEl:       document.getElementById('modalInput'),
  typeToggle:    document.getElementById('typeToggle'),
  daysPicker:    document.getElementById('daysPicker'),
  daysRow:       document.getElementById('daysRow'),
  deadlineInput: document.getElementById('deadlineInput'),
  saveBtn:       document.getElementById('modalSave'),
  cancelBtn:     document.getElementById('modalCancel'),
  _onSave: null, _isOpen: false,
  _selectedType: 'daily', _selectedDays: [],

  init() {
    this._buildDaysRow();
    this.cancelBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('touchstart', e => { if (e.target === this.overlay) this.close(); }, { passive: true });

    this.typeToggle.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.typeToggle.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._selectedType = btn.dataset.type;
        this.daysPicker.style.display = this._selectedType === 'daily' ? 'flex' : 'none';
      });
    });

    this.saveBtn.addEventListener('click', () => {
      const val = this.inputEl.value.trim();
      if (!val) { this.inputEl.focus(); return; }
      this._syncDays();
      const deadline = this.deadlineInput.value
        ? new Date(this.deadlineInput.value).getTime()
        : null;
      if (this._onSave) this._onSave(val, this._selectedType, this._selectedDays, deadline);
      this.close();
    });

    this.inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') this.saveBtn.click(); });
    window.Telegram?.WebApp?.BackButton?.onClick?.(() => { if (this._isOpen) { this.close(); window.Telegram.WebApp.BackButton.hide(); } });
  },

  _buildDaysRow() {
    this.daysRow.innerHTML = '';
    I18n.t('days').forEach((name, i) => {
      const btn = document.createElement('button');
      btn.className = 'day-btn active';
      btn.dataset.day = String(i);
      btn.textContent = name;
      btn.addEventListener('click', () => { btn.classList.toggle('active'); haptic('light'); this._syncDays(); });
      this.daysRow.appendChild(btn);
    });
  },

  rebuildDaysRow() { this._buildDaysRow(); },

  _syncDays() {
    const active = [...this.daysRow.querySelectorAll('.day-btn.active')].map(b => parseInt(b.dataset.day));
    this._selectedDays = active.length === 7 ? [] : active;
  },

  _setDaysUI(days) {
    const all = days.length === 0;
    this.daysRow.querySelectorAll('.day-btn').forEach(btn => {
      btn.classList.toggle('active', all || days.includes(parseInt(btn.dataset.day)));
    });
    this._selectedDays = days;
  },

  open({ title = '', value = '', type = 'daily', days = [], deadline = null, showTypeToggle = true, onSave }) {
    this.titleEl.textContent  = title || I18n.t('newTask');
    this.inputEl.value        = value;
    this.inputEl.placeholder  = I18n.t('newTask');
    this._selectedType        = type;
    this._onSave              = onSave;
    this._isOpen              = true;
    this.typeToggle.style.display  = showTypeToggle ? 'flex' : 'none';
    this.typeToggle.querySelectorAll('.type-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.type === type));
    this.daysPicker.style.display  = showTypeToggle && type === 'daily' ? 'flex' : 'none';
    this._setDaysUI(days);

    // Set deadline input
    if (deadline) {
      const d = new Date(deadline);
      const pad = n => String(n).padStart(2, '0');
      this.deadlineInput.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } else {
      this.deadlineInput.value = '';
    }

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
};

// ============================================================
// Toast
// ============================================================

const Toast = {
  container: document.getElementById('toastContainer'),

  show(message, type = 'warning', duration = 5000) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <span class="toast-text">${escapeHtml(message)}</span>
      <button class="toast-close">✕</button>`;
    el.querySelector('.toast-close').addEventListener('click', () => this._dismiss(el));
    this.container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast-visible'));
    if (duration > 0) setTimeout(() => this._dismiss(el), duration);
  },

  _dismiss(el) {
    el.classList.remove('toast-visible');
    setTimeout(() => el.remove(), 300);
  },
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
  listEl:   document.getElementById('taskList'),
  emptyEl:  document.getElementById('emptyTasks'),
  expanded: new Set(), // task IDs with expanded subtasks

  init() {
    new SwipeHandler(this.listEl, '.task-item', '.task-content', '.task-actions').attach();
    new LongPressHandler(this.listEl, '.task-item', async (item, x, y) => {
      const task = (await Store.getTasks()).find(t => t.id === item.dataset.id);
      if (!task) return;
      ContextMenu.show(x, y, () => this._openEdit(task), async () => { await Store.deleteTask(task.id); this.render(); });
    });
  },

  async render() {
    const tasks = await Store.getTasks();
    this.listEl.innerHTML = '';

    if (!tasks.length) { this.emptyEl.style.display = 'flex'; await Progress.update(); return; }
    this.emptyEl.style.display = 'none';

    this.listEl.appendChild(this._clearBar(I18n.t('confirmClearTasks'), async () => {
      haptic('medium');
      await Store.clearTasks();
      this.render();
      UIAchievements.render();
    }));

    const dailyActive   = tasks.filter(t => t.type === 'daily' && isTaskActiveToday(t));
    const dailyInactive = tasks.filter(t => t.type === 'daily' && !isTaskActiveToday(t));
    const onetime       = tasks.filter(t => t.type === 'onetime');

    if (dailyActive.length)   { this.listEl.appendChild(this._header(I18n.t('sectionDaily'), dailyActive.length)); dailyActive.forEach(t => this.listEl.appendChild(this._taskEl(t))); }
    if (dailyInactive.length) { this.listEl.appendChild(this._header(I18n.t('sectionNotToday'), dailyInactive.length)); dailyInactive.forEach(t => this.listEl.appendChild(this._taskEl(t, true))); }
    if (onetime.length)       { this.listEl.appendChild(this._header(I18n.t('sectionOnetime'), onetime.length)); onetime.forEach(t => this.listEl.appendChild(this._taskEl(t))); }

    await Progress.update();
  },

  _clearBar(confirmMsg, onConfirm) {
    const bar = document.createElement('div');
    bar.className = 'clear-all-bar';
    const btn = document.createElement('button');
    btn.className = 'clear-all-btn';
    btn.textContent = I18n.t('clearAll');
    btn.addEventListener('click', () => { if (confirm(confirmMsg)) onConfirm(); });
    bar.appendChild(btn);
    return bar;
  },

  _header(label, count) {
    const el = document.createElement('div');
    el.className = 'section-header';
    el.innerHTML = `<span class="section-title">${label}</span><span class="section-count">${count}</span>`;
    return el;
  },

  _taskEl(task, inactive = false) {
    const el = document.createElement('div');
    el.className = 'task-item' + (inactive ? ' inactive-today' : '');
    el.dataset.id = task.id;

    const days     = I18n.t('days');
    const todayIdx = todayDayIndex();
    let daysHtml   = '';
    if (task.type === 'daily' && task.days?.length && task.days.length < 7) {
      const dots = days.map((name, i) => {
        const cls     = task.days.includes(i) ? 'active-day' : 'inactive-day';
        const outline = i === todayIdx ? 'style="outline:2px solid currentColor;outline-offset:1px;"' : '';
        return `<span class="task-day-dot ${cls}" ${outline}>${name}</span>`;
      }).join('');
      daysHtml = `<div class="task-days">${dots}</div>`;
    }

    // Deadline bar
    let deadlineBarHtml  = '';
    let deadlineChipHtml = '';
    if (task.deadline && !task.completed) {
      const { pct, color, label } = deadlineProgress(task);
      deadlineBarHtml  = `<div class="deadline-bar"><div class="deadline-bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
      deadlineChipHtml = `<span class="deadline-chip" style="color:${color}">${escapeHtml(label)}</span>`;
    }

    // Subtask progress badge
    const subs     = task.subtasks || [];
    const subDone  = subs.filter(s => s.completed).length;
    const subBadge = subs.length
      ? `<span class="subtask-badge">${subDone}/${subs.length}</span>`
      : '';

    // Expand button (only if has subtasks or always show to allow adding)
    const isExpanded = this.expanded.has(task.id);
    const expandIcon = isExpanded ? '▲' : '▼';

    el.innerHTML = `
      <div class="task-content">
        <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
        <div class="task-body">
          <span class="task-text ${task.completed ? 'completed' : ''}">${escapeHtml(task.title)}</span>
          ${daysHtml}
          ${deadlineChipHtml}
        </div>
        <div class="task-meta">
          ${subBadge}
          <button class="task-expand-btn" data-action="expand" title="subtasks">${expandIcon}</button>
        </div>
        <div class="task-hover-btns">
          <button class="task-hover-btn" data-action="edit" title="${I18n.t('ctxEdit')}">✏️</button>
          <button class="task-hover-btn is-delete" data-action="delete" title="${I18n.t('ctxDelete')}">✕</button>
        </div>
      </div>
      ${deadlineBarHtml}
      <div class="task-actions">
        <button class="task-action-btn task-action-edit" data-action="edit">✏️</button>
        <button class="task-action-btn task-action-delete" data-action="delete">🗑️</button>
      </div>
      <div class="subtasks-panel${isExpanded ? ' expanded' : ''}" id="sub-${task.id}"></div>`;

    if (!inactive) {
      el.querySelector('.task-checkbox').addEventListener('click', async () => {
        haptic('light');
        if (task.completed) { await Store.uncompleteTask(task.id); hapticNotify('warning'); }
        else                { await Store.completeTask(task.id);   hapticNotify('success'); }
        this.render(); UIAchievements.render();
      });
      el.querySelector('.task-text').addEventListener('click', () => el.querySelector('.task-checkbox').click());
    }

    el.querySelectorAll('[data-action="edit"]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); this._openEdit(task); }));
    el.querySelectorAll('[data-action="delete"]').forEach(b => b.addEventListener('click', async e => { e.stopPropagation(); haptic('medium'); await Store.deleteTask(task.id); this.render(); }));

    // Expand/collapse subtasks
    el.querySelector('[data-action="expand"]').addEventListener('click', e => {
      e.stopPropagation();
      haptic('light');
      if (this.expanded.has(task.id)) this.expanded.delete(task.id);
      else this.expanded.add(task.id);
      this.render();
    });

    // Render subtasks panel
    this._renderSubtasks(el.querySelector(`#sub-${task.id}`), task);

    return el;
  },

  _renderSubtasks(panel, task) {
    const subs = task.subtasks || [];
    panel.innerHTML = '';

    subs.forEach(sub => {
      const row = document.createElement('div');
      row.className = 'subtask-row';
      row.innerHTML = `
        <div class="subtask-checkbox ${sub.completed ? 'checked' : ''}"></div>
        <span class="subtask-text ${sub.completed ? 'completed' : ''}">${escapeHtml(sub.title)}</span>
        <button class="subtask-delete" title="${I18n.t('ctxDelete')}">✕</button>`;
      row.querySelector('.subtask-checkbox').addEventListener('click', async () => {
        haptic('light');
        await Store.toggleSubtask(task.id, sub.id);
        this.render();
      });
      row.querySelector('.subtask-text').addEventListener('click', () => row.querySelector('.subtask-checkbox').click());
      row.querySelector('.subtask-delete').addEventListener('click', async e => {
        e.stopPropagation();
        haptic('medium');
        await Store.deleteSubtask(task.id, sub.id);
        this.render();
      });
      panel.appendChild(row);
    });

    // Add subtask input row
    const addRow = document.createElement('div');
    addRow.className = 'subtask-add-row';
    addRow.innerHTML = `
      <input class="subtask-input" type="text" placeholder="${I18n.t('subtaskPlaceholder')}" maxlength="80">
      <button class="subtask-add-btn">↑</button>`;

    const input   = addRow.querySelector('.subtask-input');
    const addBtn  = addRow.querySelector('.subtask-add-btn');

    const doAdd = async () => {
      const val = input.value.trim();
      if (!val) return;
      haptic('light');
      input.value = '';
      this.expanded.add(task.id);
      await Store.addSubtask(task.id, val);
      this.render();
    };

    addBtn.addEventListener('click', doAdd);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
    panel.appendChild(addRow);
  },

  _openEdit(task) {
    Modal.open({
      title: I18n.t('editTask'), value: task.title, type: task.type,
      days: task.days || [], deadline: task.deadline || null, showTypeToggle: true,
      onSave: async (title, type, days, deadline) => {
        await Store.updateTask(task.id, { title, type, days, deadline });
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
      <div class="stat-item"><div class="stat-number">${ach.filter(a => a.completedDate === today).length}</div><div class="stat-label">${I18n.t('statToday')}</div></div>
      <div class="stat-divider"></div>
      <div class="stat-item"><div class="stat-number">${ach.length}</div><div class="stat-label">${I18n.t('statTotal')}</div></div>`;
    this.listEl.appendChild(stats);

    const groups = {};
    ach.forEach(a => { if (!groups[a.completedDate]) groups[a.completedDate] = []; groups[a.completedDate].push(a); });

    Object.entries(groups).forEach(([date, items], gi) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'achievements-date-group';
      groupEl.innerHTML = `<div class="achievements-date-label">${formatDateLabel(date)}</div>`;
      items.forEach((a, i) => {
        const card = document.createElement('div');
        card.className = 'achievement-card';
        card.style.animationDelay = `${(gi * 3 + i) * 0.04}s`;
        card.innerHTML = `
          <div class="achievement-icon">⭐</div>
          <div class="achievement-info">
            <div class="achievement-title">${escapeHtml(a.title)}</div>
            <div class="achievement-meta">${I18n.t('label' + a.type.charAt(0).toUpperCase() + a.type.slice(1)) || a.type} · ${formatTime(a.completedAt)}</div>
          </div>
          <div class="achievement-check">✓</div>`;
        groupEl.appendChild(card);
      });
      this.listEl.appendChild(groupEl);
    });
  },
};

// ============================================================
// UI.Thoughts
// ============================================================

const UIThoughts = {
  listEl:   document.getElementById('thoughtsList'),
  emptyEl:  document.getElementById('emptyThoughts'),
  inputBar: document.getElementById('thoughtsInputBar'),
  textarea: document.getElementById('thoughtInput'),
  sendBtn:  document.getElementById('thoughtSendBtn'),

  init() {
    this.textarea.addEventListener('input', () => {
      this.textarea.style.height = 'auto';
      this.textarea.style.height = Math.min(this.textarea.scrollHeight, 120) + 'px';
      this.sendBtn.disabled = !this.textarea.value.trim();
    });

    this.sendBtn.addEventListener('click', () => this._send());
    this.textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._send(); }
    });

    new LongPressHandler(this.listEl, '.thought-card', async (item) => {
      if (!confirm(I18n.t('confirmDeleteThought'))) return;
      haptic('medium');
      await Store.deleteThought(item.dataset.id);
      this.render();
    });
  },

  async _send() {
    const text = this.textarea.value.trim();
    if (!text) return;
    haptic('light');
    this.textarea.value = '';
    this.textarea.style.height = 'auto';
    this.sendBtn.disabled = true;
    await Store.addThought(text);
    hapticNotify('success');
    this.render();
  },

  async render() {
    const thoughts = await Store.getThoughts();
    this.listEl.innerHTML = '';

    if (!thoughts.length) { this.emptyEl.style.display = 'flex'; return; }
    this.emptyEl.style.display = 'none';

    const clearBar = document.createElement('div');
    clearBar.className = 'clear-all-bar';
    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-all-btn';
    clearBtn.textContent = I18n.t('clearAll');
    clearBtn.addEventListener('click', () => {
      if (confirm(I18n.t('confirmClearThoughts'))) { haptic('medium'); Store.clearThoughts().then(() => this.render()); }
    });
    clearBar.appendChild(clearBtn);
    this.listEl.appendChild(clearBar);

    const groups = {};
    thoughts.forEach(t => { if (!groups[t.date]) groups[t.date] = []; groups[t.date].push(t); });

    Object.entries(groups).forEach(([date, items]) => {
      const divider = document.createElement('div');
      divider.className = 'thought-date-divider';
      divider.innerHTML = `<span class="thought-date-divider-label">${formatDateLabel(date)}</span>`;
      this.listEl.appendChild(divider);

      items.forEach((thought, i) => {
        const card = document.createElement('div');
        card.className = 'thought-card';
        card.dataset.id = thought.id;
        card.style.animationDelay = `${i * 0.04}s`;
        card.innerHTML = `
          <div class="thought-meta">
            <span class="thought-time">${formatTime(thought.createdAt)}</span>
            <button class="thought-delete-btn" title="${I18n.t('ctxDelete')}">✕</button>
          </div>
          <div class="thought-text">${escapeHtml(thought.text)}</div>`;

        card.addEventListener('click', e => {
          if (e.target.classList.contains('thought-delete-btn')) return;
          card.classList.toggle('show-delete');
        });

        card.querySelector('.thought-delete-btn').addEventListener('click', async e => {
          e.stopPropagation();
          haptic('medium');
          card.style.opacity    = '0';
          card.style.transform  = 'scale(0.95)';
          card.style.transition = 'all 0.2s ease';
          setTimeout(async () => { await Store.deleteThought(thought.id); this.render(); }, 200);
        });

        this.listEl.appendChild(card);
      });
    });
  },

  show() { this.inputBar.classList.add('visible'); },
  hide() { this.inputBar.classList.remove('visible'); },
};

// ============================================================
// LangSwitcher
// ============================================================

const LangSwitcher = {
  btn: document.getElementById('langBtn'),

  init() {
    this.btn.addEventListener('click', async () => {
      haptic('light');
      const next = I18n.current === 'ru' ? 'en' : 'ru';
      I18n.set(next);
      await Store.setLang(next);
      Modal.rebuildDaysRow();
      const tab = UITabs.currentTab;
      if (tab === 'tasks')        await UITasks.render();
      if (tab === 'achievements') await UIAchievements.render();
      if (tab === 'thoughts')     await UIThoughts.render();
    });
  },
};

// ============================================================
// UI.Tabs
// ============================================================

const UITabs = {
  currentTab: 'tasks',
  panels: {
    tasks:        document.getElementById('tab-tasks'),
    achievements: document.getElementById('tab-achievements'),
    thoughts:     document.getElementById('tab-thoughts'),
  },

  init() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => { haptic('light'); this.switchTo(btn.dataset.tab); });
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

    document.getElementById('fabBtn').style.display = (tab === 'achievements' || tab === 'thoughts') ? 'none' : '';
    tab === 'thoughts' ? UIThoughts.show() : UIThoughts.hide();

    if (tab === 'tasks')        await UITasks.render();
    if (tab === 'achievements') await UIAchievements.render();
    if (tab === 'thoughts')     await UIThoughts.render();
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
      Modal.open({
        title: I18n.t('newTask'), showTypeToggle: true,
        onSave: async (title, type, days, deadline) => {
          await Store.addTask(title, type, days, deadline);
          UITasks.render();
        },
      });
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
    tg.ready(); tg.expand(); tg.enableClosingConfirmation?.();
    tg.setHeaderColor?.(tg.themeParams?.secondary_bg_color || '#f4f4f5');
    tg.setBackgroundColor?.(tg.themeParams?.bg_color || '#ffffff');
  },
};

// ============================================================
// App
// ============================================================

const App = {
  async init() {
    document.body.style.opacity = '0';

    TelegramInit.init();

    const savedLang = await Store.getLang();
    if (savedLang === 'en' || savedLang === 'ru') I18n.current = savedLang;
    I18n.set(I18n.current);

    await DailyReset.run();

    Modal.init();
    UITabs.init();
    UITasks.init();
    UIThoughts.init();
    FAB.init();
    LangSwitcher.init();

    await UITasks.render();

    document.body.style.transition = 'opacity 0.25s ease';
    document.body.style.opacity    = '1';
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
