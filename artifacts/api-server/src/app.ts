import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.use("/api", router);

export function registerApiErrorHandler(app: Express) {
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err, path: req.path }, "Unhandled API error");
    if (res.headersSent) return;
    const status = Number(err?.status || err?.statusCode) || 500;
    res.status(status).json({ error: err?.message || "Server error" });
  });
}

export default app;
