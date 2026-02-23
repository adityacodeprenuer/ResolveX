# ResolveX Complaint Management System

This project is now organized from the main folder (`d:\Amlan Project - Copy`).

## Runtime Flow

1. `landing.html` (always first)
2. `login.html`
3. `index.html` (main dashboard after login)

Direct access to protected pages redirects to landing/login using `auth.js` guards.

## JSON Database

Primary JSON source:

- `db.json`

Data is loaded into localStorage and used by the app in offline mode.

## Optional Local Backend (Node)

Backend file:

- `backend/server.js`

Run it from project root:

```powershell
node backend/server.js
```

Backend URL:

- `http://localhost:5050/api`

When backend is running, the app can push/pull data from **Settings > Backend Sync**.
When backend is not running, the app continues fully in local mode.

## Open the Website

Use Live Server or any static server from project root and open:

- `landing.html`

Demo login password:

- `admin123`
