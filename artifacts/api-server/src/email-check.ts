import { promises as dns } from "node:dns";

const COMMON_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmal.com": "gmail.com", "gmali.com": "gmail.com", "gamil.com": "gmail.com",
  "gnail.com": "gmail.com", "gmaill.com": "gmail.com", "gmail.co": "gmail.com", "gmail.cm": "gmail.com",
  "gmail.con": "gmail.com", "gmail.in": "gmail.com", "gmail.om": "gmail.com", "gmai.com": "gmail.com",
  "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yahoo.co": "yahoo.com", "yahoo.con": "yahoo.com",
  "hotmial.com": "hotmail.com", "hotmail.co": "hotmail.com", "hotmai.com": "hotmail.com",
  "outlok.com": "outlook.com", "outlook.co": "outlook.com", "rediffmail.co": "rediffmail.com",
};

type Resolver = { mx: (domain: string) => Promise<unknown[]>; a: (domain: string) => Promise<unknown[]> };

const systemResolver: Resolver = { mx: (d) => dns.resolveMx(d), a: (d) => dns.resolve4(d) };

export type EmailCheck = { ok: true } | { ok: false; error: string };

/** Catches addresses that would bounce: obvious provider typos and domains with no mail server. */
export async function checkDeliverableEmail(email: string, resolver: Resolver = systemResolver): Promise<EmailCheck> {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  const suggestion = COMMON_TYPOS[domain];
  if (suggestion) return { ok: false, error: `"${domain}" looks like a typo. Did you mean @${suggestion}?` };

  const notFound = (err: unknown) => ["ENOTFOUND", "ENODATA", "ESERVFAIL", "ENONAME"].includes((err as { code?: string })?.code ?? "");
  try {
    if ((await resolver.mx(domain)).length > 0) return { ok: true };
  } catch (err) {
    if (!notFound(err)) return { ok: true };
  }
  // RFC 5321 falls back to the A record when no MX exists.
  try {
    if ((await resolver.a(domain)).length > 0) return { ok: true };
  } catch (err) {
    if (!notFound(err)) return { ok: true };
  }
  return { ok: false, error: `The domain "${domain}" cannot receive email. Please check the address.` };
}
