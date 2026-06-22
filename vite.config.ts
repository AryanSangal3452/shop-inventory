import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/shop-inventory/', // <-- Make sure this line is exactly here!
  server: {
    allowedHosts: true
  }
})