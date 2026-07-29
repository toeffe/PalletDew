// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',          // ← change from '/PalletDew/'
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});