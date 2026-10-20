/// <reference types="vitest/config" />
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// One id per build; dist/version.json lets open tabs notice a newer deploy (src/app/version.ts).
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || Date.now().toString(36);
const buildVersion = (): Plugin => ({
  name: 'vt-build-version',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), buildVersion()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: { port: 5173, host: true },
  preview: { port: 4173 },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          query: ['@tanstack/react-query', 'zustand'],
          motion: ['motion'],
          charts: ['recharts'],
          maps: ['leaflet', 'react-leaflet'],
          forms: ['react-hook-form', 'zod', '@hookform/resolvers'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    testTimeout: 15_000,
    env: { VITE_MOCK_MODE: 'all', VITE_API_URL: 'http://api.test/api' },
    coverage: {
      provider: 'v8',
      include: ['src/features/**', 'src/shared/**', 'src/app/**'],
      exclude: ['**/*.test.*', 'src/shared/ui/__design/**'],
      thresholds: { lines: 75, branches: 70, functions: 70, statements: 75 },
    },
  },
});
