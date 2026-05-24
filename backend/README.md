# Ludo Backend — Merged Project

This project merges:
- **Game engine** from `new` project (Node.js / Express / Socket.IO / better-sqlite3)
- **User schema** from `schema` project (TypeORM entities, migrations, Koa routes, JWT auth)

---

## Project Structure

```
.
├── api/
│   └── index.js          ← Main Express + Socket.IO entry point (game server)
├── auth/
│   └── password.js       ← scrypt password hashing (used by Express API)
├── db/
│   └── sqliteCli.js      ← SQLite client — extended user schema + full game room management
├── models/
│   └── gameState.js      ← Ludo board logic (unchanged from new project)
├── socket/
│   └── gameHandler.js    ← Socket.IO game event handlers (unchanged from new project)
├── data/
│   └── ludo.db           ← SQLite database (auto-created)
│
└── src/                  ← TypeScript services from schema project
    ├── app.ts            ← Koa app (admin, wallet, user detail, games routes)
    ├── server.ts         ← Koa server entry (DB + Redis init)
    ├── config/           ← database, redis, firebase, swagger configs
    ├── features/
    │   ├── auth/         ← Koa auth routes (OTP email flow)
    │   ├── wallet/       ← Wallet management
    │   ├── userDetail/   ← KYC / user detail
    │   ├── admin/        ← Admin panel routes
    │   ├── games/        ← Games catalog routes
    │   └── status/       ← Status routes
    ├── middleware/        ← JWT auth, error handler, validation
    ├── migrations/        ← TypeORM migrations (PostgreSQL)
    ├── models/            ← TypeORM entities (User, Wallet, Transaction, etc.)
    ├── socket/
    │   └── game.socket.ts ← Socket.IO GameSocket class (TypeScript version)
    ├── types/             ← Shared enums & interfaces
    └── utils/             ← Encryption, response helpers, logger, RNG
```

---

## What changed in the merge

### `db/sqliteCli.js` — Extended users table
The `users` table now includes all fields from the schema project's `User` entity:

| New column | Type | Default | Source |
|---|---|---|---|
| `email` | TEXT UNIQUE | null | schema |
| `name` | TEXT | username | schema |
| `phone` | TEXT | null | schema |
| `avatar` | TEXT | null | schema |
| `role` | TEXT | `'USER'` | schema |
| `status` | TEXT | `'ACTIVE'` | schema |
| `is_verified` | INTEGER | 0 | schema |
| `is_user_detail_verified` | INTEGER | 0 | schema |

A **wallets** and **user_details** table are also created automatically (SQLite-adapted from schema migrations).

Migration safety: existing DBs are upgraded automatically via `ALTER TABLE` column checks on startup.

### `api/index.js` — JWT auth
- Register / Login now return a **JWT** (signed with `JWT_SECRET`) instead of a plain UUID token
- Socket.IO middleware accepts both JWT tokens and legacy session tokens
- Register accepts both `username+password` and `email+name+password` payloads
- `PATCH /api/me` added for profile updates

---

## Running

### Game server only (Express + SQLite)
```bash
npm install
npm run dev        # nodemon api/index.js
```

### TypeScript Koa services (optional — needs PostgreSQL + Redis)
```bash
cp .env.example .env   # fill in DB_HOST, REDIS_URL, etc.
npm run dev:ts         # ts-node src/server.ts
npm run migration:run  # run TypeORM migrations
```

---

## Environment variables
See `.env.example` for all options.
