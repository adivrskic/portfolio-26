import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          // Three.js core — used by the raw-three Scene (cube + smiley)
          "vendor-three": ["three"],
          // Animation library — used by menu, chat, text overlays, showcase
          "vendor-gsap": ["gsap"],
        },
      },
    },
  },
  esbuild: {
    drop: ["debugger"],
    pure: ["console.log"], // strip console.log in prod, keep warn/error
  },
});
