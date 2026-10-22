import { createServer } from "http";
import app from "./app";
import { registerRoutes, registerDeskRoutes, registerGenomeRoutes } from "./routes/routes";
import { logger } from "./lib/logger";
import { ensureSchema } from "./db";
import { synchronizeFollowUpCalls } from "./follow-up-calls";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

ensureSchema().then(async () => {
  await registerRoutes(httpServer, app);
  await registerDeskRoutes(app);
  await registerGenomeRoutes(app);
  await synchronizeFollowUpCalls();
  const followUpTimer = setInterval(() => {
    synchronizeFollowUpCalls().catch((err) => logger.error({ err }, "Automatic follow-up call generation failed"));
  }, 60 * 60 * 1000);
  followUpTimer.unref();
  httpServer.on("close", () => clearInterval(followUpTimer));
  httpServer.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}).catch((err) => {
  logger.error({ err }, "Error starting server");
  process.exit(1);
});
