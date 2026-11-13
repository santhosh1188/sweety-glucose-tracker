# Sweety – Blood Glucose Tracker

A small web app where a diabetes patient records up to 4 blood glucose readings a day and views daily and monthly reports.

**Stack:** Node.js + Express, PostgreSQL, React (Vite), JWT auth, bcrypt, Jest + Supertest.

## Features

- Sign up and log in (passwords hashed with bcrypt, JWT sessions)
- Each user sees only their own readings
- Add, view, edit and delete readings (4 slots: Morning (fasting), After breakfast, After lunch, After dinner)
- Validation with clear messages in the UI: required value, whole number 40–600 mg/dl, one reading per slot per day, max 4 per day, no future dates
- Reports for a selected date: Daily, Month-to-date and Previous month (highest, lowest, average to 1 decimal, count, friendly empty state); the daily report also lists each reading with its slot
- Pagination on `GET /api/readings` (`?page=1&limit=20`)

## Prerequisites

- Node.js 20+
- PostgreSQL 14+

## Setup

1. Clone the repo and open the folder.
2. Create two databases (one for the app, one for tests):
   ```sql
   CREATE DATABASE sweety;
   CREATE DATABASE sweety_test;
   ```
3. Server:
   ```bash
   cd server
   npm install
   cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
   ```
   Open `server/.env` and set `DATABASE_URL` and `JWT_SECRET`.
4. Create the tables and the demo data:
   ```bash
   npm run migrate
   npm run seed
   ```
5. Client:
   ```bash
   cd ../client
   npm install
   ```
   The client needs no `.env`: the Vite dev server proxies `/api` to `http://localhost:5000`.

## Run

| What | Command | URL |
|---|---|---|
| API server | `cd server && npm run dev` | http://localhost:5000 |
| React client | `cd client && npm run dev` | http://localhost:5173 |
| Tests | `cd server && npm test` | |

Start the server first, then the client. On startup the server logs `[DB] Connected to database "sweety"`, or a clear error if the database is unreachable.

**Tests:** copy `server/.env.test.example` to `server/.env.test`, set the password for the `sweety_test` database, then run `npm test` in `server/`. The tests refuse to run against a database whose URL doesn't contain "test".

## Demo account

Created by `npm run seed` (about 6 weeks of readings, so the previous-month report has data):

- Email: `demo@sweety.app`
- Password: `password123`

## Environment variables (`server/.env.example`)

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign tokens |
| `JWT_EXPIRES_IN` | Token lifetime (default 7d) |
| `APP_TIMEZONE` | Time zone used to decide what "today" is (default Asia/Kolkata) |

## API

All routes except register and login need `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/readings` | Add a reading |
| GET | `/api/readings?page=1&limit=20` | List my readings (paginated) |
| PUT | `/api/readings/:id` | Edit a reading |
| DELETE | `/api/readings/:id` | Delete a reading |
| GET | `/api/reports/daily?date=YYYY-MM-DD` | Daily report with readings |
| GET | `/api/reports/month-to-date?date=YYYY-MM-DD` | 1st of the month to the date |
| GET | `/api/reports/monthly?date=YYYY-MM-DD` | The whole previous month |

A Postman collection and environment are in `postman/` (import both, then run the collection).

## Database design

- `users(id, name, email, password_hash, created_at)` with a unique index on `LOWER(email)`
- `readings(id, user_id, reading_date, slot, value, created_at, updated_at)`
  - `UNIQUE (user_id, reading_date, slot)`: one reading per slot per day
  - `CHECK (value BETWEEN 40 AND 600)` and a `CHECK` on the 4 slot names
  - index on `(user_id, reading_date)` for the report queries
  - `reading_date` is a `DATE`, not a timestamp, which avoids time zone off-by-one bugs

The rules are checked in code (for friendly messages) and again by database constraints (so a race between two requests can't break them).

## Project structure

```
server/   Express API (routes, controllers, validation, db, tests)
client/   React app (pages, auth context, API helper)
postman/  Postman collection and environment
```

## Notes

**Assumptions**
- "Future date" is judged in `APP_TIMEZONE` (Asia/Kolkata by default).
- The previous-month report is the calendar month before the selected date's month.
- A report for a future date is rejected, and a missing date defaults to today.
- With 4 slots and one reading per slot per day, the "max 4 per day" rule can only be reached through the duplicate-slot rule; the explicit check stays as a safety net.
- Unknown email and wrong password return the same message, so accounts can't be probed.
- I used raw parameterized SQL (`pg`) because the queries are simple and the reports are aggregates.

## Run with Docker (optional)

Starts PostgreSQL and the API with one command (requires Docker Desktop):

```bash
docker compose up --build
docker compose exec api npm run seed   # demo user and sample readings
```

The API is on http://localhost:5000 and PostgreSQL on host port 5433 (to avoid clashing with a local PostgreSQL on 5432). Tables are created automatically on start. The React client still runs with `cd client && npm run dev`. Stop everything with `docker compose down` (add `-v` to also delete the database volume).

**With more time**
- Charts of readings over the month, and frontend tests with React Testing Library
- Redis caching of reports, cleared when a reading changes
- Refresh tokens and rate limiting on login
- A deployed demo