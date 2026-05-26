import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "../db";

const router: IRouter = Router();

// Rate limiter: 120 requests/min per IP — generous for ECS/ALB probes, blocks DoS scanners
const _healthRateMap = new Map<string, { count: number; resetAt: number }>();
function healthRateLimit(req: Request, res: Response): boolean {
  const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
  const now = Date.now();
  const entry = _healthRateMap.get(ip);
  if (!entry || entry.resetAt < now) {
    _healthRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 120) {
    res.status(429).json({ error: "Too many requests" });
    return false;
  }
  entry.count += 1;
  return true;
}

/**
 * GET /api/healthz
 *
 * Production health check used by:
 *   - ECS Fargate health check (HEALTHCHECK in Dockerfile.api)
 *   - ALB target group health check
 *   - ECS task definition healthCheck command
 *
 * Returns 200 when the server AND database are reachable.
 * Returns 503 when the database is down (ECS will restart the task).
 *
 * Intentionally lightweight — no auth, no heavy queries.
 */
router.get("/healthz", async (_req: Request, res: Response) => {
  if (!healthRateLimit(_req, res)) return;
  const start = Date.now();

  try {
    // Verify database connectivity with a minimal query
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
    } finally {
      client.release();
    }

    const latencyMs = Date.now() - start;

    res.status(200).json({
      status:     "ok",
      db:         "ok",
      latencyMs,
      uptime:     Math.floor(process.uptime()),
      timestamp:  new Date().toISOString(),
    });
  } catch (err) {
    const latencyMs = Date.now() - start;

    // Log but don't expose error details to the caller
    _req.log?.error({ err }, "Health check DB query failed");

    res.status(503).json({
      status:    "degraded",
      db:        "unreachable",
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/livez
 *
 * Liveness probe — only checks that the process is alive.
 * Does NOT check the database. Used by load balancers that want a
 * fast in-process check separate from the full readiness check.
 */
router.get("/livez", (_req: Request, res: Response) => {
  res.status(200).json({
    status:    "ok",
    uptime:    Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;
