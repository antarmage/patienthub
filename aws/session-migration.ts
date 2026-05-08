/**
 * session-migration.ts
 *
 * Shows the EXACT changes needed to migrate from in-memory sessions
 * (memorystore) to PostgreSQL-backed sessions (connect-pg-simple).
 *
 * This makes the API server stateless and compatible with multiple
 * ECS Fargate instances behind a load balancer.
 *
 * Step 1 — Install the package:
 *   pnpm --filter @workspace/api-server add connect-pg-simple
 *   (already listed as a dependency — just needs enabling)
 *
 * Step 2 — Create the session table in PostgreSQL (run once):
 *   See the SQL at the bottom of this file, or use the CLI:
 *   psql $DATABASE_URL < node_modules/connect-pg-simple/table.sql
 *
 * Step 3 — Replace the session middleware in your app entry point.
 *   The BEFORE/AFTER blocks below show the full change.
 */

// =============================================================================
// BEFORE — current app.ts (uses in-memory memorystore, lost on restart)
// =============================================================================

/*
import session from "express-session";
import MemoryStore from "memorystore";

const MemStore = MemoryStore(session);

app.use(session({
  secret: process.env.SESSION_SECRET ?? "dev-secret",
  resave: false,
  saveUninitialized: false,
  store: new MemStore({ checkPeriod: 86400000 }),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));
*/

// =============================================================================
// AFTER — connect-pg-simple (sessions survive restarts & scale horizontally)
// =============================================================================

import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

const PgSession = connectPgSimple(session);

/**
 * Call this function once in app.ts after creating the Express app.
 * Pass the existing pg.Pool from db.ts to reuse the connection pool.
 */
export function configureSession(app: import("express").Express, pool: pg.Pool) {
  const sessionSecret = process.env["SESSION_SECRET"];
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  const isProduction = process.env["NODE_ENV"] === "production";

  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "user_sessions",   // created by the SQL below
        createTableIfMissing: false,  // always create the table manually
        pruneSessionInterval: 60 * 15, // prune expired sessions every 15 min
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      name: "saivie.sid",             // don't expose default 'connect.sid' name
      cookie: {
        secure:   isProduction,       // HTTPS only in production
        httpOnly: true,               // not accessible via JS
        sameSite: isProduction ? "strict" : "lax",
        maxAge:   24 * 60 * 60 * 1000, // 24 hours
      },
    }),
  );
}

// =============================================================================
// Required SQL — run once against your RDS instance before deploying
// =============================================================================
//
// psql $DATABASE_URL -c "
//   CREATE TABLE IF NOT EXISTS user_sessions (
//     sid    varchar      NOT NULL COLLATE \"default\",
//     sess   json         NOT NULL,
//     expire timestamp(6) NOT NULL,
//     CONSTRAINT user_sessions_pkey PRIMARY KEY (sid)
//   );
//   CREATE INDEX IF NOT EXISTS idx_user_sessions_expire
//     ON user_sessions (expire);
// "
//
// =============================================================================
