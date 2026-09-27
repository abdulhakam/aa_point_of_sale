import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const entry = process.env.GUEST_ENTRY ?? "./src/index.ts";
const outDir = process.env.GUEST_OUT ?? "./dist";

export default defineConfig({
  build: {
    outDir,
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: fileURLToPath(new URL(entry, import.meta.url)),
      name: "runtime",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      preserveEntrySignatures: "strict",
      external: /(wasi|trailbase):.*/,
    },
  },
});
