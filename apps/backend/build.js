import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["dist/server.js"],
  bundle: true,
  platform: "node",
  target: "node22",
  outfile: "dist/server.bundle.js",
  format: "esm",
  external: ["bcryptjs", "pino", "pino-http", "pino-pretty", "thread-stream"],
  banner: {
    js: `
      import { createRequire } from 'module';
      import { fileURLToPath } from 'url';
      import { dirname } from 'path';
      const require = createRequire(import.meta.url);
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
    `,
  },
});

console.log("Bundle complete.");
