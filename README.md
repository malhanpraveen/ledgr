# Ledgr

A personal expense tracker PWA built for iPhone. Tracks monthly bills — credit cards, mortgage, car, utilities — with due dates and recurring support.

## Features

- Month-by-month expense view with animated total and remaining balance
- Due date per expense — list sorted by due day, remaining vs paid color-coded
- Recurring expenses auto-copied from previous month
- Analytics view — category breakdown with animated bar chart
- 4-digit PIN lock (optional)
- Export to CSV (iOS share sheet) or JSON backup
- Import JSON backup — for migrating between devices or URLs
- Fully offline after first load (PWA, service worker)

## User identity / data storage

**There are no accounts.** All data is stored in IndexedDB on the device, scoped to the URL origin:

| Scenario | Result |
|---|---|
| Same device + same URL | Same data ✓ |
| Different device | Empty — use Export/Import JSON to migrate |
| Different browser on same device | Empty database |
| `http://local-ip` vs `https://vercel.app` | Different databases — use Export/Import in Settings |

The PIN is local access control only — not identity, not synced anywhere.

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS
- Dexie.js (IndexedDB)
- Recharts (analytics)
- Anime.js v4 (animations)
- vite-plugin-pwa (service worker + offline)

## Run locally

```bash
npm install
npm run dev
```

Preview production build (required for PWA/service worker):

```bash
npm run build
npm run preview -- --host
```

`--host` exposes on local network so iPhone can reach it via `http://192.168.x.x:4173`. Note: service worker and `crypto.subtle` require HTTPS — use the Vercel deployment for full PWA features on iPhone.

## Deploy to Vercel

```bash
# Build locally then deploy prebuilt (avoids remote npm install issues with cutting-edge deps)
vercel build --prod
vercel deploy --prebuilt --prod
```

## Migrate data between URLs

1. Old URL → Settings → **Export Backup (JSON)**
2. New URL → Settings → **Import Backup (JSON)** → pick the file

Import skips duplicates, safe to run multiple times.
