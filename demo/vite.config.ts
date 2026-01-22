import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import eslint from "vite-plugin-eslint";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [react(), svgr(), eslint({ lintOnStart: true })],
  base: "/npm-skeleton/",
  resolve: {
    alias: {
      src: path.resolve(__dirname, "src"),
      "npm-skeleton": path.resolve(__dirname, "../lib/src"),
    },
  },
  build: {
    outDir: "build",
  },
  server: {
    port: 3000,
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, "src"),
        path.resolve(__dirname, "../lib/src"),
      ],
    },
    watch: {
      ignored: ["!**/node_modules/npm-skeleton/**", "!../lib/src/**"],
    },
  },
});
