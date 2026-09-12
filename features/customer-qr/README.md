# Customer QR Ordering — Demo Module

Fully isolated, mock-driven, mobile-first ordering experience inspired by Qlub.
Does **not** touch existing POS code, routes, APIs, stores, or DB.

```
app/customer-qr/                  ← routes (Next.js App Router)
features/customer-qr/             ← everything else (this folder)
  assets/        — local mock images & svgs
  components/    — module-only UI primitives
  constants/     — tip presets, statuses, restaurant config
  hooks/         — useTable, useMenu, useCart, useOrderTracking…
  i18n/          — module-scoped EN/AR dictionaries
  mock/          — mock tables, menu, restaurant
  services/      — abstraction layer (mock today, API tomorrow)
  store/         — Zustand stores (session, cart, order, locale)
  types/         — strict TypeScript contracts
  utils/         — currency, qr, format helpers
```

## Architecture rule
Components → **Services** → (Mock or future API).
Components NEVER import mock data directly.

## Adding a real backend later
Swap the implementation files in `services/` — UI/state untouched.
```
services/menuService.ts → flip `SOURCE` flag to "api"
```
