# Ledgr

A personal expense tracker PWA built for iPhone. Tracks monthly bills — credit cards, mortgage, car, utilities — with due dates and recurring support. Data syncs across all devices via Google login.

## Features

- Google login — data syncs across any browser or device
- Face ID lock screen (optional) — biometric unlock via WebAuthn
- Month-by-month expense view with animated total and remaining balance
- Due date per expense — list sorted by due day, remaining vs paid color-coded
- Recurring expenses auto-copied when you navigate to a new month
- Analytics view — category breakdown with animated bar chart and 6-month trend
- Export to CSV (iOS share sheet) or JSON backup
- Import JSON backup — for migrating old local data into your account
- Fully offline after first load (PWA, service worker)

## User identity / data storage

Data is tied to your **Google account** via Firebase Auth + Firestore:

| Scenario | Result |
|---|---|
| Same Google account, any device/browser | Same data ✓ |
| Different Google account | Separate data |
| Not signed in | Login screen |

Each user's data lives at `users/{uid}/*` in Firestore with security rules that prevent cross-user access.

## Face ID

Uses the Web Authentication API (WebAuthn/Passkeys). Device-specific — credential lives in the iOS Secure Enclave.

- Enable: Settings → Security → **Enable Face ID**
- App shows biometric lock screen on every open until you disable it
- If Face ID fails, tap "Sign out" to re-authenticate with Google

Note: Face ID credential is per-device. Enabling on iPhone does not affect other devices.

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS
- Firebase Auth (Google OAuth)
- Firebase Firestore (cloud database)
- Web Authentication API (WebAuthn — Face ID)
- Recharts (analytics)
- Anime.js v4 (animations)
- vite-plugin-pwa (service worker + offline)

## Run locally

```bash
npm install
npm run dev
```

Requires a `.env.local` file with Firebase config:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Get these values from Firebase console → Project settings → Your apps → Web app.

## Deploy to Vercel

Add all 6 `VITE_FIREBASE_*` env vars in Vercel project settings, then:

```bash
vercel build --prod
vercel deploy --prebuilt --prod
```

Also add your Vercel domain to Firebase → Authentication → Settings → Authorized domains.

## Migrate data from old local version

If you had data in the old IndexedDB-based version:

1. Open old version (before logging in) → Settings → **Export Backup (JSON)**
2. Sign in with Google
3. Settings → **Import Backup (JSON)** → pick the file

Import skips duplicates, safe to run multiple times.
