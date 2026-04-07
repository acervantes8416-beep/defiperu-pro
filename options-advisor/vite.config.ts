import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    proxy: {
      // Proxy Gate.io API to avoid CORS issues in browser
      "/gateapi": {
        target: "https://api.gateio.ws",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gateapi/, "/api/v4"),
      },
    },
  },
});
