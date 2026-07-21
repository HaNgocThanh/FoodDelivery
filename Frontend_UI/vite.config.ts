import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind CSS v4 dùng Vite plugin thay vì postcss
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Import alias: @/components/...
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls đến Backend trong development (tránh CORS)
      '/api': {
        target: 'http://localhost:5156',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Tắt sourcemap cho production
    rollupOptions: {
      output: {
        // Code splitting tối ưu bundle size
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor';
            if (id.includes('@tanstack')) return 'query';
            if (id.includes('lucide-react')) return 'ui';
          }
        },
      },
    },
  },
})
