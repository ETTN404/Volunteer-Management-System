/// <reference types="vitest/config" />
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
