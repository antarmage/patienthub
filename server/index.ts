import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase } from "./seed";
import { storage } from "./storage";
import { ensureSchema } from "./db";
import { whatsapp } from "./whatsapp";
import { scorePatient, generateTrimesterChecklist } from "./risk-engine";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    patientId?: number;
  }
}

const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: "patient_sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "saivie-patient-session-secret-2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

app.use(
  express.json({
    limit: '20mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// ── WhatsApp Reminder Scheduler ──────────────────────────────────────────
function startReminderScheduler() {
  const CHECK_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

  const runCheck = async () => {
    try {
      const allAppts = await storage.getAppointments();
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      for (const appt of allAppts) {
        if (!appt.patientId || !appt.date || !appt.time) continue;
        if (appt.status === "completed" || appt.status === "cancelled") continue;
        if (appt.date < todayStr) continue;

        // Parse appointment datetime
        const apptDateTimeStr = `${appt.date}T${convertTo24h(appt.time)}:00`;
        const apptTime = new Date(apptDateTimeStr);
        if (isNaN(apptTime.getTime())) continue;

        const diffMs = apptTime.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        const remindersSent = (appt.whatsappReminderSent || "").split(",").filter(Boolean);

        // 24-hour reminder (send when between 24h and 25h away)
        if (diffHours > 23 && diffHours <= 25 && !remindersSent.includes("24h")) {
          const patient = await storage.getPatient(appt.patientId);
          if (patient?.phone) {
            try {
              await whatsapp.sendReminder24h(
                patient.phone,
                patient.name,
                appt.date,
                appt.time,
                appt.visitMode || "in-clinic",
                appt.telemedicineLink
              );
              await storage.updateAppointment(appt.id, {
                whatsappReminderSent: [...remindersSent, "24h"].join(","),
              });
              log(`24h WhatsApp reminder sent to ${patient.name} for appt ${appt.id}`, "scheduler");
            } catch (err: any) {
              log(`Failed 24h reminder for appt ${appt.id}: ${err.message}`, "scheduler");
            }
          }
        }

        // 1-hour reminder (send when between 55min and 65min away)
        if (diffHours > 0.916 && diffHours <= 1.083 && !remindersSent.includes("1h")) {
          const patient = await storage.getPatient(appt.patientId);
          if (patient?.phone) {
            try {
              await whatsapp.sendReminder1h(
                patient.phone,
                patient.name,
                appt.time,
                appt.visitMode || "in-clinic",
                appt.telemedicineLink
              );
              await storage.updateAppointment(appt.id, {
                whatsappReminderSent: [...remindersSent, "1h"].join(","),
              });
              log(`1h WhatsApp reminder sent to ${patient.name} for appt ${appt.id}`, "scheduler");
            } catch (err: any) {
              log(`Failed 1h reminder for appt ${appt.id}: ${err.message}`, "scheduler");
            }
          }
        }
      }
    } catch (err: any) {
      log(`Reminder scheduler error: ${err.message}`, "scheduler");
    }
  };

  // Run immediately then on interval
  runCheck();
  setInterval(runCheck, CHECK_INTERVAL_MS);
  log("WhatsApp reminder scheduler started (checks every 5 min)", "scheduler");
}

function convertTo24h(time12: string): string {
  // Convert "09:00 AM" → "09:00", "02:30 PM" → "14:30"
  const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return time12.slice(0, 5);
  let hours = parseInt(match[1]);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

(async () => {
  await ensureSchema();
  await seedDatabase();
  await registerRoutes(httpServer, app);
  startReminderScheduler();

  // Background: score any patients that don't have a risk score yet, and generate
  // trimester checklists for pregnant patients without one. Runs after startup, non-blocking.
  setTimeout(async () => {
    try {
      const allPatients = await storage.getPatients();
      const unscored = allPatients.filter((p) => !p.riskScore);
      console.log(`[risk-engine] Startup: auto-scoring ${unscored.length} unscored patients in background`);
      for (const p of unscored) {
        await scorePatient(p.id);
        // Small delay to avoid overwhelming Gemini API
        await new Promise((r) => setTimeout(r, 600));
      }
      // Auto-generate trimester checklists for pregnant patients without one
      const noChecklist = allPatients.filter((p) => p.lmp && !p.trimesterChecklist);
      console.log(`[risk-engine] Startup: generating checklists for ${noChecklist.length} patients with LMP`);
      for (const p of noChecklist) {
        await generateTrimesterChecklist(p.id);
        await new Promise((r) => setTimeout(r, 600));
      }
    } catch (err: any) {
      console.error("[risk-engine] Startup background scoring error:", err.message);
    }
  }, 5000);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
