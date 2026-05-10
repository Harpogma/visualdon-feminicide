import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: "/visualdon-feminicide/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        timeline: resolve(__dirname, "timeline.html"),
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});