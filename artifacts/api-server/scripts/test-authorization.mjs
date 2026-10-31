import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = fileURLToPath(new URL("../", import.meta.url));
const outfile = path.join(path.relative(process.cwd(), serverDir), `.authorization-tests-${process.pid}.mjs`);
try {
  await build({
    entryPoints: [path.join(serverDir, "src/clinical-access.test.ts")],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    logLevel: "error",
  });
  const result = spawnSync(process.execPath, ["--test", outfile], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await unlink(outfile).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}
