# ikorka-coo

Панель СОО: чекліст на день + задачі з таймтрекінгом і полем звіту/нотаток
+ тижнева аналітика. Vite + React, деплой на GitHub Pages.

Повністю окремо від `ikorka-sysadmin` / `ikorka-luiza` / `task-dashboard`:
свій бекенд ([`ikorka-coo-backend`](https://github.com/lyizacarenko-spec/ikorka-coo-backend)),
своя Postgres-база, свої PIN'и.

## Доступ

`COO_PIN`, `OWNER_PIN`, `EVGENIYA_PIN` — усі три дають однаковий повний
read/write-доступ (не рольова система, невеликий інструмент для кількох
довірених людей).

## Локальний запуск

```bash
npm install
npm run dev
```

Потрібен `.env.local`:
```
VITE_API_URL=http://localhost:3000/api
```

## Деплой

Автоматично при пуші в `main` через `.github/workflows/deploy.yml` →
GitHub Pages. Settings → Pages → Source → GitHub Actions.

`VITE_API_URL` (публічний URL `ikorka-coo-backend` на Railway + `/api`)
задається один раз у Settings → Secrets and variables → Actions →
Variables, після того як Railway-сервіс створено.
