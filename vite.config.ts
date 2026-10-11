import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Automatically ensure public/data exists when running dev server or build
if (!fs.existsSync('public/data/search-index.json')) {
  console.log('⚡ public/data missing - generating Static API on the fly...');
  execSync('node scripts/split-data.js', { stdio: 'inherit' });
}

export default defineConfig({
  // Relative base path ensures deployment works seamlessly on GitHub Pages
  // whether hosted at the root or under a repository subpath (/Behatsdaa-site-ai-mesh/)
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom/') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('@googlemaps')) {
              return 'vendor-maps';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('minisearch')) {
              return 'vendor-search';
            }
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  }
});
