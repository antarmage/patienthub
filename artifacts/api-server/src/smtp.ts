import nodemailer, { type Transporter } from "nodemailer";

export type OtpDeliveryMethod = "email" | "development";

let transporter: Transporter | undefined;

function smtpConfig() {
  const host = process.env["SMTP_HOST"]?.trim();
  const portValue = process.env["SMTP_PORT"]?.trim();
  const port = portValue ? Number(portValue) : 587;
  const user = process.env["SMTP_USER"]?.trim();
  const pass = process.env["SMTP_PASS"];
  const from = process.env["SMTP_FROM"]?.trim() || user;
  const secureValue = process.env["SMTP_SECURE"]?.trim().toLowerCase();
  const secure = secureValue ? secureValue === "true" : port === 465;

  if (!host || host === "REPLACE_ME" || !from || from === "REPLACE_ME" || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  if (user === "REPLACE_ME" || pass === "REPLACE_ME") return null;
  if ((user && !pass) || (!user && pass)) return null;

  return { host, port, secure, user, pass, from };
}

export function isSmtpConfigured(): boolean {
  return smtpConfig() !== null;
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const config = smtpConfig();
  if (!config) throw new Error("SMTP is not fully configured");

  transporter ??= nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.user && config.pass ? { auth: { user: config.user, pass: config.pass } } : {}),
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject: "Your Saivie verification code",
    text: `Your Saivie verification code is ${code}. It is valid for 5 minutes. If you did not request this code, you can ignore this email.`,
    html: `<p>Your Saivie verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>This code is valid for 5 minutes. If you did not request it, you can ignore this email.</p>`,
  });
}

export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@", 2);
  if (!local || !domain) return "your registered email";
  return `${local[0]}***@${domain}`;
}
