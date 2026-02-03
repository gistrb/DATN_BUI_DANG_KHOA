import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '^/check-pose': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '^/check-duplicate': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '^/register-face': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '^/delete-face': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '^/process-attendance': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    }
  },
})
