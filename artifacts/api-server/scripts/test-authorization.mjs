import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = fileURLToPath(new URL("../", import.meta.url));
const outdir = path.join(path.relative(process.cwd(), serverDir), `.authorization-tests-${process.pid}`);
const tests = ["clinical-access.test.ts", "prescription-transcriptions.test.ts"];
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
