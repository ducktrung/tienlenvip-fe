import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(), 
  ],
  server: {
    host: '0.0.0.0',
    allowedHosts: true, // <--- THÊM ĐÚNG DÒNG NÀY ĐỂ MỞ CỬA CHO CLOUDFLARE
    proxy: {
      '/api': {
        target: 'http://192.168.1.150:5002',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://192.168.1.150:5002',
        ws: true,
      }
    }
  }
})