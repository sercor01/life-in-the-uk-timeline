import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves project sites from /<repo>/, so the deploy workflow sets
  // PAGES_BASE=/<repo>/ while dev and preview keep serving from the root.
  base: process.env.PAGES_BASE ?? "/",
});
