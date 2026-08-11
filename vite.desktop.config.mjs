import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-desktop',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        desktop: resolve(process.cwd(), 'desktop.html'),
      },
    },
  },
})
