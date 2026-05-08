/**
 * cors-config.ts
 *
 * Production CORS configuration for Saivie API.
 *
 * Replace the current `app.use(cors())` in app.ts with this.
 * The open cors() call allows ALL origins — not safe for production.
 *
 * Usage in app.ts:
 *   import { corsMiddleware } from "./cors-config";  // or paste inline
 *   app.use(corsMiddleware);
 */

import cors, { type CorsOptions } from "cors";

// ---------------------------------------------------------------------------
// Allowed origins per environment
// ---------------------------------------------------------------------------

const PRODUCTION_ORIGINS = [
  // Web apps (subdomains)
  "https://app.saivie.com",
  "https://desk.saivie.com",
  "https://recover.saivie.com",
  "https://gene.saivie.com",

  // Mobile app (Expo / React Native)
  // React Native does not send an Origin header for native requests,
  // so mobile API calls automatically bypass CORS. However, if you
  // use Expo Go or a web build, add those origins here.
  "https://saivie.com",
];

const DEVELOPMENT_ORIGINS = [
  // Replit dev proxy
  /^https:\/\/.*\.replit\.dev$/,
  /^https:\/\/.*\.repl\.co$/,

  // Local development
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
];

// ---------------------------------------------------------------------------
// CORS options
// ---------------------------------------------------------------------------

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    const isProduction = process.env["NODE_ENV"] === "production";

    // Allow requests with no Origin header (mobile native, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = isProduction
      ? PRODUCTION_ORIGINS
      : [...PRODUCTION_ORIGINS, ...DEVELOPMENT_ORIGINS];

    const allowed = allowedOrigins.some((allowed) =>
      typeof allowed === "string"
        ? allowed === origin
        : allowed.test(origin),
    );

    if (allowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    }
  },

  methods:     ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Kiosk-Session",   // SaivieKiosk session token header
    "X-Request-ID",
  ],
  exposedHeaders: ["X-Request-ID"],
  credentials: true,      // Required for cookies (session) and Authorization headers
  maxAge:      86400,     // Pre-flight cache: 24 hours (reduces OPTIONS requests)
};

export const corsMiddleware = cors(corsOptions);

// ---------------------------------------------------------------------------
// Paste this directly into app.ts replacing the existing cors() call:
// ---------------------------------------------------------------------------
//
//  BEFORE:
//    app.use(cors());
//
//  AFTER:
//    import { corsMiddleware } from "./lib/cors-config";
//    app.use(corsMiddleware);
//
// ---------------------------------------------------------------------------
