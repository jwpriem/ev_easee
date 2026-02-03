# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev       # Start Next.js dev server
npm run build     # Production build (also runs TypeScript checking)
npm run lint      # ESLint
npm start         # Start production server
```

No test framework is configured. Use `npm run build` to verify TypeScript correctness.

## Architecture

EV Easee is a Next.js 16 (app router) application for managing Easee home EV chargers with Tibber electricity price-based automation. It uses Neon serverless PostgreSQL, Tailwind CSS 4, and Recharts.

### Core Libraries (`src/lib/`)

- **db.ts** — Lazy-initialized Neon client via `getDb()`. All tables created in `initializeDatabase()` (called via `POST /api/db/init`). Tables: `users`, `chargers`, `tibber_connections`, `charging_schemas`, `automation_settings`.
- **session.ts** — Cookie-based auth using base64-encoded JSON in an httpOnly cookie. `getSession()` returns `{ userId, email }` or null. Protected pages redirect to `/login`; API routes return 401.
- **easee.ts** — `EaseeClient` class wrapping the Easee REST API (login, token refresh, charger control). Also exports `encryptToken()`/`decryptToken()` using AES-256-CBC (used across the app for all stored tokens).
- **tibber.ts** — `fetchTibberPrices(apiToken)` fetches today+tomorrow hourly prices via Tibber's GraphQL API using a personal access token.
- **digitalocean.ts** — DigitalOcean Functions integration: creates namespaces, deploys functions via the OpenWhisk API, and manages scheduled triggers.

### Authentication & Encryption

All external tokens (Easee, Tibber, DigitalOcean) are encrypted with AES-256-CBC before database storage. The encryption key comes from `TOKEN_ENCRYPTION_KEY` env var. The encrypt/decrypt functions live in `easee.ts` but are used throughout.

Passwords are hashed with bcryptjs (10 rounds). Sessions are base64 JSON cookies (not JWTs).

### Key Application Flow

1. User connects an Easee charger (provides Easee credentials → tokens stored encrypted)
2. User connects Tibber (provides personal access token → stored encrypted)
3. User creates a charging schema: sets max price per kWh for a charger
4. Schedule calculation expands hourly Tibber prices into 15-minute slots, marking each as active (price ≤ max) or inactive
5. "Apply Now" or the cron endpoint checks current price against schemas and sends start/pause commands to Easee
6. Automation (optional): creates a DigitalOcean Function that calls `/api/cron/apply` every 15 minutes

### Dual Apply Endpoints

- `/api/schemas/apply` — Session-authenticated, for manual "Apply Now" from the UI
- `/api/cron/apply` — API key-authenticated (Bearer token), for external/automated invocation. The API key is generated during automation setup and stored in `automation_settings`.

### Price Caching

`/api/prices/route.ts` has an in-memory `Map<userId, CacheEntry>` with smart TTL: 15-min normally, 2-min around 13:00 (when day-ahead prices publish), and forced refresh if tomorrow's prices are missing after 13:00.

### Environment Variables

```
DATABASE_URL          # Neon PostgreSQL connection string
TOKEN_ENCRYPTION_KEY  # 32+ char key for AES-256-CBC token encryption
```

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).
