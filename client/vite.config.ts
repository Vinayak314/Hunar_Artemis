import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// During development the API runs separately; proxying /api keeps the session
// cookie same-origin, exactly like production where the server hosts the build.
const apiTarget = process.env.HUNAR_API_URL ?? 'http://localhost:4000';
const proxy = { '/api': { target: apiTarget, changeOrigin: false } };

// `npm run dev:phone` sets HUNAR_LAN=1 so a phone on the same Wi-Fi (or a tunnel) can open the dev
// server. Plain `npm run dev` stays on localhost only. strictPort keeps the phone URL on :3000
// instead of silently drifting to :3001 when 3000 is busy.
const lan = process.env.HUNAR_LAN === '1';
const lanServer = lan ? { host: true, allowedHosts: true as const, strictPort: true } : {};

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: { port: 3000, proxy, ...lanServer },
  preview: { port: 3000, proxy },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
});
