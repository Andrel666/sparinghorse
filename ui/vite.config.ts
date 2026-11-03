import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The new UI runs on its own port and forwards every API call to the Sparing Horse server, so the
// login cookie (set by the server on the same host name) rides along and no CORS is needed.
const API = process.env.SH_API || "http://127.0.0.1:8770";
// The API, plus the icons the server already draws (one set of assets for Classic and the new UI).
const FORWARD = ["/api", "/healthz", "/login", "/logout", "/favicon.svg", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];
// changeOrigin stays off: the server's CSRF guard compares the browser's Origin with the Host, and
// rewriting Host to the API's address made every POST from this app look cross-site.
const proxy = Object.fromEntries(FORWARD.map(p => [p, { target: API, changeOrigin: false }]));

export default defineConfig({
  plugins: [react()],
  server: { port: 5180, strictPort: true, proxy },
  preview: { port: 5180, strictPort: true, proxy },
});
