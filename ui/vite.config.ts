import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The new UI runs on its own port and forwards every API call to the Sparing Horse server, so the
// login cookie (set by the server on the same host name) rides along and no CORS is needed.
const API = process.env.SH_API || "http://127.0.0.1:8770";
const proxy = { "/api": { target: API, changeOrigin: true }, "/healthz": { target: API, changeOrigin: true } };

export default defineConfig({
  plugins: [react()],
  server: { port: 5180, strictPort: true, proxy },
  preview: { port: 5180, strictPort: true, proxy },
});
