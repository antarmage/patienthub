// Verifies the native brand palette mirrors lib/brand/tokens.css exactly, that
// key foreground/background pairs meet WCAG AA, that gold stays decorative,
// and that clinical status colours keep their meaning. Static check only:
// it cannot see runtime-composed colours, text/background pairs split across
// separate style objects or parent/child views, or rendered screens.
// Rules: plum text on blush; plum (not rose) text on sage; teal on sage is OK.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");
const failures = [];
const fail = (msg) => failures.push(msg);

function loadTs(rel, extra = {}) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const mod = { exports: {} };
  const req = (id) => {
    if (id === "react-native") return { Platform: { select: (o) => o.default } };
    if (id in extra) return extra[id];
    throw new Error(`Unexpected import ${id} in ${rel}`);
  };
  new Function("exports", "require", "module", outputText)(mod.exports, req, mod);
  return mod.exports;
}

const theme = loadTs("constants/theme.ts");
const colorsMod = loadTs("constants/colors.ts", { "@/constants/theme": theme }).default;
const { BRAND, COLORS, Colors } = theme;

// 1. Exact palette parity with web canonical tokens.
const cssPath = path.resolve(root, "../../lib/brand/tokens.css");
const css = fs.readFileSync(cssPath, "utf8");
const raw = Object.fromEntries([...css.matchAll(/--saivie-([a-z-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const resolve = (v) => {
  const ref = v.match(/^var\(--saivie-([a-z-]+)\)$/);
  return ref ? resolve(raw[ref[1]]) : v;
};
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const web = Object.fromEntries(Object.keys(raw).map((k) => [camel(k), resolve(raw[k]).toUpperCase()]));
for (const [k, v] of Object.entries(web)) {
  if (!(k in BRAND)) fail(`BRAND missing web token ${k}`);
  else if (BRAND[k].toUpperCase() !== v) fail(`BRAND.${k}=${BRAND[k]} but tokens.css has ${v}`);
}
for (const k of Object.keys(BRAND)) if (!(k in web)) fail(`BRAND.${k} not defined in tokens.css`);

// 2. Contrast (alpha colours composited over their background).
const parse = (c) => {
  const h = c.match(/^#([0-9a-f]{6})$/i);
  if (h) return [0, 2, 4].map((i) => parseInt(h[1].slice(i, i + 2), 16)).concat(1);
  const r = c.match(/^rgba?\(([^)]+)\)$/i);
  if (r) { const p = r[1].split(",").map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; }
  throw new Error(`Unparseable colour ${c}`);
};
const over = (fg, bg) => {
  const f = parse(fg), b = parse(bg);
  return [0, 1, 2].map((i) => f[i] * f[3] + b[i] * (1 - f[3]));
};
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (fg, bg, base) => {
  const b = base ? over(bg, base) : over(bg, "#FFFFFF");
  const f = over(fg, `rgb(${b.join(",")})`);
  const [x, y] = [lum(f), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const rows = [];
const check = (label, fg, bg, min = 4.5, base) => {
  const r = ratio(fg, bg, base);
  rows.push(`${r >= min ? "ok  " : "FAIL"} ${r.toFixed(2).padStart(5)} (min ${min}) ${label}`);
  if (r < min) fail(`Contrast ${label} = ${r.toFixed(2)} < ${min}`);
};

const L = Colors.light, D = Colors.dark;
for (const [n, bg] of Object.entries({ page: BRAND.page, card: COLORS.card, surfaceMuted: BRAND.surfaceMuted, surfaceBlush: BRAND.surfaceBlush, sage: BRAND.sage })) {
  check(`light text on ${n}`, L.text, bg);
  check(`light textSecondary on ${n}`, L.textSecondary, bg);
  check(`light textMuted on ${n}`, L.textMuted, bg);
  check(`light primary (teal) on ${n}`, L.primary, bg);
}
for (const n of ["page", "surfaceBlush"]) check(`light secondary (rose) on ${n}`, L.secondary, BRAND[n]);
check("light text on blush", BRAND.text, BRAND.blush);
check("primaryActionText on primaryAction", BRAND.primaryActionText, BRAND.primaryAction);
check("light buttonText on primary", L.buttonText, L.primary);
check("light secondaryForeground on secondary (colors.ts)", colorsMod.light.secondaryForeground, colorsMod.light.secondary);
check("light border vs page (non-text, decorative)", BRAND.border, BRAND.page, 1.1);
for (const n of ["backgroundRoot", "backgroundDefault", "backgroundSecondary", "backgroundTertiary"]) {
  check(`dark text on ${n}`, D.text, D[n]);
  check(`dark textSecondary on ${n}`, D.textSecondary, D[n]);
  check(`dark textMuted on ${n}`, D.textMuted, D[n]);
  check(`dark primary (sage) on ${n}`, D.primary, D[n]);
  check(`dark secondary (blush) on ${n}`, D.secondary, D[n]);
}
check("dark primary on primaryLight", D.primary, D.primaryLight, 4.5, D.backgroundDefault);
check("dark buttonText on primary", D.buttonText, D.primary);
check("dark tabIconDefault on backgroundRoot (icon)", D.tabIconDefault, D.backgroundRoot, 3);
for (const s of ["light", "dark"]) {
  const c = colorsMod[s];
  check(`${s} foreground on background (colors.ts)`, c.foreground, c.background);
  check(`${s} mutedForeground on muted (colors.ts)`, c.mutedForeground, c.muted, 4.5, c.background);
  check(`${s} primaryForeground on primary (colors.ts)`, c.primaryForeground, c.primary);
}
// Informational: gold must not be used for small text — it fails AA on ivory.
const goldRatio = ratio(BRAND.gold, BRAND.page);
rows.push(`info ${goldRatio.toFixed(2).padStart(5)} gold on ivory (decorative only; below 4.5 AA)`);

// Brand pairing rules (small text). Known-failing pairs are listed for
// reference and must never be used for text: plum on blush; plum, not rose, on sage.
for (const [label, fg, bg] of [
  ["rose on blush", BRAND.rose, BRAND.blush],
  ["teal on blush", BRAND.teal, BRAND.blush],
  ["rose on sage", BRAND.rose, BRAND.sage],
]) rows.push(`info ${ratio(fg, bg).toFixed(2).padStart(5)} ${label} (disallowed for text)`);
check("rule: plum text on blush", BRAND.plum, BRAND.blush);
check("rule: plum text on sage", BRAND.plum, BRAND.sage);
check("rule: teal text on sage", BRAND.teal, BRAND.sage);
check("rule: rose text on ivory", BRAND.rose, BRAND.ivory);
check("rule: rose text on surfaceBlush", BRAND.rose, BRAND.surfaceBlush);
check("rule: rose text on surfaceMuted", BRAND.rose, BRAND.surfaceMuted);

// Migrated screen combos whose text and background live in separate styles
// (the per-object scan below cannot pair these automatically).
check("migrated: postpartum badge/notice/month badge (rose on surfaceBlush)", COLORS.rose, COLORS.surfaceBlush);
check("migrated: postpartum month badge current (white on rose)", COLORS.white, COLORS.rose);
check("migrated: home check-in CTA (white on rose)", COLORS.white, COLORS.rose);
check("migrated: profile time chip / journal chip / appointment tag (teal on sage)", COLORS.primary, COLORS.primaryLight);
check("migrated: timeline Mild symptom card (plum on blush)", COLORS.textPrimary, COLORS.blush);
check("migrated: care provider initials (rose on surfaceBlush)", COLORS.rose, COLORS.surfaceBlush);
check("migrated: care provider initials (teal on surfaceMuted)", COLORS.primary, COLORS.surfaceMuted);

// 3. Clinical semantics stay unchanged and distinct from the brand palette.
const clinical = {
  "COLORS.success": [COLORS.success, "#22C55E"], "COLORS.warning": [COLORS.warning, "#F59E0B"], "COLORS.error": [COLORS.error, "#DC2626"],
  "light.success": [L.success, "#22C55E"], "light.warning": [L.warning, "#F59E0B"], "light.danger": [L.danger, "#DC2626"],
  "dark.success": [D.success, "#22C55E"], "dark.warning": [D.warning, "#FBBF24"], "dark.danger": [D.danger, "#EF4444"],
  "colors.light.destructive": [colorsMod.light.destructive, "#DC2626"], "colors.dark.destructive": [colorsMod.dark.destructive, "#EF4444"],
};
const brandHex = new Set(Object.values(BRAND).map((v) => v.toUpperCase()));
for (const [k, [actual, expected]] of Object.entries(clinical)) {
  if (actual.toUpperCase() !== expected) fail(`${k} changed to ${actual}; clinical colour should stay ${expected}`);
  if (brandHex.has(actual.toUpperCase())) fail(`${k} reuses a brand colour`);
}

// 4. Source scan: gold never used as a text/icon colour; no literal brand or legacy brand hexes.
const legacy = ["#6C63FF", "#A78BFA", "#A855F7", "#8B5CF6", "#F4A7C1", "#DB2777", "#EC4899", "#FAFAFC"];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []);
for (const file of ["app", "components"].flatMap((d) => walk(path.join(root, d)))) {
  const rel = path.relative(root, file);
  fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    if (/\bcolor\s*[:=]\s*\{?\s*[^,}\n]*\b(?:COLORS|BRAND|theme)\.gold\b/.test(line) || /(?:color|tintColor)\s*[:=][^,}\n]*#B38B56/i.test(line))
      fail(`${at} uses gold as a foreground colour (decorative only)`);
    for (const hex of [...brandHex].filter((h) => h !== "#FFFFFF")) if (line.toUpperCase().includes(`"${hex}"`)) fail(`${at} hardcodes brand ${hex}; use BRAND/COLORS`);
    for (const hex of legacy) if (line.toUpperCase().includes(hex)) fail(`${at} uses legacy brand colour ${hex}`);
  });
}


// 5. Per-style-object scan: any object literal that sets both backgroundColor
// and a text `color` from brand tokens must meet AA (light-scheme values).
const tokenValue = (expr) => {
  const m = expr.trim().match(/^(?:(COLORS|BRAND|theme)\.(\w+)|"(#[0-9A-Fa-f]{6})")$/);
  if (!m) return null;
  if (m[3]) return m[3];
  const v = (m[1] === "COLORS" ? COLORS : m[1] === "BRAND" ? BRAND : L)[m[2]];
  return typeof v === "string" ? v : null;
};
let pairsScanned = 0;
for (const file of ["app", "components"].flatMap((d) => walk(path.join(root, d)))) {
  const rel = path.relative(root, file);
  for (const obj of fs.readFileSync(file, "utf8").matchAll(/\{[^{}]*\}/g)) {
    const bg = obj[0].match(/\bbackgroundColor\s*:\s*([^,}\n]+)/);
    const fg = obj[0].match(/(?<![A-Za-z])color\s*:\s*([^,}\n]+)/);
    const [b, f] = [bg && tokenValue(bg[1]), fg && tokenValue(fg[1])];
    if (!b || !f) continue;
    pairsScanned++;
    check(`${rel} style {${fg[1].trim()} on ${bg[1].trim()}}`, f, b);
  }
}
rows.push(`info ${String(pairsScanned).padStart(5)} same-object text/background pairs scanned`);
console.log(rows.join("\n"));
if (failures.length) {
  console.error(`\n${failures.length} brand check failure(s):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`\nBrand check passed: ${Object.keys(web).length} tokens match ${path.relative(root, cssPath)}.`);
