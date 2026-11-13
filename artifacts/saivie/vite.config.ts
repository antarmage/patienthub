import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const faceModelDirectory = path.join(path.dirname(require.resolve("@vladmandic/face-api/package.json")), "model");
const faceModelFiles = [
  "tiny_face_detector_model.bin", "tiny_face_detector_model-weights_manifest.json",
  "face_landmark_68_model.bin", "face_landmark_68_model-weights_manifest.json",
  "face_recognition_model.bin", "face_recognition_model-weights_manifest.json",
];

const port = Number(process.env.PORT ?? 5173);
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "self-hosted-attendance-face-models",
      configureServer(server) {
        server.middlewares.use(`${server.config.base}face-models`, (req, res, next) => {
          const name = req.url?.split("?")[0].replace(/^\//, "") || "";
          if (!faceModelFiles.includes(name)) { next(); return; }
          res.setHeader("Content-Type", name.endsWith(".json") ? "application/json" : "application/octet-stream");
          fs.createReadStream(path.join(faceModelDirectory, name)).on("error", next).pipe(res);
        });
      },
      generateBundle() {
        for (const name of faceModelFiles) {
          this.emitFile({ type: "asset", fileName: `face-models/${name}`, source: fs.readFileSync(path.join(faceModelDirectory, name)) });
        }
        this.emitFile({ type: "asset", fileName: "face-models/LICENSE", source: fs.readFileSync(path.join(faceModelDirectory, "../LICENSE")) });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: false,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
