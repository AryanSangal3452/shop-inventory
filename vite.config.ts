import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/shop-inventory/', // <-- Add this line! Replace 'shop-inventory' with your exact GitHub repo name if it's different.
  server: {
    allowedHosts: true
  }
})