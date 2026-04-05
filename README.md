# Productivo Mobile

React Native / Expo mobile app for Productivo — same features as the web app with native mobile UX and biometric authentication.

## Setup

```bash
cd mobile
npm install
```

## Configure API URL

Edit `src/services/api.js` line 6 — change `API_BASE_URL` to your backend server:

| Scenario | URL |
|---|---|
| iOS Simulator | `http://localhost:3001/api/v1` |
| Android Emulator | `http://10.0.2.2:3001/api/v1` |
| Physical device | `http://YOUR_LOCAL_IP:3001/api/v1` |

## Run

```bash
npx expo start        # opens QR code
npx expo start --ios  # iOS simulator
npx expo start --android  # Android emulator
```

## Features

- **Login** — Password, MPIN (numeric PIN), Fingerprint/Face ID
- **Dashboard** — Revenue stats, task summary, upcoming meetings, client pipeline
- **Tasks** — List view with filters (status, priority, assignee), create tasks
- **Clients** — Pipeline kanban view + list view, stage updates
- **Invoices** — Invoice list with status filters, detail view, PDF generation
- **Meetings** — Upcoming/past meetings, join links, cancel
- **Projects** — Project list with status filters, team view
- **Settings** — MPIN setup, biometric info, theme (light/dark/system), categories
- **More** — WhatsApp conversations, Organizations, Users

## Biometric Auth

On devices with fingerprint/Face ID:
1. Login once with password
2. Tap "Fingerprint" or "Face ID" button on login screen
3. Future logins auto-prompt biometric on app open

## Stack

- Expo ~51 + React Native 0.74
- React Navigation (Stack + Bottom Tabs)
- Zustand (state management)
- Axios (API calls)
- expo-local-authentication (biometrics)
- expo-secure-store (secure token storage)
- expo-haptics (tactile feedback)
