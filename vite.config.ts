import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const allowedHostsEnv = (process.env.VITE_PREVIEW_ALLOWED_HOSTS || '')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean)

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: [...allowedHostsEnv, 'localhost', '127.0.0.1'],
  },
  define: {
    'import.meta.env.VITE_BUILD_SHA': JSON.stringify(process.env.VITE_BUILD_SHA || 'unknown'),
    'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(process.env.VITE_BUILD_VERSION || 'unknown'),
  },
})
