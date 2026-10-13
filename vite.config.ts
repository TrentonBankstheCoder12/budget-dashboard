/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" makes every asset URL relative, so the same build works at
// https://<user>.github.io/<repo>/ and when opened from any sub-path.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // Recharts is most of the bundle (~190 kB gzipped total); fine for a single-page dashboard.
  build: { chunkSizeWarningLimit: 800 },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
