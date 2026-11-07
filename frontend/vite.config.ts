import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Pisah vendor chunk agar build lebih cepat
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          maplibre: ['maplibre-gl'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  // Optimasi dependency untuk MapLibre
  optimizeDeps: {
    include: ['maplibre-gl'],
  },
});
