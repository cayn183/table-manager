import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rawPreviewHostEnv = process.env.VITE_PREVIEW_ALLOWED_HOSTS || ''
const allowedHostsEnv = rawPreviewHostEnv
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean)

const previewAllowedHosts = [...allowedHostsEnv, 'localhost', '127.0.0.1']

// Debug log: shows what Vite will allow at startup for preview requests.
console.log('[vite] preview.allowedHosts =', previewAllowedHosts)
console.log('[vite] raw VITE_PREVIEW_ALLOWED_HOSTS =', rawPreviewHostEnv)
console.log('[vite] NODE_ENV =', process.env.NODE_ENV || 'undefined', 'mode =', process.env.MODE || 'undefined')

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: previewAllowedHosts,
  },
  define: {
    'import.meta.env.VITE_BUILD_SHA': JSON.stringify(process.env.VITE_BUILD_SHA || 'unknown'),
    'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(process.env.VITE_BUILD_VERSION || 'unknown'),
  },
})
