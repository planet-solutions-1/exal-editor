import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for Railway deployment
export default defineConfig({
  plugins: [react()],
  
  // Use relative paths to prevent 404 on chunks
  base: '/',
  
  build: {
    outDir: 'dist',
    // Generate manifest for better caching
    manifest: true,
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'xlsx-vendor': ['xlsx'],
          'animation-vendor': ['framer-motion']
        }
      }
    }
  },
  
  // Proxy API calls during development
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
