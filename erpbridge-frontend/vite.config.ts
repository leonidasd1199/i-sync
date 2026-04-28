import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,

    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'trycloudflare.com',
      'indie-classifieds-outlets-fwd.trycloudflare.com',
    ],

    proxy: {
      '/api': {
        target: 'https://api.isync.site',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
