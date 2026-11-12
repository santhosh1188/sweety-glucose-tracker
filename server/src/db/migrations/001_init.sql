-- server/src/db/migrations/001_init.sql
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS readings (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reading_date DATE     NOT NULL,
  slot         VARCHAR(20) NOT NULL
               CHECK (slot IN ('morning_fasting','after_breakfast','after_lunch','after_dinner')),
  value        SMALLINT NOT NULL CHECK (value BETWEEN 40 AND 600),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_reading_per_slot_per_day UNIQUE (user_id, reading_date, slot)
);
CREATE INDEX IF NOT EXISTS readings_user_date_idx ON readings (user_id, reading_date);