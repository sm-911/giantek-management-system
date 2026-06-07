import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy all /api requests to the backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    },
    // Ignore locked/transient files dropped into public by the system
    watch: {
      ignored: [
        '**/public/image.png',
        '**/public/*.tmp',
      ]
    }
  }
});
