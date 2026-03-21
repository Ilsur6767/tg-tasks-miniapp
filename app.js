/* ============================================================
   TELEGRAM MINI APP — Трекер задач
   Vanilla JS, без зависимостей, localStorage
   ============================================================ */

'use strict';

// ============================================================
// Config
// ============================================================

const Config = {
  KEYS: {
    TASKS:        'tma_tasks',
    MINI_TASKS:   'tma_mini_tasks',
    ACHIEVEMENTS: 'tma_achievements',
    LAST_RESET:   'tma_last_reset',
  },
  ICONS: {
    daily:   '🔄',
    onetime: '📌',
    mini:    '⚡',
  },
  LABELS: {
    daily:   'Ежедневная',
    onetime: 'Разовая',
    mini:    'Мини',
  },
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

// 0=Пн, 1=Вт, ... 6=Вс (JS Date.getDay: 0=Вс, 1=Пн...)
function todayDayIndex() {
  const jsDay = new Date().getDay(); // 0=Вс
  return jsDay === 0 ? 6 : jsDay - 1;
}

// Активна ли задача сегодня (по дням недели)
// days=[] или days=undefined → всегда активна
function isTaskActiveToday(task) {
  if (!task.days || task.days.length === 0) return true;
  return task.days.includes(todayDayIndex());
}

function formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatDateLabel(dateStr) {
  const today   = todayString();
  const yesterday = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
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
// Store — CRUD операции с localStorage
// ============================================================

const Store = {
  // --- Tasks ---
  getTasks() {
    try { return JSON.parse(localStorage.getItem(Config.KEYS.TASKS) || '[]'); }
    catch { return []; }
  },
  saveTasks(arr) {
    localStorage.setItem(Config.KEYS.TASKS, JSON.stringify(arr));
  },
  addTask(title, type, days = []) {
    const tasks = this.getTasks();
    const task = { id: genId(), title, type, completed: false, createdAt: Date.now(), days };
    tasks.unshift(task);
    this.saveTasks(tasks);
    return task;
  },
  updateTask(id, changes) {
    const tasks = this.getTasks().map(t => t.id === id ? { ...t, ...changes } : t);
    this.saveTasks(tasks);
  },
  deleteTask(id) {
    this.saveTasks(this.getTasks().filter(t => t.id !== id));
  },
  completeTask(id) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const now = Date.now();
    // Добавить в достижения
    const achievements = this.getAchievements();
    achievements.unshift({
      id: genId(),
      taskId: id,
      title: task.title,
      type: task.type,
      completedAt: now,
      completedDate: todayString(),
    });
    this.saveAchievements(achievements);
    // Отметить в tasks
    this.updateTask(id, { completed: true });
  },
  uncompleteTask(id) {
    this.updateTask(id, { completed: false });
    // Удалить из достижений (последнее совпадение)
    const achievements = this.getAchievements();
    const idx = achievements.findLastIndex?.(a => a.taskId === id) ??
                [...achievements].reverse().findIndex(a => a.taskId === id);
    if (idx >= 0) {
      achievements.splice(achievements.length - 1 - idx, 1);
      this.saveAchievements(achievements);
    }
  },

  // --- Mini Tasks ---
  getMiniTasks() {
    try { return JSON.parse(localStorage.getItem(Config.KEYS.MINI_TASKS) || '[]'); }
    catch { return []; }
  },
  saveMiniTasks(arr) {
    localStorage.setItem(Config.KEYS.MINI_TASKS, JSON.stringify(arr));
  },
  addMiniTask(title) {
    const tasks = this.getMiniTasks();
    const task = { id: genId(), title, completed: false, createdAt: Date.now() };
    tasks.unshift(task);
    this.saveMiniTasks(tasks);
    return task;
  },
  updateMiniTask(id, changes) {
    this.saveMiniTasks(this.getMiniTasks().map(t => t.id === id ? { ...t, ...changes } : t));
  },
  deleteMiniTask(id) {
    this.saveMiniTasks(this.getMiniTasks().filter(t => t.id !== id));
  },
  completeMiniTask(id) {
    const tasks = this.getMiniTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const achievements = this.getAchievements();
    achievements.unshift({
      id: genId(),
      taskId: id,
      title: task.title,
      type: 'mini',
      completedAt: Date.now(),
      completedDate: todayString(),
    });
    this.saveAchievements(achievements);
    this.updateMiniTask(id, { completed: true });
  },

  // --- Achievements ---
  getAchievements() {
    try { return JSON.parse(localStorage.getItem(Config.KEYS.ACHIEVEMENTS) || '[]'); }
    catch { return []; }
  },
  saveAchievements(arr) {
    localStorage.setItem(Config.KEYS.ACHIEVEMENTS, JSON.stringify(arr));
  },

  // --- Daily Reset ---
  getLastReset() {
    return localStorage.getItem(Config.KEYS.LAST_RESET) || '';
  },
  setLastReset(dateStr) {
    localStorage.setItem(Config.KEYS.LAST_RESET, dateStr);
  },
};

// ============================================================
// DailyReset — сброс ежедневных задач при новом дне
// ============================================================

const DailyReset = {
  run() {
    const today   = todayString();
    const lastDay = Store.getLastReset();
    if (lastDay === today) return;

    const tasks = Store.getTasks().map(t => {
      if (t.type === 'daily' && t.completed) {
        return { ...t, completed: false };
      }
      return t;
    });
    Store.saveTasks(tasks);
    Store.setLastReset(today);
  },
};

// ============================================================
// SwipeHandler — свайп влево на элементе
// ============================================================

class SwipeHandler {
  constructor(containerEl, itemSelector, contentSelector, actionsSelector) {
    this.container      = containerEl;
    this.itemSelector   = itemSelector;
    this.contentSel     = contentSelector;
    this.actionsSel     = actionsSelector;
    this.startX = 0;
    this.startY = 0;
    this.currentItem = null;
    this.THRESHOLD = 80;
    this.ACTION_WIDTH = 128;
    this._boundStart = this._start.bind(this);
    this._boundMove  = this._move.bind(this);
    this._boundEnd   = this._end.bind(this);
    this.active = false;
    this.directionLocked = null;
  }

  attach() {
    this.container.addEventListener('touchstart', this._boundStart, { passive: true });
    this.container.addEventListener('touchmove',  this._boundMove,  { passive: false });
    this.container.addEventListener('touchend',   this._boundEnd,   { passive: true });
    // Закрыть открытые свайпы при клике на документ
    document.addEventListener('touchstart', (e) => {
      const item = e.target.closest(this.itemSelector);
      if (!item) this._closeAll();
    }, { passive: true });
  }

  _findItem(target) {
    return target.closest(this.itemSelector);
  }

  _start(e) {
    const item = this._findItem(e.target);
    if (!item) return;
    this.currentItem    = item;
    this.startX         = e.touches[0].clientX;
    this.startY         = e.touches[0].clientY;
    this.active         = true;
    this.directionLocked = null;
  }

  _move(e) {
    if (!this.active || !this.currentItem) return;
    const dx = e.touches[0].clientX - this.startX;
    const dy = e.touches[0].clientY - this.startY;

    // Определить направление после 8px движения
    if (!this.directionLocked && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      this.directionLocked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    if (this.directionLocked === 'v') return; // вертикальный скролл — не мешаем
    if (this.directionLocked !== 'h') return;

    e.preventDefault();
    const isSwiped = this.currentItem.classList.contains('swiped');
    const offset   = isSwiped ? -this.ACTION_WIDTH : 0;
    const delta    = Math.max(-this.ACTION_WIDTH, Math.min(0, dx + offset));

    const content  = this.currentItem.querySelector(this.contentSel);
    const actions  = this.currentItem.querySelector(this.actionsSel);
    if (content) content.style.transition = 'none';
    if (actions) actions.style.transition = 'none';
    if (content) content.style.transform  = `translateX(${delta}px)`;
    if (actions) actions.style.transform  = `translateX(${100 + (delta / this.ACTION_WIDTH) * 100}%)`;
  }

  _end(e) {
    if (!this.active || !this.currentItem) return;
    const dx = e.changedTouches[0].clientX - this.startX;
    const isSwiped = this.currentItem.classList.contains('swiped');

    const content = this.currentItem.querySelector(this.contentSel);
    const actions = this.currentItem.querySelector(this.actionsSel);
    if (content) content.style.transition = '';
    if (actions) actions.style.transition = '';

    if (!isSwiped && dx < -this.THRESHOLD) {
      this._open(this.currentItem);
    } else if (isSwiped && dx > this.THRESHOLD / 2) {
      this._close(this.currentItem);
    } else {
      // Вернуть в текущее состояние
      if (isSwiped) this._open(this.currentItem);
      else          this._close(this.currentItem);
    }

    this.active = false;
    this.currentItem = null;
    this.directionLocked = null;
  }

  _open(item) {
    this._closeAll();
    item.classList.add('swiped');
    const content = item.querySelector(this.contentSel);
    const actions = item.querySelector(this.actionsSel);
    if (content) content.style.transform = '';
    if (actions) actions.style.transform = '';
  }

  _close(item) {
    item.classList.remove('swiped');
    const content = item.querySelector(this.contentSel);
    const actions = item.querySelector(this.actionsSel);
    if (content) content.style.transform = '';
    if (actions) actions.style.transform = '';
  }

  _closeAll() {
    this.container.querySelectorAll(this.itemSelector + '.swiped').forEach(el => {
      this._close(el);
    });
  }
}

// ============================================================
// LongPress — контекстное меню по долгому нажатию
// ============================================================

class LongPressHandler {
  constructor(containerEl, itemSelector, onLongPress) {
    this.container  = containerEl;
    this.selector   = itemSelector;
    this.callback   = onLongPress;
    this._timer     = null;
    this._startX    = 0;
    this._startY    = 0;
    this.attach();
  }

  attach() {
    this.container.addEventListener('touchstart', (e) => {
      const item = e.target.closest(this.selector);
      if (!item) return;
      this._startX = e.touches[0].clientX;
      this._startY = e.touches[0].clientY;
      this._timer  = setTimeout(() => {
        haptic('medium');
        this.callback(item, e.touches[0].clientX, e.touches[0].clientY);
      }, 500);
    }, { passive: true });

    this.container.addEventListener('touchmove', (e) => {
      if (!this._timer) return;
      const dx = Math.abs(e.touches[0].clientX - this._startX);
      const dy = Math.abs(e.touches[0].clientY - this._startY);
      if (dx > 10 || dy > 10) {
        clearTimeout(this._timer);
        this._timer = null;
      }
    }, { passive: true });

    this.container.addEventListener('touchend', () => {
      clearTimeout(this._timer);
      this._timer = null;
    }, { passive: true });
  }
}

// ============================================================
// ContextMenu
// ============================================================

const ContextMenu = {
  el:     document.getElementById('contextMenu'),
  editBtn:   document.getElementById('ctxEdit'),
  deleteBtn: document.getElementById('ctxDelete'),
  _overlay: null,

  show(x, y, onEdit, onDelete) {
    // Убедиться что меню в видимой зоне
    const W = window.innerWidth;
    const H = window.innerHeight;
    const mW = 180, mH = 96;
    const left = Math.min(x, W - mW - 8);
    const top  = Math.min(y, H - mH - 8);

    this.el.style.left    = left + 'px';
    this.el.style.top     = top  + 'px';
    this.el.style.display = 'block';

    // Одноразовые обработчики
    const cleanup = () => {
      this.hide();
      document.removeEventListener('touchstart', onOutside);
    };
    const onOutside = (e) => {
      if (!this.el.contains(e.target)) cleanup();
    };

    this.editBtn.onclick = () => { cleanup(); onEdit(); };
    this.deleteBtn.onclick = () => { cleanup(); onDelete(); };
    setTimeout(() => document.addEventListener('touchstart', onOutside, { passive: true }), 50);
  },

  hide() {
    this.el.style.display = 'none';
    this.editBtn.onclick   = null;
    this.deleteBtn.onclick = null;
  },
};

// ============================================================
// Modal
// ============================================================

const Modal = {
  overlay:     document.getElementById('modalOverlay'),
  titleEl:     document.getElementById('modalTitle'),
  inputEl:     document.getElementById('modalInput'),
  typeToggle:  document.getElementById('typeToggle'),
  daysPicker:  document.getElementById('daysPicker'),
  saveBtn:     document.getElementById('modalSave'),
  cancelBtn:   document.getElementById('modalCancel'),
  _onSave:       null,
  _isOpen:       false,
  _selectedType: 'daily',
  _selectedDays: [], // [] = все дни

  init() {
    this.cancelBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('touchstart', (e) => {
      if (e.target === this.overlay) this.close();
    }, { passive: true });

    // Переключатель типа
    this.typeToggle.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.typeToggle.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._selectedType = btn.dataset.type;
        // Показать/скрыть days picker
        this.daysPicker.style.display = this._selectedType === 'daily' ? 'flex' : 'none';
      });
    });

    // Кнопки дней недели
    this.daysPicker.querySelectorAll('.day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        haptic('light');
        this._syncDaysFromUI();
      });
    });

    this.saveBtn.addEventListener('click', () => {
      const val = this.inputEl.value.trim();
      if (!val) { this.inputEl.focus(); return; }
      this._syncDaysFromUI();
      if (this._onSave) this._onSave(val, this._selectedType, this._selectedDays);
      this.close();
    });

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.saveBtn.click();
    });

    window.Telegram?.WebApp?.BackButton?.onClick?.(() => {
      if (this._isOpen) {
        this.close();
        window.Telegram.WebApp.BackButton.hide();
      }
    });
  },

  // Считать выбранные дни из UI кнопок
  _syncDaysFromUI() {
    const active = [...this.daysPicker.querySelectorAll('.day-btn.active')]
      .map(b => parseInt(b.dataset.day));
    // Все 7 = пустой массив (каждый день)
    this._selectedDays = active.length === 7 ? [] : active;
  },

  // Установить дни в UI кнопки
  _setDaysUI(days) {
    const allDays = days.length === 0; // пустой = все активны
    this.daysPicker.querySelectorAll('.day-btn').forEach(btn => {
      const d = parseInt(btn.dataset.day);
      btn.classList.toggle('active', allDays || days.includes(d));
    });
    this._selectedDays = days;
  },

  open({ title = 'Новая задача', value = '', type = 'daily', days = [], showTypeToggle = true, onSave }) {
    this.titleEl.textContent = title;
    this.inputEl.value       = value;
    this._selectedType       = type;
    this._onSave             = onSave;
    this._isOpen             = true;

    // Тип переключатель
    this.typeToggle.style.display = showTypeToggle ? 'flex' : 'none';
    this.typeToggle.querySelectorAll('.type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });

    // Days picker — только для daily
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
// UI.Progress — прогресс-бар
// ============================================================

const Progress = {
  fillEl:  document.getElementById('progressFill'),
  statsEl: document.getElementById('progressStats'),

  update() {
    // Считаем только задачи, актуальные сегодня
    const tasks = Store.getTasks().filter(t => isTaskActiveToday(t));
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
// UI.Tasks — вкладка Задачи
// ============================================================

const UITasks = {
  listEl:   document.getElementById('taskList'),
  emptyEl:  document.getElementById('emptyTasks'),
  swiper:   null,

  init() {
    this.swiper = new SwipeHandler(
      this.listEl, '.task-item', '.task-content', '.task-actions'
    );
    this.swiper.attach();

    new LongPressHandler(this.listEl, '.task-item', (item, x, y) => {
      const id = item.dataset.id;
      const task = Store.getTasks().find(t => t.id === id);
      if (!task) return;
      ContextMenu.show(x, y,
        () => this._openEdit(task),
        () => this._confirmDelete(id)
      );
    });
  },

  render() {
    const tasks = Store.getTasks();
    this.listEl.innerHTML = '';

    if (!tasks.length) {
      this.emptyEl.style.display = 'flex';
      Progress.update();
      return;
    }
    this.emptyEl.style.display = 'none';

    // Ежедневные: сначала активные сегодня, потом неактивные
    const daily        = tasks.filter(t => t.type === 'daily');
    const dailyActive  = daily.filter(t => isTaskActiveToday(t));
    const dailyInactive = daily.filter(t => !isTaskActiveToday(t));
    const onetime      = tasks.filter(t => t.type === 'onetime');

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

    Progress.update();
  },

  _sectionHeader(label, count) {
    const el = document.createElement('div');
    el.className = 'section-header';
    el.innerHTML = `
      <span class="section-title">${label}</span>
      <span class="section-count">${count}</span>
    `;
    return el;
  },

  _taskEl(task, inactive = false) {
    const el = document.createElement('div');
    el.className = 'task-item' + (inactive ? ' inactive-today' : '');
    el.dataset.id = task.id;

    // Строка дней недели (только для ежедневных с выбранными днями)
    const DAY_NAMES = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    const todayIdx  = todayDayIndex();
    let daysHtml = '';
    if (task.type === 'daily' && task.days && task.days.length > 0 && task.days.length < 7) {
      const dots = DAY_NAMES.map((name, i) => {
        const cls = task.days.includes(i) ? 'active-day' : 'inactive-day';
        const isToday = i === todayIdx ? 'style="outline:2px solid currentColor;outline-offset:1px;"' : '';
        return `<span class="task-day-dot ${cls}" ${isToday}>${name}</span>`;
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
      </div>
    `;

    // Чекбокс (неактивные сегодня нельзя чекать)
    if (!inactive) el.querySelector('.task-checkbox').addEventListener('click', () => {
      haptic('light');
      if (task.completed) {
        Store.uncompleteTask(task.id);
        hapticNotify('warning');
      } else {
        el.classList.add('completing');
        Store.completeTask(task.id);
        hapticNotify('success');
      }
      this.render();
      UIAchievements.render();
    });

    // Текст — тоже клик для чекбокса
    el.querySelector('.task-text').addEventListener('click', () => {
      el.querySelector('.task-checkbox').click();
    });

    // Кнопки свайпа
    el.querySelector('[data-action="edit"]').addEventListener('click', () => {
      this._openEdit(task);
    });
    el.querySelector('[data-action="delete"]').addEventListener('click', () => {
      this._confirmDelete(task.id);
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
      onSave: (title, type, days) => {
        Store.updateTask(task.id, { title, type, days });
        this.render();
      },
    });
  },

  _confirmDelete(id) {
    haptic('medium');
    Store.deleteTask(id);
    this.render();
  },
};

// ============================================================
// UI.MiniTasks — вкладка Мини-задачи
// ============================================================

const UIMiniTasks = {
  listEl:  document.getElementById('miniTaskList'),
  emptyEl: document.getElementById('emptyMini'),

  init() {
    const swiper = new SwipeHandler(
      this.listEl, '.mini-item', '.mini-content', '.mini-actions'
    );
    swiper.attach();

    new LongPressHandler(this.listEl, '.mini-item', (item, x, y) => {
      const id = item.dataset.id;
      const task = Store.getMiniTasks().find(t => t.id === id);
      if (!task) return;
      ContextMenu.show(x, y,
        () => this._openEdit(task),
        () => { Store.deleteMiniTask(id); this.render(); }
      );
    });
  },

  render() {
    const tasks = Store.getMiniTasks();
    this.listEl.innerHTML = '';

    if (!tasks.length) {
      this.emptyEl.style.display = 'flex';
      return;
    }
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
      </div>
    `;

    el.querySelector('.mini-checkbox').addEventListener('click', () => {
      haptic('light');
      if (task.completed) {
        Store.updateMiniTask(task.id, { completed: false });
      } else {
        Store.completeMiniTask(task.id);
        hapticNotify('success');
      }
      this.render();
      UIAchievements.render();
    });

    el.querySelector('.mini-text').addEventListener('click', () => {
      el.querySelector('.mini-checkbox').click();
    });

    el.querySelector('[data-action="edit"]').addEventListener('click', () => {
      this._openEdit(task);
    });
    el.querySelector('[data-action="delete"]').addEventListener('click', () => {
      Store.deleteMiniTask(task.id);
      this.render();
    });

    return el;
  },

  _openEdit(task) {
    Modal.open({
      title: 'Редактировать мини-задачу',
      value: task.title,
      showTypeToggle: false,
      onSave: (title) => {
        Store.updateMiniTask(task.id, { title });
        this.render();
      },
    });
  },
};

// ============================================================
// UI.Settings — вкладка Настройки
// ============================================================

const UISettings = {
  showExportBtn: document.getElementById('showExportBtn'),
  pasteArea: document.getElementById('pasteArea'),
  loadBtn: document.getElementById('loadBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  importLabel: document.getElementById('importLabel'),
  clearBtn: document.getElementById('clearBtn'),
  storageCountEl: document.getElementById('storageCount'),
  lastResetEl: document.getElementById('lastResetInfo'),

  init() {
    // Show export code
    this.showExportBtn.addEventListener('click', () => {
      haptic('light');
      DataSync.showExport();
    });

    // Load from textarea
    this.loadBtn.addEventListener('click', () => {
      haptic('light');
      const text = this.pasteArea.value;
      DataSync.loadFromText(text);
    });

    // Export as JSON
    this.exportBtn.addEventListener('click', () => {
      haptic('light');
      DataSync.exportData();
    });

    // Import from JSON
    this.importInput.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        DataSync.importData(e.target.files[0]);
        e.target.value = '';
      }
    });

    // Clear all
    this.clearBtn.addEventListener('click', () => {
      haptic('medium');
      DataSync.clearAll();
    });
  },

  updateStorageInfo() {
    const totalItems = Store.getTasks().length + Store.getMiniTasks().length;
    this.storageCountEl.textContent = totalItems.toString();

    const lastReset = Store.getLastReset();
    if (lastReset && lastReset !== todayString()) {
      this.lastResetEl.textContent = formatDateLabel(lastReset);
    } else {
      this.lastResetEl.textContent = 'Today';
    }
  },
};

// ============================================================
// UI.Achievements — вкладка Достижения
// ============================================================

const UIAchievements = {
  listEl:  document.getElementById('achievementList'),
  emptyEl: document.getElementById('emptyAchievements'),

  render() {
    const achievements = Store.getAchievements();
    this.listEl.innerHTML = '';

    if (!achievements.length) {
      this.emptyEl.style.display = 'flex';
      return;
    }
    this.emptyEl.style.display = 'none';

    // Статистика
    const todayDate = todayString();
    const todayCount = achievements.filter(a => a.completedDate === todayDate).length;
    const statsEl = document.createElement('div');
    statsEl.className = 'achievements-stats';
    statsEl.innerHTML = `
      <div class="stat-item">
        <div class="stat-number">${todayCount}</div>
        <div class="stat-label">Сегодня</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-number">${achievements.length}</div>
        <div class="stat-label">Всего</div>
      </div>
    `;
    this.listEl.appendChild(statsEl);

    // Группировка по дате
    const groups = {};
    achievements.forEach(a => {
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
          <div class="achievement-check">✓</div>
        `;
        groupEl.appendChild(card);
      });

      this.listEl.appendChild(groupEl);
    });
  },
};

// ============================================================
// UI.Tabs — переключение вкладок
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
        const tab = btn.dataset.tab;
        this.switchTo(tab);
        haptic('light');
      });
    });
  },

  switchTo(tab) {
    if (this.currentTab === tab) return;
    this.currentTab = tab;

    // Панели
    Object.entries(this.panels).forEach(([key, el]) => {
      el.classList.toggle('active', key === tab);
    });

    // Кнопки навигации
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Показать/скрыть header с прогресс-баром (только на вкладке задач)
    const header = document.getElementById('appHeader');
    header.style.display = tab === 'tasks' ? '' : 'none';

    const main = document.querySelector('.main-content');
    main.style.top = tab === 'tasks' ? 'var(--header-height)' : '0';

    // Перерисовать активную вкладку
    if (tab === 'tasks')        UITasks.render();
    if (tab === 'mini')         UIMiniTasks.render();
    if (tab === 'achievements') UIAchievements.render();
    if (tab === 'settings')     UISettings.updateStorageInfo();
  },
};

// ============================================================
// DataSync — экспорт/импорт
// ============================================================

const DataSync = {
  // Кодировать данные в Base64
  _encode(data) {
    const json = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(json)));
  },

  // Декодировать данные из Base64
  _decode(encoded) {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  },

  // Показать экспортированные данные в поле для копирования
  showExport() {
    const data = {
      v: '1',
      tasks: Store.getTasks(),
      mini: Store.getMiniTasks(),
      ach: Store.getAchievements(),
    };
    const encoded = this._encode(data);

    const exportArea = document.getElementById('exportArea');
    const exportHint = document.getElementById('exportHint');

    exportArea.value = encoded;
    exportArea.style.display = 'block';
    exportHint.textContent = '👆 Select all text (Ctrl+A or Cmd+A) and copy (Ctrl+C or Cmd+C)';

    // Auto-select after short delay so user can see it
    setTimeout(() => {
      exportArea.select();
    }, 200);

    haptic('light');
  },

  // Загрузить из текстового поля
  async loadFromText(text) {
    try {
      const trimmed = text.trim();
      if (!trimmed) {
        alert('❌ Paste data first');
        return;
      }

      const data = this._decode(trimmed);

      if (!data.tasks || !data.mini || !data.ach) {
        alert('❌ Invalid data format');
        return;
      }

      if (!confirm('⚠️ Replace all current data?')) {
        return;
      }

      Store.saveTasks(data.tasks);
      Store.saveMiniTasks(data.mini);
      Store.saveAchievements(data.ach);

      hapticNotify('success');
      alert('✅ Data loaded successfully!');

      UITabs.switchTo('tasks');
      UITasks.render();
      UIMiniTasks.render();
      UIAchievements.render();
      UISettings.updateStorageInfo();
    } catch (err) {
      alert('❌ Error loading data: ' + err.message);
    }
  },

  // Экспортировать как JSON файл
  exportData() {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      tasks: Store.getTasks(),
      miniTasks: Store.getMiniTasks(),
      achievements: Store.getAchievements(),
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasks-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    hapticNotify('success');
  },

  // Импортировать из JSON файла
  importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (!data.tasks || !data.miniTasks || !data.achievements) {
          alert('❌ Invalid backup file format');
          return;
        }

        if (!confirm('⚠️ Replace all current data?')) {
          return;
        }

        Store.saveTasks(data.tasks || []);
        Store.saveMiniTasks(data.miniTasks || []);
        Store.saveAchievements(data.achievements || []);

        hapticNotify('success');
        alert('✅ Data imported successfully!');

        UITabs.switchTo('tasks');
        UITasks.render();
        UIMiniTasks.render();
        UIAchievements.render();
        UISettings.updateStorageInfo();
      } catch (err) {
        alert('❌ Error importing file: ' + err.message);
      }
    };
    reader.readAsText(file);
  },

  clearAll() {
    if (!confirm('🗑️ Delete ALL data? This cannot be undone.')) return;
    if (!confirm('Are you sure? Last chance to back up.')) return;

    localStorage.clear();
    hapticNotify('success');
    alert('✅ All data cleared');
    location.reload();
  },
};

// ============================================================
// FAB — кнопка добавления
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
          onSave: (title, type, days) => {
            Store.addTask(title, type, days);
            UITasks.render();
          },
        });
      } else if (tab === 'mini') {
        Modal.open({
          title: 'Новая мини-задача',
          showTypeToggle: false,
          onSave: (title) => {
            Store.addMiniTask(title);
            UIMiniTasks.render();
          },
        });
      } else if (tab === 'achievements') {
        // На вкладке достижений FAB не нужен — скроем или покажем подсказку
        return;
      }
    });
  },
};

// ============================================================
// TelegramInit — инициализация Telegram WebApp
// ============================================================

const TelegramInit = {
  init() {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation?.();

    // Цвет шапки Telegram = secondary_bg
    const headerBg = tg.themeParams?.secondary_bg_color || '#f4f4f5';
    tg.setHeaderColor?.(headerBg);
    tg.setBackgroundColor?.(tg.themeParams?.bg_color || '#ffffff');
  },
};

// ============================================================
// App — точка входа
// ============================================================

const App = {
  init() {
    TelegramInit.init();
    DailyReset.run();

    Modal.init();
    UITabs.init();
    UITasks.init();
    UIMiniTasks.init();
    UISettings.init();
    FAB.init();

    // Начальный рендер
    UITasks.render();
    Progress.update();
    UISettings.updateStorageInfo();

    // Скрыть FAB на вкладках достижений и настроек
    const origSwitch = UITabs.switchTo.bind(UITabs);
    UITabs.switchTo = function(tab) {
      origSwitch(tab);
      FAB.btn.style.display = (tab === 'achievements' || tab === 'settings') ? 'none' : '';
    };
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
