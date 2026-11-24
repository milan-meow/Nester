import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Allow GitHub Codespaces addresses (e.g. xyz-5173.app.github.dev)
    allowedHosts: ['.app.github.dev'],
    // In dev, /api goes to the gateway so the browser sees one origin (no CORS fuss).
    proxy: { '/api': process.env.VITE_GATEWAY_URL || 'http://localhost:8080' },
  },
});