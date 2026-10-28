import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const output = path.join(
  root,
  "artifacts/api-server/node_modules/.cache/local-reports-cli.mjs",
);
await build({
  entryPoints: [
    path.join(root, "artifacts/api-server/src/local-reports-client.ts"),
  ],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  outfile: output,
});
const { main } = await import(output);
try {
  await main(
    process.argv.slice(2),
    path.join(root, "tools/local-reports/read-document.swift"),
  );
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Local import failed. Working files were retained.",
  );
  process.exitCode = 1;
}
