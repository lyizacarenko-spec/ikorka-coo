# ikorka-coo — контекст для Claude Code

## Що це
Панель СОО: чекліст на день, задачі з таймтрекінгом і полем звіту/нотаток
(редагується незалежно від статусу), тижнева аналітика. Той самий UI-
паттерн, що й `ikorka-luiza`/`ikorka-sysadmin`, але без вкладки
«Проєкти» і без "sysadmin shortcut".

## Навмисна ізоляція
Повністю окремо від `task-dashboard-backend` та інших панелей:
- Бекенд: [`ikorka-coo-backend`](https://github.com/lyizacarenko-spec/ikorka-coo-backend),
  власний Railway-сервіс.
- База: власна Postgres, не спільна з іншими проєктами.
- PIN'и: `COO_PIN`/`OWNER_PIN`/`EVGENIYA_PIN` — окремі змінні на цьому
  Railway-сервісі, навіть якщо значення збігаються з іншими панелями.

## Ролі
Усі три PIN дають однаковий повний доступ — немає read-only ролі тут.

## Стек
- Vite + React, `src/App.jsx`, `src/api.js` (PIN у заголовку `x-pin`).
- Деплой: GitHub Actions → GitHub Pages, автоматично при пуші в `main`.
- `vite.config.js`: `base: "/ikorka-coo/"`.
- `VITE_API_URL` — repo variable в GitHub Actions (Settings → Secrets
  and variables → Actions → Variables), не хардкодиться в коді.

## Важливо при змінах
- Не хардкодити PIN у код.
- Не підключати до бази/бекенду інших панелей — ізоляція навмисна.
