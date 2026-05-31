import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["dist/server.js"],
  bundle: true,
  platform: "node",
  target: "node22",
  outfile: "dist/server.bundle.cjs",
  format: "cjs",
  external: ["bcryptjs", "pino", "pino-http", "pino-pretty", "thread-stream"],
  banner: {
    js: `const __importMetaUrl = require('url').pathToFileURL(__filename).href;`,
  },
  define: {
    "import.meta.url": "__importMetaUrl",
    "import_meta.url": "__importMetaUrl",
  },
});

console.log("Bundle complete.");
