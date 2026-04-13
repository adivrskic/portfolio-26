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
          // Three.js core — largest dep, changes rarely, caches well
          "vendor-three": ["three"],
          // R3F ecosystem — only used by ShowcaseCanvas (lazy-loaded)
          "vendor-r3f": ["@react-three/fiber", "@react-three/drei"],
          // Showcase-only R3F extras — physics, postprocessing, flex
          "vendor-r3f-extras": [
            "@react-three/postprocessing",
            "postprocessing",
            "@react-three/rapier",
            "@react-three/flex",
            "maath",
          ],
          // Animation library — used by menu, chat, text overlays
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
