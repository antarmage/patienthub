import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = fileURLToPath(new URL("../", import.meta.url));
const outdir = path.join(path.relative(process.cwd(), serverDir), `.authorization-tests-${process.pid}`);
const tests = ["booking-catalog.test.ts", "menopause.test.ts", "clinical-access.test.ts", "prescription-transcriptions.test.ts", "paper-prescription-work.test.ts", "reception-access.test.ts", "reception-details-edit.test.ts", "online-consultations.test.ts", "reception-follow-up.test.ts", "onboarding-links.test.ts", "recovery-auth.test.ts", "hpv-protection.test.ts", "surgery-workflow.test.ts", "staff-attendance.test.ts", "face-attendance.test.ts", "staff-profile.test.ts"];
try {
  await build({
    entryPoints: tests.map((file) => path.join(serverDir, "src", file)),
    outdir,
    outExtension: { ".js": ".mjs" },
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    logLevel: "error",
  });
  const files = tests.map((file) => path.join(outdir, file.replace(/\.ts$/, ".mjs")));
  const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm(outdir, { recursive: true, force: true });
}
