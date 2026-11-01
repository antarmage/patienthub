import type { Express } from "express";
import rateLimit from "express-rate-limit";

type RecoveryUser = { id: string; username: string; role: string | null };

export function registerRecoveryPasscodeLogin(app: Express, dependencies: {
  usersForPasscode(passcode: string): Promise<RecoveryUser[]>;
  issueToken(userId: string): string;
}) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false,
    message: { error: "Too many sign-in attempts. Please try again in 15 minutes." },
  });
  app.post("/api/postop/auth/passcode", limiter, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const passcode = req.body?.passcode;
    if (typeof passcode !== "string" || !passcode.trim() || passcode.length > 200) return res.status(400).json({ error: "Enter your staff passcode" });
    const matches = await dependencies.usersForPasscode(passcode);
    if (matches.length !== 1) return res.status(401).json({ error: "Passcode could not identify a staff account. Check the passcode or ask your administrator to assign a unique one." });
    const user = matches[0];
    if (!user.role || !["staff", "receptionist", "admin", "clinician", "owner"].includes(user.role)) return res.status(403).json({ error: "Staff access required" });
    res.json({ staffToken: dependencies.issueToken(user.id), user });
  });
}
