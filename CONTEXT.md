# Telegram Mini App — Context

## Что это
Минималистичный трекер личной продуктивности как Telegram Mini App: задачи, привычки, достижения, дневник.

## Стек
HTML + CSS + Vanilla JS (zero dependencies), Telegram CloudStorage (синхронизация), поддержка RU/EN

## Текущее состояние
- Задеплоен на GitHub Pages, привязан к боту через BotFather
- Данные хранятся в Telegram CloudStorage (синхронизируются между устройствами)
- Ежедневный авторесет для повторяющихся задач
- Темп Telegram (light/dark) применяется автоматически
- Во вкладке Победы: статистика «Сегодня» (сделано за день) + «Провалы» (просроченные дедлайны + дейли не выполнены)
- Дейли задачи: точка дня сегодня — зелёная если выполнена, красная если нет

## Структура
```
index.html   — разметка (табы, модал, навигация)
styles.css   — стили через Telegram CSS переменные
app.js       — логика: Store, SwipeHandler, Modal, Tabs, I18n, UIAchievements, UIThoughts
```

## Деплой
1. Fork → GitHub Pages → Source: main / (root)
2. BotFather → /newapp → Web App URL = GitHub Pages URL
3. Получить ссылку вида `https://t.me/your_bot/app`

## TODO
- [ ] Нет активных задач

## Последнее обновление
2026-04-04 — счётчик провалов, зелёные/красные точки дней, замена Total
