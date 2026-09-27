import { createServer } from "http";
import app from "./app";
import { registerRoutes, registerDeskRoutes, registerGenomeRoutes } from "./routes/routes";
import { logger } from "./lib/logger";
import { ensureSchema } from "./db";

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
  httpServer.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}).catch((err) => {
  logger.error({ err }, "Error starting server");
  process.exit(1);
});
